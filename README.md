# Mapa da Fertilidade

Aplicação do funil de fertilidade: captura → Checklist da Fertilidade → teaser → checkout → relatório personalizado → desafio de 7 dias. O acesso é liberado por entitlements recebidos via webhook da Kiwify.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Prisma 6 e PostgreSQL. Mídia pública do desafio é servida pelo Cloudflare R2; o envio de magic links pode usar n8n.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Para usar o banco local, configure `DATABASE_URL` e rode:

```bash
npx prisma migrate dev
npm run db:seed
```

O seed cria os produtos e as trilhas. A usuária showcase só é criada quando `DEMO_MODE=true`.

## Rotas principais

- `/welcome`, `/captura`, `/quiz`, `/resultado`: funil público.
- `/checkout`: oferta do relatório.
- `/login`: login por magic link.
- `/dashboard`, `/relatorio`, `/relatorio/imprimir`: área autenticada.
- `/desafio`, `/desafio/oferta`, `/desafio/[dia]`: desafio gated.
- `/privacidade`: informações operacionais de privacidade e tratamento de dados.
- `/preview/*`: telas isoladas sem dependência de sessão/banco.

## Comandos de verificação

```bash
npm run lint
npx tsc --noEmit
npm run build
for f in src/lib/*.test.ts; do npx tsx "$f" || exit 1; done
npx prisma validate
npm run preflight:production   # requer .env de produção preenchido
```

Os testes de domínio são scripts TypeScript independentes; não há Jest/Vitest configurado.

## Variáveis importantes

Consulte `.env.example`. Para operação real, são obrigatórias:

- `DATABASE_URL`, `SESSION_SECRET`, `APP_BASE_URL` e `SUPPORT_EMAIL`;
- `KIWIFY_WEBHOOK_SECRET`;
- `KIWIFY_REPORT_PRODUCT_ID`, `KIWIFY_REPORT_CHECKOUT_URL`;
- `KIWIFY_CHALLENGE_PRODUCT_ID`, `KIWIFY_CHALLENGE_CHECKOUT_URL`;
- `N8N_MAGIC_LINK_WEBHOOK_URL`;
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` e credenciais R2 quando houver mídia real.

`DEMO_MODE=true` deve ser usado somente em ambiente local/demonstração. Em produção, o seed falha se os produtos não tiverem configuração real e não cria a usuária demo.

`npm run preflight:production` valida o ambiente sem imprimir secrets e deve passar antes do deploy comercial.

## Produção

O [Dockerfile](Dockerfile) gera uma imagem standalone e executa `prisma migrate deploy` antes do servidor. O endpoint `/api/health` é o healthcheck do serviço.

Checklist externo antes do lançamento:

1. Configurar produtos e webhook no painel da Kiwify.
2. Configurar o workflow n8n para receber `email`, `nome` e `magicLinkUrl`.
3. Configurar Postgres, R2, domínio, secrets e `DEMO_MODE=false` no EasyPanel.
4. Validar login, compra, webhook, relatório, PDF, mídia e desafio em navegador.
5. Aprovar juridicamente a política de privacidade e o prazo de retenção.

## Documentação

- `docs/01-dominio-e-modelo.md` — domínio e modelo de dados.
- `docs/03-funil-e-webhooks.md` — captura, checkout e webhooks.
- `docs/05-infra-e-deploy.md` — infraestrutura e deploy.
- `docs/06-relatorio-v2.md` — relatório e PDF.
- `docs/07-quiz-v2.md` — capítulos, progresso e retomada.
- `docs/08-checklist-da-fertilidade.md` — regras do Checklist v2.
- `docs/10-checklist-de-lancamento.md` — sequência operacional de deploy e smoke test.
- `docs/superpowers/specs/2026-11-03-operacao-real-design.md` — critérios de operação real.
- `docs/superpowers/plans/2026-11-03-magic-link-checkout.md` — plano do bloco comercial.
