# Checkout real da Kiwify + magic link real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o login sem verificação por magic link real (token único, expira em 24h, disparado via webhook n8n) e trocar os dois produtos placeholder da Kiwify pelos produtos reais já criados.

**Architecture:** Novo model `MagicLinkToken` (espelha `Session` — token bruto só na URL, hash HMAC no banco). Uma função central `sendMagicLink(userId)` em `src/lib/magic-link.ts` é chamada por dois gatilhos: login self-service (`/api/auth/login`) e primeira concessão de entitlement (`payment-handler.ts`). Uma rota nova `GET /api/auth/verify` valida o token e cria a sessão. O envio do e-mail em si é responsabilidade do n8n (fora deste app) — o app só faz um `POST` com `{ email, nome, magicLinkUrl }`.

**Tech Stack:** Next.js 16 (App Router, route handlers), Prisma/PostgreSQL, `crypto` (HMAC, já usado em `src/lib/auth.ts`).

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-17-checkout-real-magic-link-design.md`.
- Token de magic link expira em **24 horas**, uso único (`usedAt` marcado na verificação).
- `tokenHash` = `HMAC-SHA256(token, SESSION_SECRET)` — reaproveita o secret que já protege `Session`. Nenhum secret novo.
- A chamada pro webhook do n8n **nunca pode lançar erro** — falha só loga e segue. Isso é regra obrigatória pro gatilho de pagamento: o webhook (`docs/03-funil-e-webhooks.md`, regra 9) precisa responder rápido e não pode quebrar por causa do e-mail.
- `.env`/`.env.example` são protegidos por permissão neste ambiente — Read/Edit/Bash são bloqueados neles. Nenhuma task deste plano tenta editá-los. As duas env vars necessárias (`N8N_MAGIC_LINK_WEBHOOK_URL` novo; `APP_BASE_URL` já existe em `.env.example` com valor `http://localhost:3000`) ficam documentadas no plano — o usuário adiciona manualmente.
- Fora de escopo (decisão consciente, não implementar): rate limiting em `/api/auth/login`, limpeza periódica de tokens expirados, botão de reenvio manual de link.
- Depois de qualquer task que envolva Prisma, rodar `npx tsc --noEmit` no repo inteiro.
- Domínio/UI em português, identificadores de código em português/inglês conforme já usado no arquivo que você está editando.
- Sem runner de testes configurado — validação via script `tsx` temporário contra o banco local real (mesmo padrão já usado no projeto) e, na Task final, verificação ao vivo pelo controller com `npm run dev`.

---

### Task 1: Schema — model `MagicLinkToken`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_magic_link_token/migration.sql` (gerado pelo Prisma)

**Interfaces:**
- Produces: model Prisma `MagicLinkToken { id, userId, tokenHash (unique), expiresAt, usedAt?, createdAt }`, consumido pela Task 2 via `db.magicLinkToken`.

- [ ] **Step 1: Editar `prisma/schema.prisma`**

Adicionar `magicLinkTokens MagicLinkToken[]` ao model `User` — substituir:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  nome      String?
  cpf       String?
  celular   String?
  createdAt DateTime @default(now())

  sessions          Session[]
  assessments       Assessment[]
  orders            Order[]
  entitlements      Entitlement[]
  challengeProgress ChallengeProgress[]
  devolutivas       Devolutiva[]
}
```
por:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  nome      String?
  cpf       String?
  celular   String?
  createdAt DateTime @default(now())

  sessions          Session[]
  magicLinkTokens   MagicLinkToken[]
  assessments       Assessment[]
  orders            Order[]
  entitlements      Entitlement[]
  challengeProgress ChallengeProgress[]
  devolutivas       Devolutiva[]
}
```

Adicionar o model novo logo depois de `Session` — substituir:
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```
por:
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

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

- [ ] **Step 2: Gerar e aplicar a migration**

Run: `npx prisma migrate dev --name add_magic_link_token`
Expected: migration criada em `prisma/migrations/`, aplicada no banco local sem avisos de perda de dado (só cria uma tabela nova). Prisma Client regenerado.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add MagicLinkToken model"
```

---

### Task 2: `src/lib/magic-link.ts` — emissão e verificação de token

**Files:**
- Modify: `src/lib/auth.ts` (exportar `hashToken`)
- Create: `src/lib/magic-link.ts`
- Test: `verify-magic-link.tmp.ts` (raiz do repo, temporário — apagar antes de commitar)

**Interfaces:**
- Consumes: `db` (`@/lib/db`), `hashToken` (`@/lib/auth`, exportado nesta task), model `db.magicLinkToken` (Task 1).
- Produces: `sendMagicLink(userId: string): Promise<void>` e `verifyMagicLinkToken(token: string): Promise<{ userId: string } | null>` (`@/lib/magic-link`) — consumidos pelas Tasks 3 e 4.

- [ ] **Step 1: Exportar `hashToken` em `src/lib/auth.ts`**

Substituir:
```ts
function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return createHmac('sha256', secret).update(token).digest('hex');
}
```
por:
```ts
export function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return createHmac('sha256', secret).update(token).digest('hex');
}
```

- [ ] **Step 2: Criar `src/lib/magic-link.ts`**

```ts
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/auth';

const TOKEN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Gera um token de magic link, grava o hash no banco e pede pro n8n
 * enviar o e-mail. Nunca lança — falha de rede/n8n só loga (regra
 * obrigatória pro gatilho de pagamento, que precisa responder rápido).
 */
export async function sendMagicLink(userId: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_DURATION_MS);

  await db.magicLinkToken.create({ data: { userId, tokenHash, expiresAt } });

  const magicLinkUrl = `${process.env.APP_BASE_URL}/api/auth/verify?token=${token}`;
  const webhookUrl = process.env.N8N_MAGIC_LINK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(`[magic-link] N8N_MAGIC_LINK_WEBHOOK_URL não configurado — link: ${magicLinkUrl}`);
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, nome: user.nome, magicLinkUrl }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error('[magic-link] falha ao chamar o webhook do n8n:', error);
  }
}

export interface VerifyMagicLinkResult {
  userId: string;
}

/** Valida um token de magic link: existe, não expirou, não foi usado. Marca como usado. */
export async function verifyMagicLinkToken(token: string): Promise<VerifyMagicLinkResult | null> {
  const tokenHash = hashToken(token);
  const record = await db.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await db.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { userId: record.userId };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Escrever e rodar o script de verificação temporário**

Criar `verify-magic-link.tmp.ts` na raiz do repo:
```ts
import { randomBytes } from 'crypto';
import { db } from './src/lib/db';
import { hashToken } from './src/lib/auth';
import { verifyMagicLinkToken, sendMagicLink } from './src/lib/magic-link';

async function main() {
  const email = `verify-magic-link-${Date.now()}@example.com`;
  const user = await db.user.create({ data: { email, nome: 'Verify Magic Link' } });

  // 1. Token válido recém-criado -> verifica com sucesso
  const rawToken = randomBytes(32).toString('hex');
  await db.magicLinkToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  const result = await verifyMagicLinkToken(rawToken);
  if (result?.userId !== user.id) {
    throw new Error(`esperava userId ${user.id}, achou ${JSON.stringify(result)}`);
  }
  console.log('OK: token válido verificado com sucesso');

  // 2. Mesmo token de novo -> já usado, deve falhar
  const reuse = await verifyMagicLinkToken(rawToken);
  if (reuse !== null) {
    throw new Error(`esperava null (token já usado), achou ${JSON.stringify(reuse)}`);
  }
  console.log('OK: token usado é rejeitado');

  // 3. Token expirado -> deve falhar
  const expiredToken = randomBytes(32).toString('hex');
  await db.magicLinkToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(expiredToken),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  const expiredResult = await verifyMagicLinkToken(expiredToken);
  if (expiredResult !== null) {
    throw new Error(`esperava null (token expirado), achou ${JSON.stringify(expiredResult)}`);
  }
  console.log('OK: token expirado é rejeitado');

  // 4. Token inexistente -> deve falhar
  const bogusResult = await verifyMagicLinkToken('token-que-nunca-existiu');
  if (bogusResult !== null) {
    throw new Error(`esperava null (token inexistente), achou ${JSON.stringify(bogusResult)}`);
  }
  console.log('OK: token inexistente é rejeitado');

  // 5. sendMagicLink cria um token novo no banco sem lançar, mesmo sem N8N_MAGIC_LINK_WEBHOOK_URL
  const beforeCount = await db.magicLinkToken.count({ where: { userId: user.id } });
  await sendMagicLink(user.id);
  const afterCount = await db.magicLinkToken.count({ where: { userId: user.id } });
  if (afterCount !== beforeCount + 1) {
    throw new Error(`esperava ${beforeCount + 1} tokens, achou ${afterCount}`);
  }
  console.log('OK: sendMagicLink cria um novo token sem lançar erro mesmo sem N8N_MAGIC_LINK_WEBHOOK_URL');

  await db.magicLinkToken.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log('OK: limpeza concluída');
}

main()
  .catch((e) => {
    console.error('FALHOU:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

Run: `node --env-file=.env node_modules/tsx/dist/cli.mjs verify-magic-link.tmp.ts`
Expected: as 6 linhas `OK:` impressas, sem erro. A linha do Step 5 aparece no console via `console.log('[magic-link] N8N_MAGIC_LINK_WEBHOOK_URL não configurado...')` — isso é esperado, não é falha.

- [ ] **Step 5: Apagar o script temporário**

```bash
rm verify-magic-link.tmp.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/magic-link.ts
git commit -m "feat: add magic link token issuance and verification"
```

---

### Task 3: Rotas — `/api/auth/login` (ajustar) e `/api/auth/verify` (nova)

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/verify/route.ts`

**Interfaces:**
- Consumes: `sendMagicLink`, `verifyMagicLinkToken` (`@/lib/magic-link`, Task 2), `createSession` (`@/lib/auth`, já existe).
- Produces: nenhuma interface nova consumida por outras tasks — ponta de entrada HTTP.

- [ ] **Step 1: Editar `src/app/api/auth/login/route.ts`**

Substituir o arquivo inteiro:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Não encontramos essa conta' }, { status: 404 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
```
por:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendMagicLink } from '@/lib/magic-link';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Não encontramos essa conta' }, { status: 404 });
  }

  await sendMagicLink(user.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Criar `src/app/api/auth/verify/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLinkToken } from '@/lib/magic-link';
import { createSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  const result = await verifyMagicLinkToken(token);
  if (!result) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  await createSession(result.userId);
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/login/route.ts src/app/api/auth/verify/route.ts
git commit -m "feat: switch login to real magic link verification"
```

---

### Task 4: `payment-handler.ts` — disparar magic link de verdade

**Files:**
- Modify: `src/lib/payment-handler.ts`

**Interfaces:**
- Consumes: `sendMagicLink` (`@/lib/magic-link`, Task 2).

- [ ] **Step 1: Editar `src/lib/payment-handler.ts`**

Adicionar o import — substituir:
```ts
import { db } from '@/lib/db';
import type { Platform, OrderStatus } from '@prisma/client';
```
por:
```ts
import { db } from '@/lib/db';
import { sendMagicLink } from '@/lib/magic-link';
import type { Platform, OrderStatus } from '@prisma/client';
```

Trocar o stub pelo disparo real — substituir:
```ts
    console.log(`[magic-link] enviaria link de acesso para ${user.email} (no-op em modo demo)`);
```
por:
```ts
    await sendMagicLink(user.id);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/payment-handler.ts
git commit -m "feat: send real magic link on entitlement grant"
```

---

### Task 5: `LoginPage` — fluxo "confira seu e-mail" + erro de token inválido

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:** nenhuma nova — consome só a rota `/api/auth/login` (já existente, comportamento mudou na Task 3: não redireciona mais, responde `{ ok: true }`).

- [ ] **Step 1: Editar `src/app/login/page.tsx`**

Substituir o arquivo inteiro:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Não foi possível entrar');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--color-surface-cream)] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--color-border-soft)] p-6 flex flex-col gap-4">
        <div>
          <h1 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)]">
            Entrar
          </h1>
          <p className="text-xs text-[var(--color-brand-brown)]/60 mt-1">
            Use o e-mail da sua conta pra acessar seu relatório.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-soft)] text-sm bg-white text-[var(--color-brand-brown)] placeholder:text-[var(--color-brand-brown)]/35 outline-none focus:border-[var(--color-brand-terracota)]/60"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--color-brand-terracota)] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-opacity"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```
por:
```tsx
'use client';

import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid_token') {
      setError('Esse link expirou ou já foi usado. Peça um novo abaixo.');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Não foi possível entrar');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--color-surface-cream)] px-6">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--color-border-soft)] p-6 flex flex-col gap-3 text-center">
          <h1 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)]">
            Confira seu e-mail
          </h1>
          <p className="text-xs text-[var(--color-brand-brown)]/60">
            Mandamos um link de acesso pra <strong>{email}</strong>. Clique nele
            pra entrar — ele vale por 24 horas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--color-surface-cream)] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--color-border-soft)] p-6 flex flex-col gap-4">
        <div>
          <h1 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)]">
            Entrar
          </h1>
          <p className="text-xs text-[var(--color-brand-brown)]/60 mt-1">
            Use o e-mail da sua conta — vamos te mandar um link de acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-soft)] text-sm bg-white text-[var(--color-brand-brown)] placeholder:text-[var(--color-brand-brown)]/35 outline-none focus:border-[var(--color-brand-terracota)]/60"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--color-brand-terracota)] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-opacity"
          >
            {loading ? 'Enviando...' : 'Enviar link de acesso'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: show check-your-email state and invalid-token message on login"
```

---

### Task 6: Checkout Kiwify — valores reais + fix do bug de no-op no reseed

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:** nenhuma (dado, não código).

- [ ] **Step 1: Editar `seedProducts()` em `prisma/seed.ts`**

Substituir:
```ts
async function seedProducts() {
  await db.product.upsert({
    where: { slug: 'acesso-relatorio' },
    update: {},
    create: {
      slug: 'acesso-relatorio',
      nome: 'Acesso + Relatório de Fertilidade',
      priceCents: 4990,
      kind: 'APP_ACCESS',
      platform: 'KIWIFY',
      platformProductId: 'PLACEHOLDER-acesso-relatorio',
      checkoutUrl: 'https://pay.kiwify.com.br/PLACEHOLDER-acesso-relatorio',
      grants: { entitlement: 'REPORT' },
    },
  });
  console.log('Product: acesso-relatorio');
}
```
por:
```ts
async function seedProducts() {
  await db.product.upsert({
    where: { slug: 'acesso-relatorio' },
    update: {
      platformProductId: 'bc467340-742d-11f1-b76b-9b601e996ae9',
      checkoutUrl: 'https://pay.kiwify.com.br/ZBk1Z6q',
    },
    create: {
      slug: 'acesso-relatorio',
      nome: 'Acesso + Relatório de Fertilidade',
      priceCents: 4990,
      kind: 'APP_ACCESS',
      platform: 'KIWIFY',
      platformProductId: 'bc467340-742d-11f1-b76b-9b601e996ae9',
      checkoutUrl: 'https://pay.kiwify.com.br/ZBk1Z6q',
      grants: { entitlement: 'REPORT' },
    },
  });
  console.log('Product: acesso-relatorio');
}
```

- [ ] **Step 2: Editar `seedDemoUserAndCatalog()` em `prisma/seed.ts`**

Substituir:
```ts
  await db.product.upsert({
    where: { slug: 'desafio-7-dias' },
    update: {},
    create: {
      slug: 'desafio-7-dias',
      nome: 'Desafio de 7 Dias',
      priceCents: 19790,
      kind: 'CHALLENGE',
      platform: 'KIWIFY',
      platformProductId: 'PLACEHOLDER-desafio-7-dias',
      checkoutUrl: 'https://pay.kiwify.com.br/PLACEHOLDER-desafio-7-dias',
      grants: { entitlement: 'CHALLENGE', trackByLevel: true },
    },
  });
  console.log('Product: desafio-7-dias');
```
por:
```ts
  await db.product.upsert({
    where: { slug: 'desafio-7-dias' },
    update: {
      platformProductId: '37c34350-742d-11f1-b76b-9b601e996ae9',
      checkoutUrl: 'https://pay.kiwify.com.br/lRYTIPV',
    },
    create: {
      slug: 'desafio-7-dias',
      nome: 'Desafio de 7 Dias',
      priceCents: 19790,
      kind: 'CHALLENGE',
      platform: 'KIWIFY',
      platformProductId: '37c34350-742d-11f1-b76b-9b601e996ae9',
      checkoutUrl: 'https://pay.kiwify.com.br/lRYTIPV',
      grants: { entitlement: 'CHALLENGE', trackByLevel: true },
    },
  });
  console.log('Product: desafio-7-dias');
```

- [ ] **Step 3: Reseed**

Run: `npm run db:seed`
Expected: saída normal, incluindo `Product: acesso-relatorio` e `Product: desafio-7-dias`, sem erro.

- [ ] **Step 4: Confirmar que o reseed realmente atualizou os valores (prova de que o bug do `update: {}` foi corrigido)**

Criar `check-product-urls.tmp.ts` na raiz do repo:
```ts
import { db } from './src/lib/db';

async function main() {
  const products = await db.product.findMany({
    where: { slug: { in: ['acesso-relatorio', 'desafio-7-dias'] } },
    select: { slug: true, checkoutUrl: true, platformProductId: true },
  });
  for (const p of products) {
    console.log(p.slug, '->', p.checkoutUrl, '/', p.platformProductId);
    if (p.checkoutUrl.includes('PLACEHOLDER') || p.platformProductId.includes('PLACEHOLDER')) {
      throw new Error(`${p.slug} ainda está com valor placeholder`);
    }
  }
  console.log('OK: os dois produtos têm checkoutUrl/platformProductId reais');
}

main().finally(() => db.$disconnect());
```

Run: `node --env-file=.env node_modules/tsx/dist/cli.mjs check-product-urls.tmp.ts`
Expected: as duas linhas de URL impressas + `OK:`, sem erro.

- [ ] **Step 5: Apagar o script temporário**

```bash
rm check-product-urls.tmp.ts
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts
git commit -m "fix: apply real Kiwify checkout URLs and fix reseed no-op bug"
```

---

### Task 7: Verificação ao vivo com banco real (controller, não subagente)

**Files:** nenhum (só verificação).

**Interfaces:** nenhuma.

> Mesma ressalva das fases anteriores: rodar servidor de dev e testar no
> navegador é tarefa do controller, com o usuário presente — subagentes em
> background não conseguem fazer isso nesta máquina.

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`

- [ ] **Step 2: Testar o fluxo de login self-service**

- Abrir `/login`, digitar `carolinapalitot20@gmail.com`, enviar.
- Confirmar que a tela muda pra "Confira seu e-mail" (sem redirecionar).
- Como `N8N_MAGIC_LINK_WEBHOOK_URL` não está configurado localmente, o link
  de magic link aparece no log do servidor
  (`[magic-link] N8N_MAGIC_LINK_WEBHOOK_URL não configurado — link: ...`).
  Copiar essa URL.
- Abrir a URL copiada no navegador — confirmar redirecionamento pra
  `/dashboard` já logada.
- Abrir a MESMA URL de novo — confirmar redirecionamento pra
  `/login?error=invalid_token` com a mensagem "Esse link expirou ou já foi
  usado. Peça um novo abaixo." aparecendo.

- [ ] **Step 3: Testar o fluxo disparado por pagamento**

- Em `/checkout` (ou `/desafio/oferta`), usar o botão `[Demo] Simular
  pagamento aprovado` com um e-mail de teste novo.
- Confirmar no log do servidor que `sendMagicLink` também disparou pra esse
  fluxo (mesma linha de log com o link, pro e-mail de teste).
- Confirmar que a compra continua logando direto (comportamento do modo demo
  não muda — ele chama `createSession` separadamente, o magic link só roda
  em paralelo simulando o que aconteceria numa compra real).

- [ ] **Step 4: Confirmar os checkout URLs reais nas telas**

- Abrir `/checkout` (oferta do relatório) e `/desafio/oferta` — inspecionar o
  `href` do botão de compra em cada uma e confirmar que apontam pra
  `https://pay.kiwify.com.br/ZBk1Z6q` e `https://pay.kiwify.com.br/lRYTIPV`
  respectivamente (não mais placeholder).

- [ ] **Step 5: Resetar o estado de progresso da Carolina**

Run: `npm run db:seed`

- [ ] **Step 6: Reportar ao usuário**

Resumir o que foi testado e lembrar explicitamente das 3 ações manuais fora
do código que ainda faltam pro checkout ir ao ar de verdade:
1. Configurar `KIWIFY_WEBHOOK_SECRET` real no ambiente de produção.
2. Apontar o webhook da Kiwify (painel deles) pra
   `https://app.carolinapalitot.com/api/webhooks/kiwify`.
3. Montar o workflow n8n que recebe `{ email, nome, magicLinkUrl }` em
   `N8N_MAGIC_LINK_WEBHOOK_URL` e envia o e-mail de verdade — e configurar
   essa env var (+ `APP_BASE_URL=https://app.carolinapalitot.com`) no
   ambiente de produção.
