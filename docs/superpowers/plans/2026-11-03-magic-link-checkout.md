# Magic Link e Checkout Kiwify Real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o login demonstrativo e os produtos Kiwify placeholder por um fluxo seguro e configurável de compra → magic link → sessão.

**Architecture:** O token de magic link será gerado e persistido por um serviço de domínio, armazenando apenas HMAC no banco. Login e pagamento usarão o mesmo serviço; o envio externo para n8n será best-effort e nunca bloqueará o webhook de pagamento. O catálogo continuará no Prisma, mas seus identificadores e URLs serão lidos de variáveis de ambiente no seed para evitar placeholders commitados.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 6, PostgreSQL, `node:crypto`, route handlers e testes executados com `npx tsx`.

**Spec:** `docs/superpowers/specs/2026-11-03-operacao-real-design.md` e `docs/superpowers/specs/2026-07-17-checkout-real-magic-link-design.md`

## Global Constraints

- O token bruto só pode existir na URL; o banco armazena HMAC-SHA256 usando `SESSION_SECRET`.
- Tokens expiram em 24 horas, são de uso único e devem ser marcados como usados atomicamente.
- Falha de rede ou ausência do n8n apenas gera log e não falha o pagamento.
- `DEMO_MODE` continua permitindo o fluxo local, mas a simulação deve retornar 403 fora de `DEMO_MODE=true`.
- Nenhuma URL ou identificação `PLACEHOLDER-*` pode ser usada por produção.
- Não adicionar rate limiting ou limpeza periódica de tokens nesta etapa.
- Cada tarefa termina com teste próprio e uma execução da suíte existente.

## Review Focus

- Token válido, expirado e reutilizado: deve criar sessão apenas uma vez. Teste em Task 1.
- Dois tokens emitidos para a mesma pessoa: somente o token usado deve autenticar. Teste em Task 1.
- Falha no n8n: login/pagamento não pode falhar por causa do `fetch`. Teste em Task 3.
- Seed sem configuração real: desenvolvimento deve ser explícito e produção não pode gravar placeholders. Teste em Task 6.
- Login de e-mail inexistente e erro de token: não deve criar usuário nem sessão. Teste em Task 4.

### Task 1: Núcleo puro de tokens

**Files:**
- Create: `src/lib/magic-link-core.ts`
- Create: `src/lib/magic-link-core.test.ts`

**Interfaces:**
- Produces `createMagicToken(secret: string): { rawToken: string; tokenHash: string }`.
- Produces `hashMagicToken(rawToken: string, secret: string): string`.
- Produces `isMagicTokenExpired(expiresAt: Date, now?: Date): boolean`.
- Produces `MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000`.

- [ ] **Step 1: Escrever os testes falhando**

Testar hash determinístico, token bruto diferente do hash, validade por 24 horas e expiração quando `now >= expiresAt`.

- [ ] **Step 2: Rodar o teste e confirmar RED**

Run: `npx tsx src/lib/magic-link-core.test.ts`

Expected: falha porque `magic-link-core.ts` ainda não existe.

- [ ] **Step 3: Implementar o núcleo com `node:crypto`**

Usar `randomBytes` para o token bruto e `createHmac('sha256', secret)` para o hash.

- [ ] **Step 4: Rodar o teste e confirmar GREEN**

Run: `npx tsx src/lib/magic-link-core.test.ts`

Expected: todas as asserções passam.

- [ ] **Step 5: Commit**

```bash
git add src/lib/magic-link-core.ts src/lib/magic-link-core.test.ts
git commit -m "feat: add magic link token primitives"
```

### Task 2: Schema e migration do token

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_magic_link_token/migration.sql`

**Interfaces:**
- Produces Prisma model `MagicLinkToken` with `id`, `userId`, `tokenHash @unique`, `expiresAt`, `usedAt`, `createdAt` and relation to `User`.

- [ ] **Step 1: Adicionar o model e a relação `User.magicLinkTokens`**

Manter o padrão de relações e nomes já usado por `Session`.

- [ ] **Step 2: Gerar a migration**

Run: `npx prisma migrate dev --name add_magic_link_token`

Expected: tabela nova criada sem alterações destrutivas.

- [ ] **Step 3: Validar schema e client**

Run: `npx prisma validate`

Expected: schema válido.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: persist magic link tokens"
```

### Task 3: Serviço de emissão e envio

**Files:**
- Create: `src/lib/magic-link.ts`
- Create: `src/lib/magic-link.test.ts`

**Interfaces:**
- Produces `sendMagicLink(userId: string): Promise<void>`.
- Consumes `db.user`, `db.magicLinkToken`, `APP_BASE_URL`, `SESSION_SECRET` and optional `N8N_MAGIC_LINK_WEBHOOK_URL`.

- [ ] **Step 1: Escrever testes falhando**

Cobrir emissão persistida com hash e expiração, payload com `email`, `nome` e `magicLinkUrl`, e falha do webhook que resolve sem lançar.

- [ ] **Step 2: Rodar RED**

Run: `npx tsx src/lib/magic-link.test.ts`

Expected: falha por módulo ausente.

- [ ] **Step 3: Implementar emissão**

Criar token, salvar apenas o hash, montar URL com `encodeURIComponent`/`URLSearchParams`, chamar n8n com timeout de 5 segundos e registrar erro. Sem expor o token bruto em logs quando o n8n estiver configurado.

- [ ] **Step 4: Rodar GREEN e suíte**

Run: `npx tsx src/lib/magic-link.test.ts` e `for f in src/lib/*.test.ts; do npx tsx "$f" || exit 1; done`

Expected: testes novos e existentes passam.

- [ ] **Step 5: Commit**

```bash
git add src/lib/magic-link.ts src/lib/magic-link.test.ts
git commit -m "feat: emit and deliver magic links"
```

### Task 4: Rotas e tela de login

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/verify/route.ts`
- Modify: `src/app/login/page.tsx`
- Modify or Create: testes de comportamento do núcleo de verificação

**Interfaces:**
- `POST /api/auth/login` recebe `{ email }`, retorna 404 para usuário inexistente e `{ ok: true }` após emitir link.
- `GET /api/auth/verify?token=...` consome token válido e redireciona `/dashboard`; casos inválidos redirecionam `/login?error=invalid_token`.

- [ ] **Step 1: Escrever testes para consumo único e usuário inexistente**

Testar que token inválido/expirado/usado não cria sessão e que um token válido marca `usedAt` antes de criar sessão.

- [ ] **Step 2: Rodar RED**

Run: teste específico via `npx tsx`.

Expected: falha por rota/serviço ausente ou comportamento direto atual.

- [ ] **Step 3: Implementar verificação atômica**

Buscar pelo hash e atualizar `usedAt` apenas quando `usedAt IS NULL` e `expiresAt > now`, dentro de transação; só então chamar `createSession`.

- [ ] **Step 4: Alterar login e UI**

Remover login direto. Mostrar estado “Confira seu e-mail” e mensagem para `invalid_token`; não revelar se o e-mail existe além do contrato atual 404.

- [ ] **Step 5: Rodar testes, lint e build**

Run: `npm run lint && npm run build` e todos os testes de `src/lib`.

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth src/app/login/page.tsx src/lib
git commit -m "feat: secure login with one-time magic links"
```

### Task 5: Integrar magic link ao pagamento

**Files:**
- Modify: `src/lib/payment-handler.ts`
- Modify: `src/app/api/checkout/simulate/route.ts` only if required by tests

**Interfaces:**
- Consumes `sendMagicLink(user.id)` after a successful entitlement grant.
- Produces no payment failure when magic-link delivery fails.

- [ ] **Step 1: Adicionar teste de regressão**

Exercitar pagamento PAID com falha no envio e afirmar que order/entitlement continuam persistidos; testar que não envia em status não pago.

- [ ] **Step 2: Rodar RED**

Run: teste de pagamento específico.

Expected: falha porque o handler ainda não chama o serviço real.

- [ ] **Step 3: Integrar o serviço após concessão**

Preservar o comportamento do modo demo e garantir que a chamada best-effort não altere a resposta do webhook.

- [ ] **Step 4: Rodar suíte completa**

Run: todos os testes, lint e build.

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment-handler.ts src/app/api/checkout/simulate/route.ts
git commit -m "feat: send magic link after paid entitlement"
```

### Task 6: Remover placeholders do catálogo

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Create: `src/lib/product-config.test.ts` if needed for pure validation

**Interfaces:**
- Environment variables: `KIWIFY_REPORT_PRODUCT_ID`, `KIWIFY_REPORT_CHECKOUT_URL`, `KIWIFY_CHALLENGE_PRODUCT_ID`, `KIWIFY_CHALLENGE_CHECKOUT_URL`.

- [ ] **Step 1: Escrever teste/validador falhando**

Validar que configuração completa retorna valores reais e que valores contendo `PLACEHOLDER` são rejeitados quando `NODE_ENV=production`.

- [ ] **Step 2: Implementar configuração e corrigir upserts**

Trocar `update: {}` por atualização de nome/preço/configuração de plataforma conforme apropriado; em desenvolvimento sem variáveis, permitir fallback explícito apenas se `DEMO_MODE=true`.

- [ ] **Step 3: Atualizar `.env.example` e README**

Documentar as quatro variáveis, `N8N_MAGIC_LINK_WEBHOOK_URL`, `APP_BASE_URL` e `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`.

- [ ] **Step 4: Rodar teste, lint e build**

Expected: nenhum placeholder usado pelo runtime de produção e todas as validações verdes.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts .env.example README.md src/lib
git commit -m "fix: configure real Kiwify catalog products"
```

### Task 7: Verificação do bloco comercial

**Files:** nenhum novo; scripts temporários fora do commit quando necessários.

- [ ] **Step 1: Subir Postgres local e aplicar migration**

Run: `npx prisma migrate status` e `npm run db:seed`.

- [ ] **Step 2: Executar fluxo de login**

Solicitar login, recuperar token do banco local, abrir URL, confirmar dashboard e confirmar que reutilizar o token redireciona para erro.

- [ ] **Step 3: Executar fluxo de pagamento**

Usar simulação apenas com `DEMO_MODE=true`, confirmar entitlement e emissão de novo token; confirmar 403 quando `DEMO_MODE=false`.

- [ ] **Step 4: Verificar catálogo**

Inspecionar `/checkout` e `/desafio/oferta`; confirmar URLs configuradas e ausência de `PLACEHOLDER`.

- [ ] **Step 5: Rodar validação final**

Run: `npm run lint`, `npm run build`, `npx prisma validate` e todos os testes.

Expected: bloco comercial pronto para receber configuração real externa.

## Gaps assumidos após este plano

Este plano não configura credenciais reais, painel Kiwify, workflow n8n ou
EasyPanel. Essas ações exigem acesso externo e serão executadas no plano de
ambiente/deploy depois que o código deste bloco estiver validado.
