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

- Next.js (App Router) como monolito full-stack. Um container só.
- Variáveis de ambiente (mínimas):
  - `DATABASE_URL`
  - `INGEST_TOKEN` (segredo do endpoint do Typebot)
  - `KIWIFY_WEBHOOK_SECRET`, `HOTMART_WEBHOOK_SECRET`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`
  - `MAGIC_LINK_SECRET`, `EMAIL_*` (provedor de e-mail transacional)
  - `APP_BASE_URL`

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

## Domínios

- App: `app.seudominio.com` (ou raiz).
- Mídia: `cdn.seudominio.com` → R2.
- Webhooks: `app.seudominio.com/api/webhooks/{kiwify,hotmart}` — cadastrar essas
  URLs no painel de cada plataforma.
