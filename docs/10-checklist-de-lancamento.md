# Checklist de lançamento

Este documento é executado depois que os acessos ao PostgreSQL, EasyPanel,
Kiwify, n8n e R2 estiverem disponíveis. Não coloque secrets no repositório.

## Estado técnico atual

O código, migrations, seed idempotente, imagem Docker, CI, preflight e smoke
test local já foram validados. Este documento ainda não está concluído porque
os valores reais de produção, integrações externas, aprovação jurídica da
retenção LGPD e o smoke test comercial dependem do ambiente de lançamento.
O Next.js está na versão corrigida 16.4.5; o audit ainda reporta apenas a
dependência transitiva `deepmerge-ts` do Prisma 6, cuja correção automática
exigiria uma migração major para Prisma 7.

## 1. Configurar o ambiente

No EasyPanel, configurar:

```text
NODE_ENV=production
DEMO_MODE=false
DATABASE_URL=<postgres de produção>
SESSION_SECRET=<segredo longo e aleatório>
APP_BASE_URL=https://<dominio do app>
SUPPORT_EMAIL=<canal de suporte>
KIWIFY_WEBHOOK_SECRET=<segredo do painel Kiwify>
KIWIFY_REPORT_PRODUCT_ID=<id real>
KIWIFY_REPORT_CHECKOUT_URL=https://pay.kiwify.com.br/<checkout real>
KIWIFY_CHALLENGE_PRODUCT_ID=<id real>
KIWIFY_CHALLENGE_CHECKOUT_URL=https://pay.kiwify.com.br/<checkout real>
N8N_MAGIC_LINK_WEBHOOK_URL=https://<n8n>/webhook/<rota>
R2_ACCOUNT_ID=<conta>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret key>
R2_BUCKET=<bucket>
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://<cdn>
```

Executar localmente com os mesmos valores (sem exibir o conteúdo):

```bash
npm run preflight:production
```

Resultado esperado: `Production preflight passed`.

## 2. Deploy e banco

1. Publicar a imagem com o `Dockerfile`.
2. Confirmar que o container executa `prisma migrate deploy` antes de iniciar.
3. Verificar `GET /api/health` retornando JSON com `status: ok` e
   `dependencies.database: ok`.
4. Executar o seed uma vez, em janela controlada: `npm run db:seed`.
5. Confirmar que o seed não criou a usuária showcase e que os dois produtos
   têm IDs/URLs reais.

## 3. Kiwify e n8n

1. Cadastrar `https://<dominio>/api/webhooks/kiwify` no painel Kiwify.
2. Configurar o segredo exatamente igual a `KIWIFY_WEBHOOK_SECRET`.
3. Configurar o n8n para receber `email`, `nome` e `magicLinkUrl` e enviar o
   e-mail sem registrar o token em logs públicos.
4. Testar uma compra de baixo risco ou o evento de teste oficial da Kiwify.
5. Confirmar no banco: `User`, `Order`, `Entitlement` e `MagicLinkToken`.

## 4. Smoke test manual

- Abrir `/welcome` e concluir a captura aceitando a política.
- Responder o quiz e confirmar o teaser.
- Confirmar que `/checkout` aponta para a URL real do relatório.
- Concluir uma compra e aguardar o webhook.
- Solicitar login e abrir o magic link recebido.
- Reabrir o mesmo link e confirmar `/login?error=invalid_token`.
- Abrir `/relatorio` e `/relatorio/imprimir`.
- Abrir `/desafio`, reproduzir uma mídia e concluir um dia.
- Confirmar gating e persistência da checklist do desafio.
- Abrir `/privacidade` e testar o canal de suporte exibido.

## 5. Rollback

Se o healthcheck falhar ou o webhook retornar erro:

1. manter a versão anterior da imagem disponível;
2. não apagar migrations nem dados;
3. reverter a imagem no EasyPanel;
4. investigar logs do container e do webhook;
5. repetir o smoke test antes de reabrir o tráfego.

## Evidências para registrar

- URL e data do healthcheck.
- Resultado do preflight sem secrets.
- Migration listada como aplicada.
- IDs dos pedidos de teste e status dos entitlements.
- Confirmação de uso único do magic link.
- URLs públicas R2 retornando HTTP 200 e `Content-Type` correto.
- Registro do smoke test completo.
