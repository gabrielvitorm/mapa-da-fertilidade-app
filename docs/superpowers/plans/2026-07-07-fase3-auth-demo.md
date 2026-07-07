# Fase 3 — Auth Demo (login + sessão + dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login funcional (e-mail → sessão, sem envio real de e-mail) que redireciona pro dashboard, com o dashboard mostrando dados reais de uma usuária demo (Carolina Palitot) — o pedido original que abriu este trabalho: "criar uma tela de login e já direcionando para o dashboard."

**Architecture:** Cookie de sessão httpOnly próprio (sem NextAuth), backed pela tabela `Session` já existente no schema (Fase 1). Um helper único `requireSessionUser()` em `src/lib/auth.ts` protege qualquer página futura (`/relatorio`, `/desafio` nas próximas fases reusam o mesmo helper, não duplicam lógica de guard). A usuária demo nasce via uma extensão do `prisma/seed.ts` (Fase 2) — puxa pra cá uma fatia mínima do que seria "usuária showcase" da Fase 6: um `User`, um `Assessment` adotado (reaproveitando `assessment-service.ts` da Fase 2 sem modificá-lo) e um `Entitlement REPORT` ativo, sem passar pelo webhook (que é Fase 4).

**Tech Stack:** Next.js 16 App Router (Route Handlers + Server Components), `node:crypto` (HMAC-SHA256 pra hash do token de sessão), Prisma 6.19.3.

## Global Constraints

- Sessão: cookie httpOnly + tabela `Session` (sem NextAuth) — decisão já tomada no design.
- `SESSION_SECRET` precisa ser adicionado manualmente ao `.env` local pelo usuário (arquivo protegido por permissão, agentes não conseguem editá-lo) — usado como chave HMAC pro hash do token.
- E-mail normalizado (`lowercase().trim()`) antes de qualquer lookup, conforme `docs/01-dominio-e-modelo.md`.
- Login é fake/demo: sem envio de e-mail real. Se o e-mail não existir na tabela `User`, retorna erro — **nunca cria conta nova** nesse fluxo (isso é papel do webhook, Fase 4).
- `requireSessionUser()` é o único helper de guard — todo `page.tsx` protegido futuro deve chamá-lo, não duplicar a lógica.
- **Não modificar** `DashboardView.tsx` nem nenhum componente de tela já existente — o botão de logout é um componente novo separado (`LogoutButton.tsx`), composto ao lado de `DashboardView` na página, não dentro dela.
- Usuária demo: **Carolina Palitot**, e-mail **carolinapalitot20@gmail.com** — usar esse e-mail/nome exatos (é o que será digitado na gravação do vídeo), não um placeholder genérico.
- Commits: **nunca** incluir trailer `Co-Authored-By: Claude` ou qualquer menção de co-autoria de IA.

---

### Task 1: `src/lib/auth.ts` — mecanismo de sessão

**Files:**
- Create: `src/lib/auth.ts`

**Interfaces:**
- Consumes: `db` (`@/lib/db`), model `Session`/`User` do Prisma Client (Fase 1), `process.env.SESSION_SECRET`.
- Produces: `createSession(userId): Promise<void>`, `getSessionUser(): Promise<User | null>`, `requireSessionUser(): Promise<User>` (redireciona pra `/login` se não autenticado), `destroySession(): Promise<void>` — usados pelas Tasks 3 e 4.

- [ ] **Step 1: Criar `src/lib/auth.ts`**

```typescript
import { randomBytes, createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import type { User } from '@prisma/client';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return createHmac('sha256', secret).update(token).digest('hex');
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({ data: { userId, tokenHash, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return session.user;
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    await db.session.deleteMany({ where: { tokenHash } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
```

- [ ] **Step 2: Verificar que compila**

`createSession`/`getSessionUser`/`destroySession` usam `cookies()` de `next/headers`, que só funciona dentro de um request real do Next.js — não dá pra testar via `tsx` avulso como fizemos com `scoring.ts`. A verificação funcional de ponta a ponta acontece nas Tasks 3 e 4 (rotas reais + navegador). Por agora, confirme só que o arquivo compila sem erros de tipo:

Run: `npx tsc --noEmit`

Expected: nenhum erro relacionado a `src/lib/auth.ts` (pode haver avisos pré-existentes de outros arquivos gerados pelo Next — ignore-os, foque em `auth.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add session cookie mechanism (createSession, getSessionUser, requireSessionUser, destroySession)"
```

---

### Task 2: Estender `prisma/seed.ts` — usuária demo + catálogo do desafio

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `createAssessment` (`@/lib/assessment-service`, Fase 2 — **não modificar esse arquivo**), `db` (`@/lib/db`), `Question`/`QuestionOption`/`Product`/`User`/`Assessment`/`Entitlement` (Prisma).
- Produces: um `User` real (`carolinapalitot20@gmail.com`) com um `Assessment` adotado e um `Entitlement REPORT` ativo — consumido pela Task 3 (login) e Task 4 (dashboard). Também produz o `Product` `desafio-7-dias` no catálogo — consumido pela Task 4 (link de compra do desafio quando a usuária ainda não tem acesso).

- [ ] **Step 1: Adicionar o import de `createAssessment` no topo de `prisma/seed.ts`**

Logo abaixo do import existente `import { db } from '../src/lib/db';`, adicione:

```typescript
import { createAssessment } from '../src/lib/assessment-service';
```

- [ ] **Step 2: Adicionar a função `seedDemoUserAndCatalog`**

Adicione esta função em `prisma/seed.ts`, depois da função `seedProducts` existente e antes de `main`:

```typescript
async function seedDemoUserAndCatalog() {
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

  const DEMO_EMAIL = 'carolinapalitot20@gmail.com';
  const DEMO_NOME = 'Carolina Palitot';

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { nome: DEMO_NOME },
    create: { email: DEMO_EMAIL, nome: DEMO_NOME },
  });

  // Idempotente: limpa assessments/entitlements anteriores da demo antes de recriar.
  await db.entitlement.deleteMany({ where: { userId: user.id } });
  await db.assessment.deleteMany({ where: { userId: user.id } });

  const questions = await db.question.findMany({ include: { options: true } });
  const answers = questions.map((q) => {
    const sorted = [...q.options].sort((a, b) => b.rawScore - a.rawScore);
    const middle = sorted[Math.floor(sorted.length / 2)];
    return { questionId: q.id, optionId: middle.id };
  });

  const result = await createAssessment({
    source: 'APP_NATIVE',
    lead: { nome: DEMO_NOME, email: DEMO_EMAIL },
    answers,
  });

  // Adoção do assessment órfão pela usuária — o mesmo movimento que o
  // webhook de pagamento vai fazer de verdade na Fase 4.
  await db.assessment.update({
    where: { id: result.assessmentId },
    data: { userId: user.id },
  });

  const reportProduct = await db.product.findUniqueOrThrow({ where: { slug: 'acesso-relatorio' } });
  await db.entitlement.create({
    data: { userId: user.id, productId: reportProduct.id, type: 'REPORT', status: 'ACTIVE' },
  });

  console.log(
    `Demo user: ${user.email} (assessment ${result.assessmentId}, nivel ${result.nivelGlobal}, resultadoFinal ${result.resultadoFinal})`
  );
}
```

- [ ] **Step 3: Chamar a nova função em `main()`**

Em `prisma/seed.ts`, dentro de `async function main()`, adicione a chamada depois de `await seedProducts();`:

```typescript
  await seedProducts();
  await seedDemoUserAndCatalog();
```

- [ ] **Step 4: Rodar o seed e conferir o resultado**

Run: `npm run db:seed`

Expected: as quatro linhas de log já conhecidas (ScoreRule/Question/PillarMessage/Product) mais duas novas:
```
Product: desafio-7-dias
Demo user: carolinapalitot20@gmail.com (assessment <cuid>, nivel <BAIXA|MODERADA|ALTA>, resultadoFinal <number>)
```

Anote o `nivel` retornado — vamos usá-lo pra confirmar visualmente no dashboard mais tarde (Task 4).

- [ ] **Step 5: Verificar idempotência**

Run: `npm run db:seed` de novo.

Run: `docker compose exec postgres psql -U fertilidade -d fertilidade -c "SELECT (SELECT COUNT(*) FROM \"User\" WHERE email='carolinapalitot20@gmail.com') u, (SELECT COUNT(*) FROM \"Assessment\" a JOIN \"User\" usr ON a.\"userId\"=usr.id WHERE usr.email='carolinapalitot20@gmail.com') a, (SELECT COUNT(*) FROM \"Entitlement\" e JOIN \"User\" usr ON e.\"userId\"=usr.id WHERE usr.email='carolinapalitot20@gmail.com') e, (SELECT COUNT(*) FROM \"Product\") p;"`

Expected: `u=1`, `a=1`, `e=1`, `p=2` (os dois produtos: `acesso-relatorio` e `desafio-7-dias`) — nada duplicado depois de rodar o seed duas vezes.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed demo user (Carolina Palitot) with adopted assessment and REPORT entitlement"
```

---

### Task 3: `POST /api/auth/login` + página `/login`

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/login/page.tsx`
- Modify: `src/app/page.tsx` (adicionar link de conveniência)

**Interfaces:**
- Consumes: `createSession` (`@/lib/auth`, Task 1), `db` (`@/lib/db`).
- Produces: `POST /api/auth/login` (body `{ email }` → 200 + cookie de sessão, ou 404 se não existir), rota navegável `/login` — consumidos pela Task 4 (guard redireciona pra cá) e pelo fluxo de demonstração.

- [ ] **Step 1: Criar `src/app/api/auth/login/route.ts`**

```typescript
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

- [ ] **Step 2: Criar `src/app/login/page.tsx`**

```typescript
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

- [ ] **Step 3: Adicionar link de conveniência em `src/app/page.tsx`**

No array de `Link`s de `src/app/page.tsx` (o mesmo de onde já está o link "Funil real: Boas-vindas" adicionado na Fase 2), adicione logo abaixo dele:

```tsx
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Funil real: Login
        </Link>
```

- [ ] **Step 4: Garantir que `SESSION_SECRET` existe no `.env` local**

Este arquivo é protegido por permissão — você (humano) precisa adicionar manualmente, se ainda não tiver feito. Peça ao usuário para confirmar/adicionar ao `.env`:

```
SESSION_SECRET=dev-session-secret-local
```

Se não conseguir confirmar diretamente, avise no relatório da task e prossiga assumindo que precisa ser adicionado antes do teste manual do Step 5 funcionar.

- [ ] **Step 5: Testar manualmente com o servidor de dev**

Run: `npm run dev` (background)

Login com e-mail que não existe — deve retornar 404:
Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"naoexiste@example.com\"}"`
Expected: `404`

Login com o e-mail da usuária demo (criada na Task 2) — deve retornar 200:
Run: `curl -s -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"carolinapalitot20@gmail.com\"}"`
Expected: status `200`, e o header de resposta deve conter `Set-Cookie: session_token=...`

Pare o servidor de dev.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/login src/app/login src/app/page.tsx
git commit -m "feat: add POST /api/auth/login and /login page"
```

---

### Task 4: `POST /api/auth/logout` + página `/dashboard` (guard + dados reais)

**Files:**
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/components/screens/LogoutButton.tsx`
- Create: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `requireSessionUser`, `destroySession` (`@/lib/auth`, Task 1), `db` (`@/lib/db`), `DashboardView` (`@/components/screens/DashboardView`, já existe — **não modificar**).
- Produces: rota navegável `/dashboard` (protegida), `POST /api/auth/logout` — fecha o pedido original "login → dashboard".

- [ ] **Step 1: Criar `src/app/api/auth/logout/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Criar `src/components/screens/LogoutButton.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[11px] text-[var(--color-brand-brown)]/40 underline px-6 pb-8"
    >
      Sair
    </button>
  );
}
```

- [ ] **Step 3: Criar `src/app/dashboard/page.tsx`**

```typescript
import { requireSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DashboardView } from '@/components/screens/DashboardView';
import { LogoutButton } from '@/components/screens/LogoutButton';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireSessionUser();

  const assessment = await db.assessment.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!assessment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-cream)] px-6 text-center">
        <p className="text-sm text-[var(--color-brand-brown)]/60">
          Você ainda não tem um diagnóstico. Faça o quiz pra continuar.
        </p>
      </div>
    );
  }

  const entitlements = await db.entitlement.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
  });
  const challengeEntitlement = entitlements.find((e) => e.type === 'CHALLENGE');
  const challengeProduct = await db.product.findUnique({ where: { slug: 'desafio-7-dias' } });

  return (
    <div>
      <DashboardView
        primeiroNome={user.nome ?? 'Você'}
        nivelGlobal={assessment.nivelGlobal as NivelGlobal}
        resultadoFinal={assessment.resultadoFinal}
        relatorioHref="/relatorio"
        desafioHref={challengeEntitlement ? '/desafio' : (challengeProduct?.checkoutUrl ?? '#')}
        temDesafio={Boolean(challengeEntitlement)}
      />
      <LogoutButton />
    </div>
  );
}
```

- [ ] **Step 4: Testar o fluxo completo no navegador**

Run: `npm run dev`

No navegador:
1. Acesse `http://localhost:3000/dashboard` **sem estar logada** — confirme que redireciona automaticamente pra `/login` (o guard funcionando).
2. Em `/login`, digite `carolinapalitot20@gmail.com` e envie — confirme que redireciona pra `/dashboard`.
3. Confirme que o dashboard mostra "Carolina Palitot" (ou primeiro nome), o nível calculado na Task 2, e o card "Desafio 7 dias" aparecendo como **bloqueado/à venda** (R$ 197,90) — já que ela ainda não tem `Entitlement CHALLENGE`.
4. Clique em "Sair" — confirme que volta pra `/login`.
5. Tente acessar `/dashboard` de novo depois do logout — confirme que redireciona pra `/login` de novo (a sessão foi realmente destruída, não só a UI escondeu o botão).

Pare o servidor de dev.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/logout src/components/screens/LogoutButton.tsx src/app/dashboard
git commit -m "feat: add POST /api/auth/logout and guarded /dashboard page with real data"
```

---

## Ao final desta fase

O pedido original está resolvido: login funcional (sem envio de e-mail, usando a conta demo) redireciona pro dashboard com dados reais — nível de fertilidade calculado, score, e o desafio aparecendo corretamente como ainda não comprado. `requireSessionUser()` já está pronto pra proteger `/relatorio` e `/desafio` assim que essas páginas forem wireadas nas próximas fases.
