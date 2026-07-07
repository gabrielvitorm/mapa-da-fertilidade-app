# 03 — Funil, checkout e webhooks

## As duas portas de captação (mesmo destino)

### Porta A — Typebot (mantido)
1. Usuária faz o quiz no Typebot (fluxo atual).
2. No fim, o Typebot faz um **HTTP request** para o app:
   `POST /api/ingest/typebot` com `{ nome, email, cpf, celular, answers }`.
3. O app cria um `Assessment` (`source = TYPEBOT`, `userId = null`) e recalcula
   o score.
4. O Typebot encaminha para o checkout (R$ 49,90).
5. Relatório só libera **após o pagamento** (webhook), no app.

> Proteja `/api/ingest/typebot` com um segredo compartilhado (header
> `X-Ingest-Token`) — o Typebot envia, o app valida.

### Porta B — Quiz nativo (sessão anônima)
1. Usuária faz o quiz no app **sem conta**. Um `Assessment` anônimo é criado
   (`source = APP_NATIVE`, `userId = null`), com `leadEmail`/`leadCpf` captados
   no meio do fluxo (igual o Typebot já faz).
2. App mostra o **teaser** (nível + 1–2 pontos de atenção) + oferta R$ 49,90.
3. Checkout na plataforma → webhook → adoção do assessment + relatório liberado.

Ambas terminam no mesmo lugar: um `Assessment` órfão esperando o webhook que o
adota.

## Checkout (Kiwify / Hotmart)

- Cada produto (`acesso-relatorio`, `desafio-7-dias`, cada bump) é um **produto
  na plataforma** com um `checkoutUrl`.
- **Order bump no checkout inicial:** configurado na própria plataforma
  (nativo). Sem código no app.
- **Compra dentro do app** (desafio, bumps posteriores): o app **não cobra**.
  Ele leva a usuária ao `checkoutUrl` daquele produto (redirect ou webview),
  pré-preenchendo e-mail quando possível. O acesso libera quando o **webhook**
  chega. UX: "toca em comprar → checkout da plataforma → volta liberado".
- Se um dia quiser one-tap real dentro do app, aí entra um gateway com API
  (Asaas/Pagar.me). **Fora de escopo nesta versão.**

## Contrato de webhook

Endpoints separados por plataforma:
- `POST /api/webhooks/kiwify`
- `POST /api/webhooks/hotmart`

Cada um normaliza o payload da plataforma para um evento interno:

```ts
type PaymentEvent = {
  platform: 'KIWIFY' | 'HOTMART';
  transactionId: string;         // idempotência
  status: 'PAID' | 'REFUNDED' | 'CHARGEBACK';
  platformProductId: string;     // resolve o Product no catálogo
  amountCents: number;
  buyer: { email: string; cpf?: string; nome?: string; celular?: string };
  raw: unknown;                  // payload original
};
```

### Regras obrigatórias do handler

1. **Verificar assinatura/segredo** da plataforma antes de qualquer coisa.
2. **Idempotência:** `Order.platformTransactionId` é único. Se já existe, retorne
   200 sem reprocessar.
3. **Resolver `Product`** pelo `platformProductId` do *seu* catálogo — nunca pelo
   preço/nome do payload.
4. **Casar/criar `User`** por e-mail (CPF como desempate).
5. **Adotar `Assessment`** órfão do mesmo e-mail (o mais recente).
6. **Conceder/revogar `Entitlement`** conforme o status:
   - `PAID` → `Entitlement` `ACTIVE` (tipo conforme `product.grants`).
   - `REFUNDED`/`CHARGEBACK` → `Order.status` atualizado + `Entitlement` `REVOKED`.
7. Para `kind = CHALLENGE`, ao conceder, **resolver a trilha pelo
   `nivelGlobal`** do assessment da usuária e gravar em `entitlement.metadata`.
8. Disparar o **magic link** por e-mail na primeira concessão (primeiro acesso).
9. Responder rápido (200) e fazer trabalho pesado de forma assíncrona se
   necessário; webhooks podem ser reentregues.

### Pseudo-fluxo

```ts
async function handlePayment(e: PaymentEvent) {
  if (await orderExists(e.transactionId)) return ok();      // idempotente
  const product = await resolveProduct(e.platformProductId);
  const user = await upsertUserByEmail(e.buyer);
  await adoptOrphanAssessment(user, e.buyer);
  const order = await createOrder({ user, product, event: e });
  if (e.status === 'PAID') {
    const ent = await grantEntitlement(user, product);
    if (product.kind === 'CHALLENGE') {
      const level = await latestAssessmentLevel(user);       // BAIXA/MODERADA/ALTA
      await setEntitlementTrack(ent, level);
    }
    await maybeSendMagicLink(user);
  } else {
    await revokeEntitlementsFor(order);
  }
  return ok();
}
```

## Gate de leitura (como o app decide o que mostrar)

O app nunca olha "comprou?" — olha **entitlement**:
```ts
const canReadReport    = await hasActiveEntitlement(userId, 'REPORT');
const canAccessChallenge = await hasActiveEntitlement(userId, 'CHALLENGE');
```
Order bump = só mais um `Entitlement` `BUMP` com seu `productId`.
