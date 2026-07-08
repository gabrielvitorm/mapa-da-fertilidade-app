# Fase 4 — Funil + Checkout Simulado + Webhooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O motor de pagamento real (`handlePayment`) funcionando de ponta a ponta — idempotente, concede/revoga `Entitlement`, adota `Assessment` órfão por e-mail — exercitado via um botão "Simular pagamento aprovado" que fecha o funil completo pro vídeo: quiz → checkout → simulação → dashboard já logada com o relatório liberado.

**Architecture:** `src/lib/payment-handler.ts` é a única função que grava `Order`/`Entitlement`/adota `Assessment` — tanto a rota de demo (`/api/checkout/simulate`) quanto os futuros webhooks reais do Kiwify/Hotmart chamam essa mesma função, nunca duplicam a lógica. `src/lib/entitlements.ts` fica com o helper de leitura (`hasActiveEntitlement`) que as próximas fases (relatório, desafio) vão reusar, no mesmo padrão do `requireSessionUser()` da Fase 3.

**Tech Stack:** Next.js 16 App Router (Route Handlers + Server/Client Components), Prisma 6.19.3.

## Escopo desta rodada (atualizado)

O exemplo real de payload do webhook do **Kiwify** chegou (`kiwify-webhook-exemplo.json`, o exemplo oficial de teste deles) — a Task 5 já implementa a rota real `POST /api/webhooks/kiwify` com base nele. O **Hotmart** continua fora do escopo: nenhum exemplo de payload chegou ainda; quando chegar, vira uma task curta separada seguindo o mesmo padrão da Task 5.

**Suposições assumidas na normalização do Kiwify (a validar contra um evento real de reembolso quando possível):**
- `order_status` mapeia `"paid"` → `PAID`. Os valores de reembolso/chargeback (`"refunded"`, `"chargedback"`) são um palpite razoável baseado em convenção comum — não confirmados contra a documentação oficial nem um evento real. `normalizeKiwifyPayload` lança erro explícito pra qualquer valor não mapeado, em vez de silenciosamente tratar errado.
- A assinatura vem no query param `?signature=...`, um hex de 40 caracteres — deduzido do próprio exemplo real que **HMAC-SHA1** (não SHA-256, que teria 64 caracteres) é o algoritmo usado.
- `Commissions.charge_amount` é usado como `amountCents` (o valor que a cliente pagou, antes das taxas — `my_commission` é o valor líquido do produtor, não o preço de venda).

## Global Constraints

- `handlePayment()` é a **única** função que cria `Order`, cria/revoga `Entitlement`, ou adota um `Assessment` órfão. `POST /api/checkout/simulate` e os futuros webhooks reais chamam essa função — nenhum deles duplica essa lógica.
- Idempotência: `Order.platformTransactionId` é `@unique` — processar o mesmo evento duas vezes não deve criar uma segunda `Order` nem duplicar `Entitlement`.
- `POST /api/checkout/simulate` só funciona com `DEMO_MODE=true` no `.env` (já deve estar lá, valor padrão do `.env.example` desde a Fase 1) — retorna 403 caso contrário.
- Magic link continua **no-op**: um `console.log`, nunca envio de e-mail real.
- Nunca confiar no preço/produto do payload — resolver `Product` sempre pelo `platformProductId` do catálogo já seedado (Fases 2/3: `acesso-relatorio`, `desafio-7-dias`).
- Commits: **nunca** incluir trailer `Co-Authored-By: Claude` ou qualquer menção de co-autoria de IA.
- Não modificar `CheckoutReportView.tsx` — o botão de simulação é um componente novo separado, composto ao lado dele na página, mesmo padrão do `LogoutButton.tsx` da Fase 3.

---

### Task 1: `src/lib/entitlements.ts` — helper de leitura de entitlement

**Files:**
- Create: `src/lib/entitlements.ts`

**Interfaces:**
- Consumes: `db` (`@/lib/db`), `EntitlementType` (Prisma Client).
- Produces: `hasActiveEntitlement(userId, type): Promise<boolean>` — reusável pelas próximas fases (guard de `/relatorio`, `/desafio`), mesmo padrão do `requireSessionUser()`.

- [ ] **Step 1: Criar `src/lib/entitlements.ts`**

```typescript
import { db } from '@/lib/db';
import type { EntitlementType } from '@prisma/client';

export async function hasActiveEntitlement(
  userId: string,
  type: EntitlementType
): Promise<boolean> {
  const count = await db.entitlement.count({
    where: { userId, type, status: 'ACTIVE' },
  });
  return count > 0;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro relacionado a `src/lib/entitlements.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/entitlements.ts
git commit -m "feat: add hasActiveEntitlement helper"
```

---

### Task 2: `src/lib/payment-handler.ts` — motor de pagamento

**Files:**
- Create: `src/lib/payment-handler.ts`

**Interfaces:**
- Consumes: `db` (`@/lib/db`), `Platform`/`OrderStatus` (Prisma Client).
- Produces: `PaymentEvent` (tipo), `handlePayment(event): Promise<void>` — usado pela Task 3 (`/api/checkout/simulate`) e, futuramente, pelas rotas reais de webhook (fora do escopo desta rodada).

- [ ] **Step 1: Criar `src/lib/payment-handler.ts`**

```typescript
import { db } from '@/lib/db';
import type { Platform, OrderStatus } from '@prisma/client';

export interface PaymentEvent {
  platform: Platform;
  transactionId: string;
  status: OrderStatus;
  platformProductId: string;
  amountCents: number;
  buyer: {
    email: string;
    cpf?: string;
    nome?: string;
    celular?: string;
  };
  raw: unknown;
}

export async function handlePayment(event: PaymentEvent): Promise<void> {
  const existingOrder = await db.order.findUnique({
    where: { platformTransactionId: event.transactionId },
  });
  if (existingOrder) return;

  const product = await db.product.findFirst({
    where: { platformProductId: event.platformProductId, platform: event.platform },
  });
  if (!product) {
    throw new Error(
      `Unknown platformProductId "${event.platformProductId}" for platform ${event.platform}`
    );
  }

  const email = event.buyer.email.trim().toLowerCase();
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nome: event.buyer.nome,
      cpf: event.buyer.cpf,
      celular: event.buyer.celular,
    },
  });

  const orphanAssessment = await db.assessment.findFirst({
    where: { userId: null, leadEmail: email },
    orderBy: { createdAt: 'desc' },
  });
  if (orphanAssessment) {
    await db.assessment.update({
      where: { id: orphanAssessment.id },
      data: { userId: user.id },
    });
  }

  await db.order.create({
    data: {
      userId: user.id,
      productId: product.id,
      platform: event.platform,
      platformTransactionId: event.transactionId,
      status: event.status,
      amountCents: event.amountCents,
      rawPayload: event.raw as object,
    },
  });

  if (event.status === 'PAID') {
    const grants = product.grants as {
      entitlement: 'REPORT' | 'CHALLENGE' | 'BUMP';
      trackByLevel?: boolean;
    };
    const metadata: Record<string, unknown> = {};

    if (grants.entitlement === 'CHALLENGE' && grants.trackByLevel) {
      const latestAssessment = await db.assessment.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestAssessment) {
        metadata.track = latestAssessment.nivelGlobal;
      }
    }

    await db.entitlement.create({
      data: {
        userId: user.id,
        productId: product.id,
        type: grants.entitlement,
        status: 'ACTIVE',
        metadata: metadata as unknown as object,
      },
    });

    console.log(`[magic-link] enviaria link de acesso para ${user.email} (no-op em modo demo)`);
  } else {
    await db.entitlement.updateMany({
      where: { userId: user.id, productId: product.id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }
}
```

- [ ] **Step 2: Verificar de ponta a ponta contra o banco seedado**

Crie um arquivo temporário `verify-payment.tmp.ts` na raiz:

```typescript
import { db } from './src/lib/db';
import { handlePayment } from './src/lib/payment-handler';

const TEST_EMAIL = 'teste-pagamento@example.com';

async function main() {
  const product = await db.product.findUniqueOrThrow({ where: { slug: 'acesso-relatorio' } });

  // 1. Evento PAID — deve criar User, Order e Entitlement ACTIVE
  await handlePayment({
    platform: product.platform,
    transactionId: 'TEST-TXN-001',
    status: 'PAID',
    platformProductId: product.platformProductId,
    amountCents: product.priceCents,
    buyer: { email: TEST_EMAIL, nome: 'Usuária Teste Pagamento' },
    raw: { test: true },
  });

  const user = await db.user.findUniqueOrThrow({ where: { email: TEST_EMAIL } });
  const entitlementsAfterPaid = await db.entitlement.findMany({ where: { userId: user.id } });
  console.log('Após PAID:', entitlementsAfterPaid.length, 'entitlement(s), status:', entitlementsAfterPaid[0]?.status);

  // 2. Reprocessar o MESMO transactionId — não deve duplicar nada
  await handlePayment({
    platform: product.platform,
    transactionId: 'TEST-TXN-001',
    status: 'PAID',
    platformProductId: product.platformProductId,
    amountCents: product.priceCents,
    buyer: { email: TEST_EMAIL, nome: 'Usuária Teste Pagamento' },
    raw: { test: true },
  });
  const ordersAfterRetry = await db.order.count({ where: { userId: user.id } });
  const entitlementsAfterRetry = await db.entitlement.count({ where: { userId: user.id } });
  console.log('Após reprocessar mesmo evento: Orders =', ordersAfterRetry, '(esperado 1), Entitlements =', entitlementsAfterRetry, '(esperado 1)');

  // 3. Evento REFUNDED (transactionId novo) — deve revogar o entitlement
  await handlePayment({
    platform: product.platform,
    transactionId: 'TEST-TXN-002-REFUND',
    status: 'REFUNDED',
    platformProductId: product.platformProductId,
    amountCents: product.priceCents,
    buyer: { email: TEST_EMAIL },
    raw: { test: true },
  });
  const entitlementAfterRefund = await db.entitlement.findFirst({ where: { userId: user.id } });
  console.log('Após REFUNDED: status =', entitlementAfterRefund?.status, '(esperado REVOKED)');

  // limpeza — remove os dados de teste criados por este script
  await db.order.deleteMany({ where: { userId: user.id } });
  await db.entitlement.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log('OK - dados de teste limpos');

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run: `npx tsx verify-payment.tmp.ts`

Expected, nesta ordem:
```
Após PAID: 1 entitlement(s), status: ACTIVE
Após reprocessar mesmo evento: Orders = 1 (esperado 1), Entitlements = 1 (esperado 1)
Após REFUNDED: status = REVOKED (esperado REVOKED)
OK - dados de teste limpos
```

- [ ] **Step 3: Remover o script temporário**

Run: `rm verify-payment.tmp.ts`

Run: `git status --short` — confirme working tree limpo (o script de verificação e os dados de teste não deixam rastro).

- [ ] **Step 4: Commit**

```bash
git add src/lib/payment-handler.ts
git commit -m "feat: add handlePayment (idempotent order + entitlement + assessment adoption)"
```

> **Nota pós-Task 3:** o `npx tsx verify-payment.tmp.ts` do Step 2 NÃO pega erros de tipo (tsx transpila sem type-check completo) — um erro real (`metadata: Record<string, unknown>` não bate com o tipo `Json` do Prisma) só apareceu quando a Task 3 rodou `npx tsc --noEmit` no projeto inteiro. Corrigido com `metadata as unknown as object` (mesmo padrão já usado em `assessment-service.ts` da Fase 2). **Lição:** sempre que uma task só verifica com `tsx`, rodar `npx tsc --noEmit` no repo inteiro antes de considerar a task fechada — não só o arquivo novo.

---

### Task 3: `POST /api/checkout/simulate`

**Files:**
- Create: `src/app/api/checkout/simulate/route.ts`

**Interfaces:**
- Consumes: `handlePayment` (Task 2), `createSession` (`@/lib/auth`, Fase 3), `db` (`@/lib/db`).
- Produces: `POST /api/checkout/simulate` (body `{ email, productSlug, nome? }` → 200 + cookie de sessão da usuária recém-"paga", ou 403 se `DEMO_MODE` não estiver ativo) — usado pela Task 4.

- [ ] **Step 1: Confirmar `DEMO_MODE=true` no `.env` local**

Este arquivo é protegido por permissão — confirme com o usuário que `.env` já tem `DEMO_MODE=true` (deveria estar lá desde a Fase 1, como valor padrão do `.env.example`). Se não tiver certeza, pergunte antes de prosseguir pro teste manual do Step 3.

- [ ] **Step 2: Criar `src/app/api/checkout/simulate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { handlePayment } from '@/lib/payment-handler';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'DEMO_MODE is not enabled' }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string; productSlug?: string; nome?: string };
  const email = body.email?.trim().toLowerCase();
  const productSlug = body.productSlug;

  if (!email || !productSlug) {
    return NextResponse.json({ error: 'email and productSlug are required' }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { slug: productSlug } });
  if (!product) {
    return NextResponse.json({ error: `Product "${productSlug}" not found` }, { status: 404 });
  }

  await handlePayment({
    platform: product.platform,
    transactionId: `DEMO-${randomUUID()}`,
    status: 'PAID',
    platformProductId: product.platformProductId,
    amountCents: product.priceCents,
    buyer: { email, nome: body.nome },
    raw: { simulated: true },
  });

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Testar manualmente com o servidor de dev**

**IMPORTANTE:** subagentes em background não conseguem rodar um servidor de dev (sem aprovação interativa disponível). Escreva o código, rode `npx tsc --noEmit`, e pare por aqui — o controller vai fazer o teste manual com o servidor real depois (ver Task 4, que testa isso junto com o botão).

Run: `npx tsc --noEmit`

Expected: nenhum erro relacionado a este arquivo.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/checkout/simulate
git commit -m "feat: add POST /api/checkout/simulate (demo-mode payment simulation)"
```

---

### Task 4: Botão "Simular pagamento aprovado" na tela de checkout

**Files:**
- Create: `src/components/screens/SimulatePaymentButton.tsx`
- Modify: `src/app/checkout/page.tsx`

**Interfaces:**
- Consumes: `POST /api/checkout/simulate` (Task 3).
- Produces: fluxo completo demonstrável — quiz → resultado → checkout → simular pagamento → dashboard já logada com o relatório liberado.

- [ ] **Step 1: Criar `src/components/screens/SimulatePaymentButton.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SimulatePaymentButtonProps {
  email: string;
  nome?: string;
  productSlug: string;
}

export function SimulatePaymentButton({ email, nome, productSlug }: SimulatePaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch('/api/checkout/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nome, productSlug }),
    });

    if (!res.ok) {
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-3 mt-3 bg-[var(--color-brand-sage)] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-opacity"
    >
      {loading ? 'Simulando...' : '[Demo] Simular pagamento aprovado'}
    </button>
  );
}
```

- [ ] **Step 2: Modificar `src/app/checkout/page.tsx`**

Substitua o conteúdo inteiro do arquivo por:

```typescript
import { db } from '@/lib/db';
import { CheckoutReportView } from '@/components/screens/CheckoutReportView';
import { SimulatePaymentButton } from '@/components/screens/SimulatePaymentButton';
import type { NivelGlobal } from '@/types/assessment';

interface CheckoutPageProps {
  searchParams: Promise<{ assessmentId?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { assessmentId } = await searchParams;

  const [product, assessment] = await Promise.all([
    db.product.findUnique({ where: { slug: 'acesso-relatorio' } }),
    assessmentId ? db.assessment.findUnique({ where: { id: assessmentId } }) : Promise.resolve(null),
  ]);

  if (!product) {
    throw new Error('Product acesso-relatorio not found — run `npm run db:seed`');
  }

  return (
    <div>
      <CheckoutReportView
        checkoutUrl={product.checkoutUrl}
        primeiroNome={assessment?.leadNome ?? undefined}
        nivelGlobal={(assessment?.nivelGlobal as NivelGlobal | undefined) ?? undefined}
      />
      {process.env.DEMO_MODE === 'true' && assessment?.leadEmail && (
        <div className="px-6 pb-10">
          <SimulatePaymentButton
            email={assessment.leadEmail}
            nome={assessment.leadNome ?? undefined}
            productSlug="acesso-relatorio"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro relacionado a estes arquivos.

- [ ] **Step 4: Commit**

```bash
git add src/components/screens/SimulatePaymentButton.tsx src/app/checkout/page.tsx
git commit -m "feat: add demo payment simulation button to checkout page"
```

---

### Task 5: `src/lib/kiwify-webhook.ts` — verificação de assinatura + normalização

**Files:**
- Create: `docs/reference/kiwify-webhook-exemplo.json` (mover o arquivo `kiwify-webhook-exemplo.json` da raiz pra cá, mesmo padrão de arquivamento do export do Typebot na Fase 2)
- Create: `src/lib/kiwify-webhook.ts`

**Interfaces:**
- Consumes: `PaymentEvent` (`@/lib/payment-handler`, Task 2), `process.env.KIWIFY_WEBHOOK_SECRET`.
- Produces: `verifyKiwifySignature(rawBody, signature): boolean`, `normalizeKiwifyPayload(body): PaymentEvent` — usados pela Task 6 (a rota).

- [ ] **Step 1: Mover o arquivo de exemplo pra `docs/reference/`**

```bash
mkdir -p docs/reference
git mv kiwify-webhook-exemplo.json docs/reference/kiwify-webhook-exemplo.json
```

Se `git mv` falhar porque o arquivo ainda não está rastreado pelo git, use `mv` normal e depois `git add`.

- [ ] **Step 2: Criar `src/lib/kiwify-webhook.ts`**

```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import type { PaymentEvent } from '@/lib/payment-handler';
import type { OrderStatus } from '@prisma/client';

export interface KiwifyWebhookBody {
  order_id: string;
  order_status: string;
  Product: {
    product_id: string;
    product_name: string;
  };
  Customer: {
    full_name: string;
    email: string;
    mobile?: string;
    cnpj?: string;
  };
  Commissions: {
    charge_amount: number;
  };
}

export function verifyKiwifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  if (!secret) throw new Error('KIWIFY_WEBHOOK_SECRET is not set');

  const expected = createHmac('sha1', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

function mapKiwifyStatus(orderStatus: string): OrderStatus {
  switch (orderStatus) {
    case 'paid':
      return 'PAID';
    case 'refunded':
      return 'REFUNDED';
    case 'chargedback':
    case 'chargeback':
      return 'CHARGEBACK';
    default:
      throw new Error(
        `Unmapped Kiwify order_status: "${orderStatus}" — valores conhecidos: paid, refunded, chargedback. Confirme o valor real antes de tratar como definitivo.`
      );
  }
}

export function normalizeKiwifyPayload(body: KiwifyWebhookBody): PaymentEvent {
  return {
    platform: 'KIWIFY',
    transactionId: body.order_id,
    status: mapKiwifyStatus(body.order_status),
    platformProductId: body.Product.product_id,
    amountCents: body.Commissions.charge_amount,
    buyer: {
      email: body.Customer.email,
      nome: body.Customer.full_name,
      cpf: body.Customer.cnpj,
      celular: body.Customer.mobile,
    },
    raw: body,
  };
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro relacionado a este arquivo.

- [ ] **Step 4: Commit**

```bash
git add docs/reference/kiwify-webhook-exemplo.json src/lib/kiwify-webhook.ts
git commit -m "feat: add Kiwify webhook signature verification and payload normalization"
```

---

### Task 6: `POST /api/webhooks/kiwify`

**Files:**
- Create: `src/app/api/webhooks/kiwify/route.ts`

**Interfaces:**
- Consumes: `verifyKiwifySignature`, `normalizeKiwifyPayload` (Task 5), `handlePayment` (Task 2).
- Produces: `POST /api/webhooks/kiwify` — a rota real que o Kiwify vai chamar quando produtos de verdade estiverem cadastrados na plataforma (fora do caminho gravado no vídeo, mas funcional e testável agora).

- [ ] **Step 1: Criar `src/app/api/webhooks/kiwify/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handlePayment } from '@/lib/payment-handler';
import {
  verifyKiwifySignature,
  normalizeKiwifyPayload,
  type KiwifyWebhookBody,
} from '@/lib/kiwify-webhook';

export async function POST(request: NextRequest) {
  const signature = request.nextUrl.searchParams.get('signature');
  const rawBody = await request.text();

  if (!signature || !verifyKiwifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as KiwifyWebhookBody;

  try {
    const event = normalizeKiwifyPayload(body);
    await handlePayment(event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Kiwify webhook processing failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Confirmar `KIWIFY_WEBHOOK_SECRET` no `.env` local**

Este arquivo é protegido por permissão — confirme com o usuário que `.env` tem uma linha `KIWIFY_WEBHOOK_SECRET=<algum valor>` (pode ser um valor de desenvolvimento qualquer, ex.: `dev-kiwify-secret-local` — só precisa bater entre o que a assinatura de teste usa e o que a rota lê. Não precisa ser o segredo real do Kiwify ainda, já que nenhum produto real está cadastrado lá).

- [ ] **Step 3: Escrever e rodar um script de verificação (assinatura calculada localmente)**

Crie um arquivo temporário `verify-kiwify-webhook.tmp.ts` na raiz:

```typescript
import { createHmac } from 'crypto';
import { db } from './src/lib/db';
import kiwifyExample from './docs/reference/kiwify-webhook-exemplo.json';

const SECRET = process.env.KIWIFY_WEBHOOK_SECRET;
if (!SECRET) {
  console.error('KIWIFY_WEBHOOK_SECRET não está definido no .env — necessário pra este teste.');
  process.exit(1);
}

function sign(rawBody: string): string {
  return createHmac('sha1', SECRET as string).update(rawBody).digest('hex');
}

interface KiwifyExampleWrapper {
  body: {
    order_id: string;
    order_status: string;
    Product: { product_id: string; product_name: string };
    Customer: { full_name: string; email: string; mobile?: string; cnpj?: string };
    Commissions: { charge_amount: number };
  };
}

async function main() {
  // 1. Body real do exemplo, mas com o product_id trocado pro nosso produto seedado
  //    e um order_id novo (pra não colidir com testes anteriores).
  const exampleBody = (kiwifyExample as unknown as KiwifyExampleWrapper[])[0].body;
  const reportProduct = await db.product.findUniqueOrThrow({ where: { slug: 'acesso-relatorio' } });

  const testBody = {
    ...exampleBody,
    order_id: `TEST-KIWIFY-${Date.now()}`,
    order_status: 'paid',
    Product: { ...exampleBody.Product, product_id: reportProduct.platformProductId },
    Customer: { ...exampleBody.Customer, email: 'teste-kiwify-webhook@example.com' },
  };
  const rawBody = JSON.stringify(testBody);
  const validSignature = sign(rawBody);

  // Teste 1: assinatura inválida -> 401
  const res1 = await fetch(`http://localhost:3000/api/webhooks/kiwify?signature=INVALID`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });
  console.log('Teste 1 (assinatura inválida):', res1.status, '(esperado 401)');

  // Teste 2: assinatura válida, produto conhecido -> 200 + Order/Entitlement criados
  const res2 = await fetch(`http://localhost:3000/api/webhooks/kiwify?signature=${validSignature}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });
  console.log('Teste 2 (assinatura válida, produto real):', res2.status, '(esperado 200)');

  const user = await db.user.findUnique({ where: { email: 'teste-kiwify-webhook@example.com' } });
  if (user) {
    const entitlement = await db.entitlement.findFirst({ where: { userId: user.id } });
    console.log('Entitlement criado:', entitlement?.type, entitlement?.status, '(esperado REPORT ACTIVE)');

    // limpeza
    await db.order.deleteMany({ where: { userId: user.id } });
    await db.entitlement.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    console.log('OK - dados de teste limpos');
  } else {
    console.log('AVISO: usuária de teste não foi criada — Teste 2 pode ter falhado.');
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**IMPORTANTE:** este script precisa do servidor de dev rodando (`npm run dev`) E precisa rodar num processo separado que consiga ler `process.env.KIWIFY_WEBHOOK_SECRET` — subagentes em background não conseguem iniciar o servidor de dev (sem aprovação interativa disponível). Escreva o código e pare aqui — o controller roda esta verificação manualmente na Task 7.

- [ ] **Step 4: Verificar que compila (sem rodar o servidor)**

Run: `npx tsc --noEmit`

Expected: nenhum erro relacionado aos arquivos desta task.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/kiwify
git commit -m "feat: add POST /api/webhooks/kiwify route"
```

(O script `verify-kiwify-webhook.tmp.ts` **não** é commitado — fica pro controller rodar e apagar na Task 7.)

---

### Task 7 (controller — não delegar a subagente): Verificação manual do funil completo

Esta task não é implementação — é a verificação de ponta a ponta que fecha a fase, feita pelo controller com o usuário presente (mesmo padrão estabelecido na Fase 3, já que envolve servidor de dev real).

- [ ] Rodar `npm run dev`
- [ ] Fazer o quiz do zero em `/welcome` → `/captura` (usar um e-mail novo, ex.: `demo-fase4@example.com`) → responder as 41 perguntas → cair em `/resultado`
- [ ] Clicar no CTA do resultado → cair em `/checkout?assessmentId=...` → confirmar que o botão **"[Demo] Simular pagamento aprovado"** aparece
- [ ] Clicar no botão → confirmar redirect pra `/dashboard`
- [ ] Confirmar que o dashboard mostra os dados reais do quiz que acabou de ser feito (nome, nível, score) — prova que `handlePayment` adotou o `Assessment` órfão corretamente
- [ ] Verificar no banco que `Order` e `Entitlement` foram criados: `docker compose exec postgres psql -U fertilidade -d fertilidade -c "SELECT o.status, e.type, e.status FROM \"Order\" o JOIN \"Entitlement\" e ON e.\"userId\" = o.\"userId\" JOIN \"User\" u ON u.id = o.\"userId\" WHERE u.email = 'demo-fase4@example.com';"`
- [ ] Rodar o script temporário `verify-kiwify-webhook.tmp.ts` da Task 6 (com `npx tsx verify-kiwify-webhook.tmp.ts`) — confirmar Teste 1 = 401, Teste 2 = 200, entitlement = REPORT ACTIVE, limpeza confirmada
- [ ] Apagar `verify-kiwify-webhook.tmp.ts` e confirmar `git status --short` limpo
- [ ] Parar o servidor de dev

---

## Ao final desta fase

O motor de pagamento está pronto, testado e demonstrável — o vídeo já pode mostrar o funil completo: quiz → checkout → "compra" → dashboard liberado, tudo com dados reais persistidos. A rota real do Kiwify (`/api/webhooks/kiwify`) também está pronta e testada com o payload de exemplo oficial deles — falta só cadastrar produtos reais na plataforma e apontar a URL do webhook lá. O Hotmart fica para um plano curto separado assim que houver um payload de exemplo real.
