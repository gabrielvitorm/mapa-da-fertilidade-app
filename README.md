# Mapa da Fertilidade

App do funil de fertilidade: quiz → relatório (após pagamento) → desafio de
7 dias e order bumps, dentro do app. Pagamento via Kiwify/Hotmart; acesso
liberado por webhook (entitlements).

## Stack

Next.js 16 (App Router) + Tailwind v4 + TypeScript. Design system migrado de
um protótipo validado no Google AI Studio (ver `CLAUDE.md`).

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` — a home tem links para as páginas de preview:

- `/preview/relatorio` — `ReportView` com os 13 pilares (dados de exemplo).
- `/preview/desafio` — `ChallengePlayerView` com o Dia 1 real da trilha
  Moderada, carregado direto de `seeds/desafio-track-moderada.json`.

## Estrutura

```
CLAUDE.md                      Contexto raiz para Claude Code (leia primeiro)
docs/                          Especificação completa do domínio
  01-dominio-e-modelo.md       Entidades, ERD, ciclo do entitlement
  02-motor-de-score.md         Cálculo do assessment (13 pilares)
  03-funil-e-webhooks.md       Duas portas de captação, checkout, webhooks
  04-motor-do-desafio.md       Trilhas, roteiro WhatsApp, gating, devolutiva
  05-infra-e-deploy.md         VPS/EasyPanel/Postgres, R2, Cloudflare, CI/CD
seeds/                         Conteúdo real das 3 trilhas + manifestos de mídia
.claude/                       Skills, agentes e comandos do Claude Code
src/
  app/                         Rotas (App Router)
    globals.css                Design tokens (cores, fontes)
    preview/                   Páginas de demonstração das telas portadas
  components/
    screens/                   Telas completas (ReportView, ChallengePlayerView)
    ui/                        Peças menores (ScoreRing, PillarLevelBadge, ...)
  lib/                         Lógica de domínio (gating, sequenciamento)
  types/                       Tipos do domínio (assessment, challenge)
```

## O que já está implementado

- Design system (cores, fontes) fiel ao protótipo aprovado.
- Tipos de domínio (`AssessmentResult`, `ChallengeDay`, etc.) alinhados aos docs.
- Gating híbrido do desafio (`src/lib/challenge-gating.ts`).
- Duas telas completas, orientadas a dados: `ReportView` e `ChallengePlayerView`.

## O que falta (próximos passos)

- Portar as 8 telas restantes do funil (welcome, quiz, capture, dashboard,
  checkout do relatório, oferta do desafio, trilha/timeline, dia concluído),
  seguindo o padrão das duas já feitas.
- Schema do banco (Prisma/Drizzle) a partir de `docs/01`.
- Handlers de webhook (`docs/03`) e motor de score real (`docs/02`).
- Upload real de devolutiva em áudio/foto (hoje só o texto está plugado).
- Migração de mídia do Drive para o R2 (`/migrar-midia`).

## Pendências de produto (TODO)

- Confirmar com a expert o denominador do score (285 vs soma dos máximos 291).
- Confirmar `cooldownHours` do gating (default sugerido: 20h).
- Cadastrar produtos na Kiwify/Hotmart e preencher `platformProductId`/`checkoutUrl`.
