# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Mapa da Fertilidade — Contexto raiz (CLAUDE.md)

> Arquivo de contexto para sessões de Claude Code. Leia este arquivo primeiro,
> depois o doc específico do que for trabalhar em `docs/`.

## Comandos

```bash
npm run dev             # servidor Next.js em http://localhost:3000
npm run build           # build de produção (checa tipos + compila)
npm run lint            # ESLint (eslint-config-next)
npm start                # serve o build de produção
npx prisma migrate dev   # roda migrations pendentes
npx prisma studio        # inspeciona o banco local
npm run db:seed          # roda prisma/seed.ts
npx tsx <arquivo>        # executa scripts TypeScript avulsos (seeds, migrations de dados, testes)
```

Não há `jest`/`vitest` no `package.json`. Testes de lógica pura (`src/lib/*.test.ts`, ex.
`scoring.test.ts`, `challenge-stepper.test.ts`, `report-assembly.test.ts`) usam apenas
`node:assert/strict` em blocos soltos e rodam direto com `npx tsx src/lib/<arquivo>.test.ts` —
não há test runner nem watch mode, cada arquivo é um script que lança se um `assert` falhar.

Páginas de preview para testar as telas já portadas sem banco:
- `http://localhost:3000/preview/relatorio` — ReportView com fixture de 13 pilares
- `http://localhost:3000/preview/desafio` — ChallengePlayerView com seed da trilha Moderada

## O que este produto é (em uma frase)

Uma **plataforma de conteúdo gated por entitlement** com um **funil de captação
na frente**: a mulher faz um quiz de fertilidade, recebe um relatório
personalizado após pagar, e pode comprar um desafio de 7 dias (e order bumps)
que rodam dentro do app.

A primitiva central: **toda compra dispara um webhook, e o webhook concede um
`Entitlement`.** Relatório, desafio e cada order bump são todos a mesma coisa —
um produto que a usuária tem direito (ou não) a acessar. Adicionar um order bump
novo é trabalho de *cadastro de produto*, não de código.

## Produtos (o que se vende)

| Produto | Preço | O que libera |
| --- | --- | --- |
| Acesso + Relatório | R$ 49,90 | Conta no app + relatório completo do assessment |
| Desafio 7 dias | R$ 197,90 | Trilha do desafio (segmentada pelo nível da usuária) |
| Order bumps | variável | Conteúdos extras, comprados no checkout OU dentro do app |

## Decisões de arquitetura já tomadas

1. **Pagamento: Kiwify + Hotmart (buy, não build).** O app NÃO processa cartão.
   Cada produto é um produto na plataforma com seu link de checkout. Compra =
   redirect/webview pro checkout → webhook → app libera. Inclusive as compras
   *dentro* do app (desafio, bumps posteriores) passam pelo checkout da
   plataforma — não há one-tap nativo nesta versão.
2. **Duas portas de captação, mesmo destino.** (A) Typebot existente faz o quiz
   e envia o resultado pro app via HTTP; (B) quiz nativo no app em sessão
   anônima. Ambas criam um `Assessment` pela mesma ingestão. O relatório só
   libera após o pagamento em qualquer um dos dois caminhos.
3. **Fase anônima é de primeira classe.** No caminho nativo, a usuária faz o
   quiz sem conta. O `Assessment` nasce órfão (sem `userId`) e é **adotado** pelo
   webhook de pagamento, casando por e-mail/CPF.
4. **Auth por magic link** (e-mail). A conta nasce atrelada à compra.
5. **Conteúdo é dado, não código.** Regras de score, textos do relatório e o
   roteiro dos 7 dias vivem no banco. A expert atualiza sem redeploy.
6. **Desafio é um roteiro tipo WhatsApp**, segmentado por nível de fertilidade
   (trilhas Baixa/Moderada/Alta), com gating híbrido (concluído + cooldown).

## Stack

- **Full-stack:** Next.js 16 (App Router) como monolito — route handlers / server
  actions no back-end. Sem Spring Boot separado para este porte.
- **Banco:** PostgreSQL (EasyPanel na VPS Hostinger), via Prisma (`prisma/schema.prisma`, migrations em `prisma/migrations/`).
- **Mídia:** Cloudflare R2 (áudios/imagens do desafio).
- **Deploy:** GitHub Actions → VPS Hostinger.
- **DNS/cache:** Cloudflare.
- **Auth:** magic link por e-mail.
- **Animações:** `motion` (Framer Motion v12).

## Estrutura de código

```
src/
  app/              # Next.js App Router — páginas e route handlers
    preview/        # Páginas de dev sem banco (não fazer deploy de produção dessas)
    globals.css     # Design tokens (Tailwind v4 @theme) + utilitários
  components/
    screens/        # Telas completas (ReportView, ChallengePlayerView)
    ui/             # Primitivos reutilizáveis (PillarLevelBadge, ScoreRing, ChallengeMessageBubble)
  lib/              # Lógica pura sem dependência de framework
    challenge-gating.ts   # isDayUnlocked / hoursUntilUnlock / isDayCompleted
    quiz-sections.ts       # Agrupa perguntas do quiz em capítulos por pilar
    useQuizPersistence.ts  # Retomada do quiz via localStorage (docs/07)
  types/            # Contratos de domínio (assessment.ts, challenge.ts)
seeds/              # Dados iniciais (JSON das trilhas, CSVs de mídia)
docs/               # Especificações (leia antes de alterar domínio ou regras de negócio)
.claude/            # Skills, agents e comandos do Claude Code
```

O alias `@/` aponta para `src/` (configurado em `tsconfig.json`).

## Design system (Tailwind v4)

Tailwind v4 usa `@theme` no `globals.css` em vez de `tailwind.config.js`. Todos os tokens de cor estão lá:

- Nunca defina cores ad-hoc em componentes — use `var(--color-*)` via classes arbitrárias Tailwind (`bg-[var(--color-brand-terracota)]`) ou direto em `style`.
- Fontes: `font-sans` → DM Sans, `font-serif` → Literata (serifada italic para headings).
- Palette: cream (`#FAF6F1`), terracota (`#C2795F`), sage (`#8DA290`), gold (`#C9A24B`), brown (`#2E2620`).

## Estado atual do código

O funil completo está implementado e rodando com dados reais (nada mockado
fora de `/preview/*`). As 10 telas do protótipo original do AI Studio estão
todas portadas em `src/components/screens/`, cada uma com rota real em
`src/app/`:

| Tela | Componente | Rota |
| --- | --- | --- |
| Boas-vindas | `WelcomeView` | `/welcome` |
| Quiz | `QuizFlow` / `QuizQuestionView` | `/quiz` |
| Captura de contato | `CaptureView` | `/captura` |
| Resultado teaser | `ResultTeaserView` | `/resultado` |
| Dashboard | `DashboardView` | `/dashboard` |
| Relatório | `ReportView` | `/relatorio` |
| Checkout do relatório | `CheckoutReportView` | `/checkout` |
| Oferta do desafio | `ChallengeOfferView` | `/desafio/oferta` |
| Trilha/timeline do desafio | `ChallengeTimelineView` | `/desafio` |
| Player do desafio (formato de aula, com checklist interativa) | `ChallengePlayerView` | `/desafio/[dia]` |
| Dia concluído | `ChallengeCompleteView` | `/desafio/[dia]/concluido` |

Gating do desafio é testável em `src/lib/challenge-gating.ts`. Auth por magic
link (login sem senha) em `/login`. `DEMO_MODE=true` habilita um botão
"[Demo] Simular pagamento aprovado" no checkout e na oferta do desafio, já
que o checkout real da Kiwify ainda não está conectado (links são
placeholder).

Páginas em `src/app/preview/` continuam existindo para iterar em uma tela
isolada sem precisar de banco/login — não são o funil de produção.

## Origem do design visual

A direção visual (creme/terracota/sálvia/dourado, serifa Literata + DM Sans,
estilo wellness acolhedor) foi validada num protótipo do Google AI Studio
antes de entrar no código de produção. As 10 telas do protótipo já foram
todas portadas (ver tabela acima) — o protótipo permanece só como referência
histórica de onde o visual veio.

## Mapa dos docs

- `docs/01-dominio-e-modelo.md` — entidades, ERD, ciclo de vida do entitlement.
- `docs/02-motor-de-score.md` — cálculo do assessment (13 pilares, fórmula, cortes).
- `docs/03-funil-e-webhooks.md` — as duas portas, checkout, contrato de webhook.
- `docs/04-motor-do-desafio.md` — trilhas, roteiro, gating híbrido, devolutiva, mídia.
- `docs/05-infra-e-deploy.md` — VPS, EasyPanel, R2, Cloudflare, CI/CD.
- `docs/06-relatorio-v2.md` — segunda versão do relatório (PDF, impressão).
- `docs/07-quiz-v2.md` — segunda versão do quiz nativo.
- `seeds/desafio-track-{baixa,moderada,alta}.json` — roteiro das 3 trilhas pronto pra seed.
- `seeds/midia-manifesto.csv` — áudios/imagens a migrar pro R2 (com flag de duplicado).
- `seeds/aulas-manifesto.csv` — 8 vídeos (boas-vindas + 7 aulas), compartilhados entre trilhas.
- `.claude/` — config do Claude Code: skills, comandos e subagentes.

## Convenções

- Domínio e UI em **português**; código (identificadores, tabelas) em inglês.
- Nada de lógica de negócio "solta" em componentes: score e gating são funções
  puras testáveis (`/lib/scoring`, `/lib/challenge`).
- Webhook handlers são **idempotentes** (dedupe por id da transação) e tratam
  refund/chargeback revogando o entitlement.
- Server Component por padrão; adicione `'use client'` só onde há estado/interação real.
- Fixtures de preview em `src/app/preview/*/fixture.ts` nunca chegam a produção — são exclusivas das rotas `/preview/*`.
