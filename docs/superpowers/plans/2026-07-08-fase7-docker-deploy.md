# Fase 7 - Docker + Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar o app Next.js para rodar em container no EasyPanel com standalone output, migration deploy no startup, healthcheck HTTP e documentacao operacional.

**Architecture:** Usar `output: 'standalone'` do Next.js 16 para gerar `.next/standalone/server.js`, copiando manualmente `public` e `.next/static` conforme a documentacao local de `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`. A imagem Docker sera multi-stage e copiara somente os artefatos de runtime, arquivos Prisma necessarios para migrations e o Prisma CLI para `migrate deploy`.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2, Prisma 6.19, Node 20 Alpine, Docker.

---

## File Structure

- Modify: `next.config.ts` - habilita `output: 'standalone'`.
- Create: `src/app/api/health/route.ts` - healthcheck HTTP sem dependencia de banco.
- Modify: `package.json` - move `prisma` para `dependencies`, porque o runtime executa `prisma migrate deploy`.
- Modify: `package-lock.json` - refletir a mudanca de dependencia via `npm install prisma@^6.19.3 --save-prod`.
- Create: `Dockerfile` - imagem multi-stage para EasyPanel.
- Create: `.dockerignore` - reduz contexto e bloqueia arquivos locais/sensiveis.
- Modify: `docs/05-infra-e-deploy.md` - documenta build, runtime, healthcheck e envs.

---

### Task 1: Healthcheck HTTP

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Criar a rota de healthcheck**

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'mapa-fertilidade-app',
  });
}
```

- [ ] **Step 2: Rodar typecheck/build da rota**

Run:

```powershell
npm run build
```

Expected:

- Build exit code `0`.
- A listagem de rotas deve incluir `/api/health` como rota dinamica.

- [ ] **Step 3: Commit**

```powershell
git add src\app\api\health\route.ts
git commit -m "feat: add healthcheck endpoint"
```

---

### Task 2: Standalone Output do Next.js

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Habilitar standalone output**

Replace `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Rodar build e confirmar artefato standalone**

Run:

```powershell
npm run build
Test-Path .next\standalone\server.js
Test-Path .next\static
```

Expected:

- `npm run build` exit code `0`.
- `Test-Path .next\standalone\server.js` prints `True`.
- `Test-Path .next\static` prints `True`.

- [ ] **Step 3: Commit**

```powershell
git add next.config.ts
git commit -m "build: enable Next.js standalone output"
```

---

### Task 3: Prisma CLI Como Dependencia Operacional

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Mover Prisma CLI para dependencies**

Run:

```powershell
npm install prisma@^6.19.3 --save-prod
```

Expected:

- `package.json` deve listar `"prisma": "^6.19.3"` em `dependencies`.
- `package.json` nao deve listar `"prisma"` em `devDependencies`.
- `package-lock.json` deve refletir a mesma classificacao.

- [ ] **Step 2: Conferir package.json**

Run:

```powershell
Get-Content -Path package.json
```

Expected relevant shape:

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1081.0",
    "@prisma/client": "^6.19.3",
    "lucide-react": "^1.20.0",
    "motion": "^12.40.0",
    "next": "16.2.9",
    "prisma": "^6.19.3",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "tsx": "^4.23.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: Validar Prisma generate**

Run:

```powershell
npx.cmd prisma generate
```

Expected:

- Exit code `0`.
- Prisma Client generated successfully.

- [ ] **Step 4: Commit**

```powershell
git add package.json package-lock.json
git commit -m "build: make Prisma CLI available at runtime"
```

---

### Task 4: Dockerfile e .dockerignore

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Criar .dockerignore**

Create `.dockerignore`:

```dockerignore
.git
.next
node_modules
npm-debug.log*
Dockerfile
.dockerignore
.env
.env.*
!.env.example
tsconfig.tsbuildinfo
.claude
.superpowers
docs/superpowers
```

- [ ] **Step 2: Criar Dockerfile multi-stage**

Create `Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node server.js"]
```

- [ ] **Step 3: Buildar imagem Docker**

Run:

```powershell
docker build -t mapa-fertilidade-app:local .
```

Expected:

- Exit code `0`.
- Build conclui criando a imagem `mapa-fertilidade-app:local`.

If this fails due to missing Docker daemon or network/cached base image, stop and report the exact failure. Do not replace Docker verification with a weaker check without user approval.

- [ ] **Step 4: Commit**

```powershell
git add Dockerfile .dockerignore
git commit -m "build: add production Docker image"
```

---

### Task 5: Documentacao Operacional

**Files:**
- Modify: `docs/05-infra-e-deploy.md`

- [ ] **Step 1: Atualizar a secao App**

In `docs/05-infra-e-deploy.md`, replace the current `## App` section with:

```markdown
## App

- Next.js (App Router) como monolito full-stack. Um container so.
- Build de producao via `Dockerfile` multi-stage com `output: "standalone"` do
  Next.js.
- Runtime esperado: Node 20 Alpine, `PORT=3000`, `HOSTNAME=0.0.0.0`.
- Startup do container:
  1. `prisma migrate deploy`
  2. `node server.js`
- Seeds nao rodam automaticamente em producao. Rode seed manualmente apenas em
  ambiente controlado.
- Healthcheck HTTP: `GET /api/health`.

Variaveis de ambiente de runtime:

| Categoria | Variavel | Obrigatoria | Observacao |
| --- | --- | --- | --- |
| Banco | `DATABASE_URL` | Sim | URL do Postgres do EasyPanel. |
| Auth | `SESSION_SECRET` | Sim | Segredo de assinatura de sessao. |
| Typebot | `INGEST_TOKEN` | Sim, se Typebot estiver ativo | Token do endpoint `/api/ingest/typebot`. |
| Pagamento | `KIWIFY_WEBHOOK_SECRET` | Sim, se Kiwify estiver ativo | Segredo do webhook Kiwify. |
| Midia publica | `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | Sim | Base publica usada para audio/imagem do desafio. |
| Demo | `DEMO_MODE` | Nao | Use `true` somente em ambiente de demonstracao. |

Variaveis usadas somente pelo script `scripts/migrate-media.ts` nao precisam
estar no runtime do app, exceto durante execucao manual desse script.
```

- [ ] **Step 2: Atualizar a secao CI/CD**

In `docs/05-infra-e-deploy.md`, append this paragraph after the existing CI/CD suggested pipeline:

```markdown
Estado atual da Fase 7: o repositorio entrega Dockerfile e healthcheck para
deploy manual no EasyPanel. GitHub Actions, registry de imagem e webhook de
deploy continuam fora de escopo ate a definicao do fluxo de publicacao.
```

- [ ] **Step 3: Commit**

```powershell
git add docs\05-infra-e-deploy.md
git commit -m "docs: document Docker runtime deployment"
```

---

### Task 6: Validacao Final da Fase 7

**Files:**
- No code changes expected.

- [ ] **Step 1: Rodar testes TypeScript avulsos**

Run:

```powershell
npx.cmd tsx src\lib\scoring.test.ts
npx.cmd tsx src\lib\scoring-answers.test.ts
npx.cmd tsx src\lib\report-assembly.test.ts
```

Expected:

- `scoring.test.ts: all assertions passed`
- `scoring-answers.test.ts: all assertions passed`
- `report-assembly.test.ts: all assertions passed`

- [ ] **Step 2: Rodar lint**

Run:

```powershell
npm run lint
```

Expected:

- Exit code `0`.
- No ESLint errors.

- [ ] **Step 3: Rodar build Next**

Run:

```powershell
npm run build
```

Expected:

- Exit code `0`.
- Rotas incluem `/api/health` como rota dinamica.
- `.next\standalone\server.js` existe.

- [ ] **Step 4: Rodar build Docker**

Run:

```powershell
docker build -t mapa-fertilidade-app:local .
```

Expected:

- Exit code `0`.
- Imagem local criada.

- [ ] **Step 5: Conferir diff/status**

Run:

```powershell
git status --short
git log --oneline -5
```

Expected:

- `git status --short` limpo.
- Commits da Fase 7 aparecem no topo de `master`.

---

## Self-Review

- Spec coverage: cobre Dockerfile, `.dockerignore`, standalone output, healthcheck, docs de env/runtime e validacao Docker.
- Scan de lacunas: nao ha marcadores de preenchimento ou etapas sem conteudo concreto.
- Type consistency: healthcheck usa `NextResponse` como os route handlers existentes; comandos Windows usam PowerShell; comandos internos do container ficam no `Dockerfile` Linux Alpine.
