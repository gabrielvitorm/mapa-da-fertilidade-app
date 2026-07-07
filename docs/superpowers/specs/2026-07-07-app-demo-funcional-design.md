# App funcional para vídeo de anúncio — design

Data: 2026-07-07

## Objetivo

Deixar o Mapa da Fertilidade funcional de ponta a ponta — quiz → relatório →
desafio — com dados reais em Postgres (não fixtures), autenticação demo,
webhooks de pagamento reais (exercitados via simulação, não cobrança real), e
empacotado em Docker pronto pra deploy no EasyPanel (VPS Hostinger via
GitHub). O motivo é gravar um vídeo de anúncio mostrando o produto em uso.

Fora de escopo nesta rodada: e-mail transacional real (magic link fica
no-op/log), CI/CD via GitHub Actions, gateway de pagamento próprio, telas de
acompanhamento da expert (devolutivas), testes automatizados end-to-end (só
os testes unitários do motor de score/gating, como já é convenção do repo).

## Dependências externas (bloqueiam partes específicas, não o todo)

1. **JSON de export do Typebot** (`typebot-export-mapa-da-fertilidade.json` ou
   equivalente) — necessário pra popular `Question`/`QuestionOption` com as
   perguntas reais e os pesos por resposta/pilar. O usuário vai fornecer. Até
   lá, o schema e a função de score (`src/lib/scoring.ts`) ficam prontos e
   testados com dados sintéticos; a Fase 2 (seed do banco de perguntas) só
   fecha quando o arquivo chegar.
2. **Credenciais R2** (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`) e acesso ao
   Google Drive de origem — necessários pra migração de mídia (Fase 5). Serão
   pedidos ao usuário quando essa fase começar.
3. **Repositório GitHub** — o EasyPanel builda a partir de um repo GitHub
   conectado. `git init` já foi feito localmente nesta sessão; o usuário
   ainda precisa criar o repositório remoto e conectar quando chegarmos na
   Fase 7 (deploy).

## Arquitetura

Continua monolito Next.js (App Router) conforme já estabelecido no
`CLAUDE.md`. Nenhuma peça nova de infraestrutura além do que os docs já
previam: Postgres (Prisma), R2 (mídia), cookie de sessão próprio (sem
NextAuth). Toda lógica de negócio pura em `src/lib/`, sem framework
acoplado, testável com `tsx`.

```
Browser
  │
  ▼
Next.js (App Router, container único)
  ├─ Server Components: leem sessão + Prisma direto (dashboard, relatório, desafio)
  ├─ Route Handlers (/api/*): quiz nativo, checkout simulado, webhooks, auth
  └─ src/lib/: scoring.ts, entitlements.ts, auth.ts, challenge-gating.ts (já existe)
        │
        ▼
   PostgreSQL (Prisma)          Cloudflare R2 (mídia do desafio)
```

## Modelo de dados (Prisma)

Fiel a `docs/01-dominio-e-modelo.md`, com duas adições motivadas pela
convenção "conteúdo é dado, não código" do `CLAUDE.md`: `ScoreRule` e
`Question`/`QuestionOption` também viram tabelas em vez de constantes
TypeScript, para que a regra de score e o banco de perguntas sejam
editáveis sem redeploy. A função `computeAssessment` continua pura — recebe
as regras como parâmetro, não as lê do banco diretamente.

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
  id             String            @id @default(cuid())
  userId         String?
  user           User?             @relation(fields: [userId], references: [id])
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
  createdAt      DateTime          @default(now())
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
  pillar             String @id
  peso               Int
  maxDoPilar          Float
  scoreDenominator   Float  // repetido em todas as linhas; simples de ler, editável por linha se um dia precisar variar
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
  id         String            @id @default(cuid())
  userId     String
  user       User              @relation(fields: [userId], references: [id])
  productId  String
  product    Product           @relation(fields: [productId], references: [id])
  type       EntitlementType
  status     EntitlementStatus
  metadata   Json?
  grantedAt  DateTime          @default(now())
  revokedAt  DateTime?
}

model ChallengeTrack {
  id                  String        @id @default(cuid())
  level               NivelGlobal   @unique
  codename            String
  title               String
  defaultCooldownHours Int
  days                ChallengeDay[]
  progress            ChallengeProgress[]
}

model ChallengeDay {
  id            String            @id @default(cuid())
  trackId       String
  track         ChallengeTrack    @relation(fields: [trackId], references: [id])
  dayNumber     Int
  isOnboarding  Boolean           @default(false)
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
  id       String      @id @default(cuid())
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
  lastSeenOrdem  Json           @default("{}") // { [dayNumber]: ordem }

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

## Fases de implementação

### Fase 1 — Fundação
- `npm install prisma @prisma/client`, `prisma init`, schema acima, primeira
  migration.
- `docker-compose.yml` (raiz, só dev) com Postgres 16 + volume.
- `.env.example` atualizado com todas as variáveis (ver seção Infra).

### Fase 2 — Motor de score + quiz nativo
- `src/lib/scoring.ts`: `computeAssessment(pillarScores, rules)` pura, testes
  via `tsx` cobrindo os cortes de nível (`>80`, `60-80`, `<60`) e o nível por
  pilar (`>=0.8`, `>=0.6`, senão).
- `src/lib/scoring-answers.ts`: reduz respostas do quiz em `pillarScores`.
- `POST /api/assessments`: recebe respostas do quiz nativo, calcula e grava.
- `POST /api/ingest/typebot`: mesmo cálculo, protegido por `X-Ingest-Token`.
- Fluxo de telas: Welcome → QuizQuestion (client state) → grava Assessment →
  ResultTeaser → Capture (lead) → CheckoutReport.
- **Bloqueado por dependência #1** para o conteúdo real das perguntas — a
  função e o fluxo ficam prontos, o seed de `Question`/`QuestionOption` entra
  assim que o JSON do Typebot chegar.

### Fase 3 — Auth demo
- `Session` + cookie httpOnly assinado (`SESSION_SECRET`).
- `src/lib/auth.ts`: `createSession`, `getSessionUser`, `destroySession`.
- Tela `/login`: e-mail → se existir `User`, cria sessão e redireciona pro
  `/dashboard`; senão, erro. Sem envio de e-mail.
- Guard de rota para `/dashboard`, `/relatorio`, `/desafio`.
- `POST /api/auth/logout`.

### Fase 4 — Funil + webhooks
- `src/lib/entitlements.ts`: `hasActiveEntitlement`, `grantEntitlement`,
  `revokeEntitlement`.
- `src/lib/payment-handler.ts`: `handlePayment(event: PaymentEvent)` —
  idempotência por `platformTransactionId`, resolve `Product`, upsert
  `User`, adota `Assessment` órfão por e-mail, cria `Order`,
  concede/revoga `Entitlement`, resolve trilha do desafio pelo
  `nivelGlobal`. Magic link fica como `console.log` (no-op) nesta fase.
- `POST /api/webhooks/kiwify`, `POST /api/webhooks/hotmart`: verificam
  segredo, normalizam payload pra `PaymentEvent`, chamam `handlePayment`.
- `POST /api/checkout/simulate` (só quando `DEMO_MODE=true`): monta um
  `PaymentEvent` fake `PAID` e chama a mesma `handlePayment`. Botão
  "Simular pagamento aprovado" em `CheckoutReportView` e
  `ChallengeOfferView`.
- Seed do catálogo `Product` (3 produtos: acesso-relatório, desafio-7-dias,
  1 bump fictício).

### Fase 5 — Desafio real + mídia
- Seed das 3 `ChallengeTrack` completas a partir de
  `seeds/desafio-track-{baixa,moderada,alta}.json`.
- Migração de mídia Drive→R2 usando `seeds/midia-manifesto.csv` e
  `seeds/aulas-manifesto.csv` — **bloqueado por dependência #2**.
- `ChallengePlayerView` passa a consumir dado real, com
  `ChallengeProgress.lastSeenOrdem` pra retomar sem reiniciar o player.
- `POST /api/challenge/complete-day`: grava `dayCompletions[day].completedAt`.

### Fase 6 — Wiring das telas + seed fictício
- Todas as 11 telas trocam fixture por Server Component com Prisma real.
- `prisma/seed.ts` (`npm run db:seed`, idempotente): catálogo de produtos,
  `ScoreRule`, `PillarMessage`, as 3 trilhas, e a **usuária showcase**
  (nível Moderada, `Entitlement REPORT`+`CHALLENGE` ativos,
  `ChallengeProgress` com dias 1–3 concluídos e dia 4 liberado).
- Fluxo a frio (quiz ao vivo) não depende de seed — é o produto rodando.

### Fase 7 — Docker + deploy
- `Dockerfile` multi-stage (`deps` → `builder` com `prisma generate` +
  `next build` standalone → `runner` `node:20-alpine`).
- Entrypoint roda `npx prisma migrate deploy && node server.js`.
- `.dockerignore`: `node_modules`, `.next`, `.git`, `.env*`, `docs/`,
  `seeds/*.csv`.
- `GET /api/health` simples pro health check do EasyPanel.
- Documentar variáveis de ambiente pra colar no EasyPanel.

## Variáveis de ambiente

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
APP_BASE_URL=
```

## Erros e casos de borda

- Webhook com `platformTransactionId` repetido → retorna 200 sem
  reprocessar (idempotência), conforme `docs/03`.
- Login fake com e-mail inexistente → mensagem de erro, sem criar conta
  (evita confundir com fluxo de compra real).
- Acesso a `/relatorio` ou `/desafio` sem entitlement ativo → redireciona
  para a oferta correspondente, nunca 500/crash.
- `isDayUnlocked`/`hoursUntilUnlock` já existentes em
  `challenge-gating.ts` não mudam — só passam a rodar sobre
  `ChallengeProgress` real em vez de fixture.

## Testes

- `src/lib/scoring.ts` — testes unitários via `tsx` cobrindo os cortes de
  nível global e por pilar (já é convenção do repo, sem runner formal).
- `src/lib/payment-handler.ts` — teste de idempotência (mesmo
  `transactionId` duas vezes não duplica `Order`/`Entitlement`).
- `challenge-gating.ts` já tem lógica testável, sem mudança.
- Verificação manual do fluxo completo no navegador antes de considerar
  cada fase pronta (quiz → relatório → desafio → docker build local).
