# Fase 1 — Fundação (Prisma + Postgres local) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ter o schema Prisma completo (todas as entidades do domínio) migrado num Postgres local via Docker Compose, com um client singleton testável — a base sobre a qual todas as próximas fases (score, auth, webhooks, desafio) vão escrever.

**Architecture:** Prisma como ORM único (decisão já tomada no design), Postgres 16 em container só para dev local (`docker-compose.yml` na raiz, não usado em produção — produção usa o Postgres do EasyPanel via `DATABASE_URL` de ambiente). Client Prisma acessado por um singleton em `src/lib/db.ts` para evitar múltiplas instâncias em hot-reload do Next.js.

**Tech Stack:** Prisma 6.x, @prisma/client, PostgreSQL 16 (docker), tsx (scripts de verificação, já convenção do repo).

## Global Constraints

- ORM: Prisma (decisão do design, não Drizzle) — `docs/superpowers/specs/2026-07-07-app-demo-funcional-design.md`.
- Postgres 16.
- `docker-compose.yml` na raiz é **só para dev local**; não interfere no `Dockerfile` de produção (Fase 7).
- Variáveis de ambiente lidas de `.env` (não `.env.local`) — Prisma CLI só lê `.env` automaticamente, e Next.js também lê `.env`, então usar um arquivo único evita divergência entre `next dev` e `npx prisma migrate`.
- Commits: **nunca** incluir trailer `Co-Authored-By: Claude` ou qualquer menção de co-autoria de IA — preferência explícita do usuário.
- Todas as entidades do schema devem corresponder exatamente ao bloco "Modelo de dados (Prisma)" do design spec — não adicionar campos além do que está lá.
- **Prisma pinado em `^6.19.3`** (não instalar `7.x`). O Prisma 7 muda a arquitetura de config (`datasource.url` sai do `schema.prisma` e vai para `prisma.config.ts`, exige driver adapter `@prisma/adapter-pg` no construtor do `PrismaClient`) — fora do escopo desta fase. Use sempre `npm install prisma@^6.19.3 -D` e `npm install @prisma/client@^6.19.3`, nunca sem pin de major version.

---

### Task 1: Instalar Prisma e subir Postgres local via Docker Compose

**Files:**
- Modify: `package.json`
- Create: `docker-compose.yml`
- Create: `.env` (gitignored — não commitar)
- Modify: `.env.example`

**Interfaces:**
- Produces: `DATABASE_URL` disponível em `.env` para as próximas tasks (`postgresql://fertilidade:fertilidade@localhost:5433/fertilidade?schema=public` — porta host **5433**, não 5432, porque outro projeto local (`postgres_go_pro`) já ocupa 5432; a porta interna do container continua 5432).
- Produces: scripts npm `prisma:migrate` (`prisma migrate dev`) e `prisma:studio` (`prisma studio`) para uso nas próximas fases.

- [ ] **Step 1: Instalar as dependências do Prisma (pinadas em 6.x)**

Run: `npm install @prisma/client@^6.19.3 && npm install -D prisma@^6.19.3`

Expected: `package.json` ganha `@prisma/client` (`^6.19.3`) em `dependencies` e `prisma` (`^6.19.3`) em `devDependencies`; `package-lock.json` atualizado. **Não instale sem o pin de versão** — a versão `7.x` (padrão do `npm install` sem pin) muda a arquitetura de config e quebra os passos seguintes deste plano.

- [ ] **Step 2: Adicionar scripts e postinstall ao `package.json`**

Abrir `package.json` e adicionar dentro de `"scripts"`:

```json
    "postinstall": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
```

(mantém os scripts existentes `dev`, `build`, `start`, `lint` como estão)

- [ ] **Step 3: Criar `docker-compose.yml` na raiz**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: fertilidade
      POSTGRES_PASSWORD: fertilidade
      POSTGRES_DB: fertilidade
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fertilidade"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 4: Subir o container e confirmar que está saudável**

Run: `docker compose up -d`

Run: `docker compose exec postgres pg_isready -U fertilidade`

Expected: `/var/run/postgresql:5432 - accepting connections` (se ainda não estiver pronto, repita o comando após alguns segundos — não use sleep longo, apenas rode de novo).

- [ ] **Step 5: Criar `.env` com a connection string**

Criar arquivo `.env` na raiz (este arquivo é ignorado pelo git — confirme que `.gitignore` já tem `.env*` com exceção de `.env.example`, o que já é o caso):

```
DATABASE_URL="postgresql://fertilidade:fertilidade@localhost:5433/fertilidade?schema=public"
```

- [ ] **Step 6: Atualizar `.env.example` com todas as variáveis do design**

Substituir o conteúdo de `.env.example` por:

```
DATABASE_URL=
SESSION_SECRET=
INGEST_TOKEN=
KIWIFY_WEBHOOK_SECRET=
HOTMART_WEBHOOK_SECRET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
DEMO_MODE=true
APP_BASE_URL=http://localhost:3000
```

- [ ] **Step 7: Confirmar que `.env` não vai ser commitado**

Run: `git status --short`

Expected: `.env` **não aparece** na lista (deve estar ignorado); `package.json`, `package-lock.json`, `docker-compose.yml` e `.env.example` aparecem como modificados/novos.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json docker-compose.yml .env.example
git commit -m "chore: add Prisma deps and local Postgres via docker-compose"
```

---

### Task 2: Definir o schema Prisma completo

**Files:**
- Create: `prisma/schema.prisma`

**Interfaces:**
- Consumes: `DATABASE_URL` de `.env` (Task 1).
- Produces: os models Prisma (`User`, `Session`, `Assessment`, `Question`, `QuestionOption`, `ScoreRule`, `PillarMessage`, `Product`, `Order`, `Entitlement`, `ChallengeTrack`, `ChallengeDay`, `ChallengeMessage`, `ChallengeProgress`, `Devolutiva`) e os enums (`AssessmentSource`, `NivelGlobal`, `PillarLevel`, `ProductKind`, `Platform`, `OrderStatus`, `EntitlementType`, `EntitlementStatus`, `MessageType`, `DevolutivaTipo`) que TODAS as próximas fases vão importar de `@prisma/client`.

- [ ] **Step 1: Criar o diretório e o arquivo `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

enum AssessmentSource {
  TYPEBOT
  APP_NATIVE
}

enum NivelGlobal {
  BAIXA
  MODERADA
  ALTA
}

model Assessment {
  id             String           @id @default(cuid())
  userId         String?
  user           User?            @relation(fields: [userId], references: [id])
  source         AssessmentSource
  leadEmail      String?
  leadCpf        String?
  leadNome       String?
  leadCelular    String?
  answers        Json
  pillarScores   Json
  scoreTotal     Float
  resultadoFinal Float
  nivelGlobal    NivelGlobal
  createdAt      DateTime         @default(now())
}

model Question {
  id      String           @id @default(cuid())
  pillar  String
  ordem   Int
  texto   String
  options QuestionOption[]
}

model QuestionOption {
  id         String   @id @default(cuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  label      String
  ordem      Int
  rawScore   Float
}

model ScoreRule {
  pillar           String @id
  peso             Int
  maxDoPilar       Float
  scoreDenominator Float
}

enum PillarLevel {
  Alto
  Moderado
  Baixo
}

model PillarMessage {
  id           String      @id @default(cuid())
  pillar       String
  level        PillarLevel
  diagnostico  String
  recomendacao String

  @@unique([pillar, level])
}

enum ProductKind {
  APP_ACCESS
  CHALLENGE
  ORDER_BUMP
}

enum Platform {
  KIWIFY
  HOTMART
}

model Product {
  id                String      @id @default(cuid())
  slug              String      @unique
  nome              String
  priceCents        Int
  kind              ProductKind
  platform          Platform
  platformProductId String
  checkoutUrl       String
  grants            Json

  orders       Order[]
  entitlements Entitlement[]
}

enum OrderStatus {
  PAID
  REFUNDED
  CHARGEBACK
}

model Order {
  id                    String      @id @default(cuid())
  userId                String
  user                  User        @relation(fields: [userId], references: [id])
  productId             String
  product               Product     @relation(fields: [productId], references: [id])
  platform              Platform
  platformTransactionId String      @unique
  status                OrderStatus
  amountCents           Int
  rawPayload            Json
  createdAt             DateTime    @default(now())
}

enum EntitlementType {
  REPORT
  CHALLENGE
  BUMP
}

enum EntitlementStatus {
  ACTIVE
  REVOKED
}

model Entitlement {
  id        String            @id @default(cuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id])
  productId String
  product   Product           @relation(fields: [productId], references: [id])
  type      EntitlementType
  status    EntitlementStatus
  metadata  Json?
  grantedAt DateTime          @default(now())
  revokedAt DateTime?
}

model ChallengeTrack {
  id                   String              @id @default(cuid())
  level                NivelGlobal         @unique
  codename             String
  title                String
  defaultCooldownHours Int
  days                 ChallengeDay[]
  progress             ChallengeProgress[]
}

model ChallengeDay {
  id            String             @id @default(cuid())
  trackId       String
  track         ChallengeTrack     @relation(fields: [trackId], references: [id])
  dayNumber     Int
  isOnboarding  Boolean            @default(false)
  cooldownHours Int?
  messages      ChallengeMessage[]

  @@unique([trackId, dayNumber])
}

enum MessageType {
  TEXTO
  AUDIO
  IMAGEM
  VIDEO
}

model ChallengeMessage {
  id       String       @id @default(cuid())
  dayId    String
  day      ChallengeDay @relation(fields: [dayId], references: [id])
  ordem    Int
  tipo     MessageType
  texto    String?
  mediaKey String?
  delayMs  Int
}

model ChallengeProgress {
  id             String         @id @default(cuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id])
  trackId        String
  track          ChallengeTrack @relation(fields: [trackId], references: [id])
  currentDay     Int            @default(0)
  dayCompletions Json           @default("{}")
  lastSeenOrdem  Json           @default("{}")

  @@unique([userId, trackId])
}

enum DevolutivaTipo {
  TEXTO
  AUDIO
  FOTO
}

model Devolutiva {
  id        String         @id @default(cuid())
  userId    String
  user      User           @relation(fields: [userId], references: [id])
  dayNumber Int
  tipo      DevolutivaTipo
  conteudo  String?
  mediaUrl  String?
  createdAt DateTime       @default(now())
}
```

- [ ] **Step 2: Validar a sintaxe do schema**

Run: `npx prisma format`

Expected: `Formatted prisma\schema.prisma in Xms 🚀` sem nenhum erro de sintaxe impresso.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add complete Prisma schema for domain model"
```

---

### Task 3: Rodar a primeira migration

**Files:**
- Create (gerado pelo Prisma): `prisma/migrations/<timestamp>_init/migration.sql`
- Modify (gerado pelo Prisma): `prisma/migrations/migration_lock.toml`

**Interfaces:**
- Consumes: `prisma/schema.prisma` (Task 2), `DATABASE_URL` de `.env` (Task 1), Postgres rodando (Task 1).
- Produces: tabelas reais no Postgres local, cliente `@prisma/client` gerado em `node_modules/@prisma/client` com os tipos de todos os models — usado por todas as fases seguintes via `import { PrismaClient } from '@prisma/client'`.

- [ ] **Step 1: Rodar a migration**

Run: `npx prisma migrate dev --name init`

Expected: saída terminando em algo como:
```
Your database is now in sync with your schema.

✔ Generated Prisma Client
```

- [ ] **Step 2: Confirmar as tabelas no banco**

Run: `docker compose exec postgres psql -U fertilidade -d fertilidade -c "\dt"`

Expected: lista com as 15 tabelas (`User`, `Session`, `Assessment`, `Question`, `QuestionOption`, `ScoreRule`, `PillarMessage`, `Product`, `Order`, `Entitlement`, `ChallengeTrack`, `ChallengeDay`, `ChallengeMessage`, `ChallengeProgress`, `Devolutiva`) mais `_prisma_migrations`.

- [ ] **Step 3: Commit**

```bash
git add prisma/migrations
git commit -m "feat: add initial Prisma migration"
```

---

### Task 4: Client Prisma singleton

**Files:**
- Create: `src/lib/db.ts`

**Interfaces:**
- Consumes: `PrismaClient` de `@prisma/client` (Task 3).
- Produces: `export const db: PrismaClient` — **toda fase futura que precisar do banco importa `db` daqui** (`import { db } from '@/lib/db'`), nunca instancia `new PrismaClient()` diretamente em outro arquivo.

- [ ] **Step 1: Criar o singleton**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add Prisma client singleton"
```

---

### Task 5: Verificar a integração de ponta a ponta

**Files:**
- Create temporário (não commitado): `verify-db.tmp.ts` na raiz do projeto

**Interfaces:**
- Consumes: `db` de `src/lib/db.ts` (Task 4).
- Produces: nada persistente — esta task só prova que Tasks 1-4 funcionam juntas antes de seguir pra Fase 2.

- [ ] **Step 1: Criar o script temporário de verificação**

```typescript
import { db } from './src/lib/db';

async function main() {
  const count = await db.user.count();
  console.log(`OK - connected to Postgres, User count: ${count}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Rodar o script**

Run: `npx tsx verify-db.tmp.ts`

Expected: `OK - connected to Postgres, User count: 0`

- [ ] **Step 3: Remover o script temporário**

Run: `rm verify-db.tmp.ts`

- [ ] **Step 4: Confirmar que não sobrou nada para commitar**

Run: `git status --short`

Expected: saída vazia (working tree limpo).

---

## Ao final desta fase

O banco de dados está no ar, o schema completo migrado, e o app tem um jeito único e testado de falar com ele (`src/lib/db.ts`). A Fase 2 (motor de score + quiz nativo) pode começar — seu plano será escrito separadamente, já usando os tipos exatos gerados aqui (`db.assessment`, `db.question`, `db.scoreRule`, etc.).
