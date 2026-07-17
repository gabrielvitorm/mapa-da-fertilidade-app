# Checkout real da Kiwify + magic link real — Design

> Spec de referência pro plano de implementação. Fecha o loop de compra→acesso
> com segurança real, substituindo os dois pontos fracos atuais: login sem
> verificação nenhuma e checkout apontando pra produtos placeholder.

## Contexto

O funil de 10 telas já está todo portado e o handler de webhook (`docs/03-funil-e-webhooks.md`)
já implementa o contrato completo (assinatura, idempotência, resolução de
produto, concessão/revogação de entitlement). Duas lacunas ficaram pra trás:

1. **`prisma/seed.ts`** tem `checkoutUrl`/`platformProductId` como
   `PLACEHOLDER-*` para os dois produtos (`acesso-relatorio`,
   `desafio-7-dias`), e o `upsert` usa `update: {}` — ou seja, mesmo depois de
   trocar os valores no código-fonte, rodar `db:seed` de novo num banco já
   populado **não atualiza** os dois campos (bug silencioso de no-op).
2. **`/api/auth/login`** loga a usuária só com o e-mail, sem nenhuma
   verificação — não existe token, não existe e-mail enviado. Isso é
   aceitável pra demo interna, mas vira uma falha de segurança real assim que
   estranhos pagarem de verdade: qualquer pessoa que souber (ou adivinhar) o
   e-mail de uma cliente entra na conta dela. `src/lib/payment-handler.ts`
   já tem o ponto de disparo esperado, hoje um stub:
   `console.log('[magic-link] enviaria link de acesso... (no-op em modo demo)')`.

## Modelo de dados

Novo model `MagicLinkToken`, espelhando o `Session` já existente
(`src/lib/auth.ts`) — mesmo padrão: token bruto só existe na URL do e-mail,
só o hash HMAC fica no banco.

```prisma
model MagicLinkToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

`tokenHash` = `HMAC-SHA256(token, SESSION_SECRET)` — reaproveita o secret que
já protege as sessões (mesma família de propósito: comprovar posse de um
token de acesso). Sem secret novo.

## Fluxos

### A. Login self-service (usuária já com conta, sem sessão ativa)

1. `POST /api/auth/login` com `{ email }`.
2. Se a usuária não existe: `404` (comportamento atual, mantido).
3. Se existe: gera `MagicLinkToken` (24h de validade), chama `sendMagicLink`,
   responde `200 { ok: true }` — **não cria sessão nem loga direto**.
4. Tela de login passa a mostrar um estado "confira seu e-mail" depois do
   submit bem-sucedido, em vez de redirecionar pro dashboard.

### B. Primeiro acesso após compra (disparado pelo webhook)

Em `handlePayment` (`src/lib/payment-handler.ts`), quando `status === 'PAID'`
e o entitlement é concedido: chama `sendMagicLink(user.id)` no lugar do
`console.log` atual. Dispara em toda concessão (não só na primeira compra —
comprar um segundo produto também gera um novo link de acesso; simples e
inofensivo, evita ter que rastrear "é a primeira mesmo?").

### C. Verificação do link

`GET /api/auth/verify?token=<token>`:
1. Hash do token recebido, busca por `tokenHash`.
2. Inválido, `usedAt` preenchido, ou `expiresAt` no passado →
   redireciona pra `/login?error=invalid_token`.
3. Válido → marca `usedAt = now()`, `createSession(userId)`, redireciona pra
   `/dashboard`.

`/login` passa a ler `?error=invalid_token` da query string e mostrar uma
mensagem ("Esse link expirou ou já foi usado. Peça um novo.").

## `sendMagicLink` e o contrato com o n8n

Novo arquivo `src/lib/magic-link.ts`, função única usada pelos dois gatilhos
(A e B):

```ts
export async function sendMagicLink(userId: string): Promise<void>
```

Internamente: gera o token, grava o `MagicLinkToken`, monta
`${APP_BASE_URL}/api/auth/verify?token=${token}`, faz `POST` pro
`N8N_MAGIC_LINK_WEBHOOK_URL` com:

```json
{ "email": "...", "nome": "...", "magicLinkUrl": "..." }
```

O n8n é responsável por montar e enviar o e-mail de verdade (fora do escopo
deste app — workflow configurado separadamente). A chamada usa timeout curto
(5s) e **nunca lança** — falha de rede/n8n só loga erro. Isso é obrigatório
pro gatilho B: o webhook de pagamento (`docs/03-funil-e-webhooks.md`, regra
9) precisa responder rápido e não pode falhar por causa do envio de e-mail.

`APP_BASE_URL` já existe em `.env.example` (`http://localhost:3000`) e ainda
não é usado em nenhum lugar do código — passa a ser lido aqui.

## Checkout Kiwify

- `prisma/seed.ts`: trocar `update: {}` por
  `update: { checkoutUrl, platformProductId }` nos dois `db.product.upsert`
  (`acesso-relatorio`, `desafio-7-dias`), pra reseed em produção realmente
  atualizar os valores.
- Trocar os dois `PLACEHOLDER-*` (checkout URL + product_id) pelos valores
  reais dos produtos já existentes na Kiwify (fornecidos na hora de escrever
  o plano de implementação — não são segredo, mas não estão disponíveis
  ainda ao escrever este spec).

## Env vars novas

| Var | Onde | Observação |
| --- | --- | --- |
| `N8N_MAGIC_LINK_WEBHOOK_URL` | `.env` / EasyPanel | Novo. URL do webhook n8n (workflow ainda a ser montado). |
| `APP_BASE_URL` | `.env` / EasyPanel | Já existe em `.env.example`; passa a ser efetivamente usado. |

## Fora de escopo (decisão consciente)

- **Rate limiting** em `/api/auth/login` — nada impede spam de tentativas de
  login pra um e-mail que não é seu (gera token + tenta disparar e-mail
  repetidamente). Aceitável no estágio atual do produto; registrar como
  pendência se o volume de usuárias crescer.
- **Limpeza periódica de `MagicLinkToken` expirados** — sem job de limpeza;
  a tabela cresce indefinidamente. Volume esperado é baixo o suficiente pra
  não importar agora.
- **Reenvio manual de link** — não existe botão "reenviar". Repetir o login
  em `/login` já gera um token novo (o token antigo simplesmente nunca é
  usado e expira sozinho).

## Fora do código (ação manual do usuário, fora deste app)

- Configurar `KIWIFY_WEBHOOK_SECRET` real no ambiente de produção (já
  referenciado em `src/lib/kiwify-webhook.ts`, só falta o valor real).
- Apontar o webhook da Kiwify (no painel deles) pra
  `https://app.carolinapalitot.com/api/webhooks/kiwify`.
- Montar o workflow n8n que recebe `{ email, nome, magicLinkUrl }` e envia o
  e-mail de verdade.

## Teste

Sem runner de testes configurado (convenção do projeto). Verificação via:
- Script `tsx` temporário validando geração/hash/expiração/uso único do
  `MagicLinkToken` contra o banco local (mesmo padrão usado nas fases
  anteriores).
- `npx tsc --noEmit` depois de qualquer mudança de schema.
- Verificação ao vivo (controller, com `npm run dev`): login self-service
  ponta a ponta lendo o token direto do banco via script `tsx` (já que o
  envio real de e-mail depende do n8n, que ainda não existe) — detalhado no
  plano de implementação.
