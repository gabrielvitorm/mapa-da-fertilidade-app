# 05 — Infra e deploy

## Topologia

```
Cloudflare (DNS + cache + WAF)
   │
   ▼
VPS Hostinger ── EasyPanel
   ├─ App Next.js (container)
   └─ PostgreSQL (container/managed no EasyPanel)

Cloudflare R2 ── mídia do desafio (áudios/imagens)
GitHub Actions ── CI/CD → deploy na VPS
Kiwify / Hotmart ── checkout + webhooks → /api/webhooks/*
```

## App

- Next.js (App Router) como monolito full-stack. Um container so.
- Build de producao via `Dockerfile` multi-stage com `output: "standalone"` do
  Next.js.
- Runtime esperado: Node 20 Alpine, `PORT=3000`, `HOSTNAME=0.0.0.0`.
- No EasyPanel, configure o servico app como Dockerfile app, nao como compose:
  - Build path: `.`
  - Dockerfile: `Dockerfile`
  - Porta interna/exposed port: `3000`
  - Healthcheck path: `/api/health`
- Nao use `ports:` ou published host port para o app. O dominio/proxy do
  EasyPanel deve rotear para a porta interna `3000` do container.
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

## Banco

- PostgreSQL no EasyPanel. Migrations versionadas (Prisma/Drizzle — escolher).
- Seeds:
  - `seeds/desafio-track-baixa.json` → popular `ChallengeTrack/Day/Message`.
  - Catálogo de `Product` (acesso-relatorio, desafio-7-dias, bumps) com os
    `platformProductId` e `checkoutUrl` reais da Kiwify/Hotmart.
  - `pillar_messages` (os 13×3 textos do relatório, extraídos do Typebot).

## R2 (mídia)

- Bucket único, prefixos por trilha: `desafio/baixa/...`, `desafio/moderada/...`.
- Servir por domínio próprio no Cloudflare (ex.: `cdn.seudominio.com`) apontando
  pro bucket, com cache agressivo (mídia é imutável — use hash/versão na key se
  precisar invalidar).
- Migração inicial: `seeds/midia-manifesto.csv` (Drive → R2).

## Cloudflare

- DNS gerenciado aqui.
- Proxy (laranja) ligado no app e no CDN de mídia.
- Cache: estático e mídia agressivo; rotas de API e webhook **sem cache**.
- Regra: não cachear `/api/*`.

## CI/CD (GitHub Actions)

Pipeline sugerido:
1. `lint` + `typecheck` + `test` (inclui testes do motor de score e do gating).
2. `build` (imagem Docker).
3. `deploy` na VPS (push da imagem + restart via EasyPanel, ou webhook de deploy
   do EasyPanel).
4. `migrate` (rodar migrations antes de subir a nova versão).

Cuidados:
- Webhooks de pagamento **não podem** cair durante o deploy — EasyPanel com
  health check + zero-downtime, ou fila/retry do lado da plataforma cobre.
- Segredos no GitHub Actions (Environments), nunca no repo.

Estado atual da Fase 7: o repositorio entrega Dockerfile e healthcheck para
deploy manual no EasyPanel. GitHub Actions, registry de imagem e webhook de
deploy continuam fora de escopo ate a definicao do fluxo de publicacao.

## Domínios

- App: `app.seudominio.com` (ou raiz).
- Mídia: `cdn.seudominio.com` → R2.
- Webhooks: `app.seudominio.com/api/webhooks/{kiwify,hotmart}` — cadastrar essas
  URLs no painel de cada plataforma.
