# Operação real do Mapa da Fertilidade — Design

## Intenção

Levar o app do estado demonstrável para uma operação comercial real, em que
uma cliente consiga fazer o quiz, pagar pela Kiwify, receber acesso seguro por
magic link, consultar seu relatório e usar o desafio de 7 dias. O resultado
precisa ser reproduzível em produção, observável e documentado, sem depender
de `DEMO_MODE` ou de dados placeholder.

## Estado atual relevante

- O funil, o Checklist v2, o relatório, o desafio, o webhook Kiwify e o
  Dockerfile já existem.
- O login atual cria sessão diretamente a partir do e-mail informado.
- Os produtos seedados ainda usam `PLACEHOLDER-*` como identificadores e URLs.
- Não existe `MagicLinkToken`, rota de verificação ou integração com n8n.
- A migração de mídia Drive → R2 foi executada segundo o handoff anterior,
  mas precisa ser revalidada no ambiente configurado para o lançamento.
- O PostgreSQL local não estava disponível na última auditoria; a validação
  integrada precisa ser repetida com o banco ativo.

## Critérios de sucesso

1. Uma cliente sem sessão pode solicitar login e só entra após abrir um link
   único, expirável e de uso único enviado pelo fluxo configurado.
2. O checkout de relatório e desafio aponta para produtos reais da Kiwify;
   nenhuma URL ou identificação `PLACEHOLDER-*` chega a produção.
3. O webhook Kiwify cria/atualiza pedido, entitlement e adoção do assessment
   de forma idempotente e continua respondendo mesmo se o serviço de e-mail
   estiver indisponível.
4. O app roda com migrations aplicadas, seed controlado, `DEMO_MODE=false`,
   URLs públicas de mídia configuradas e healthcheck operacional.
5. O fluxo completo é validado em navegador com banco real, incluindo compra
   simulada controlada, magic link, relatório, PDF/impressão e desafio.
6. A captura informa finalidade, consentimento e tratamento dos dados de saúde;
   a política de retenção e o canal de correção ficam documentados.
7. README, variáveis de ambiente, runbook e checklist de lançamento refletem
   o estado real do produto.

## Fora de escopo desta rodada

- Gateway de cartão próprio ou checkout dentro do app.
- Implementação Hotmart sem payload e contrato reais.
- Rate limiting e limpeza automática de tokens, já registrados como melhorias
  posteriores na spec de magic link.
- Comparação histórica entre assessments.
- Mudança nas regras clínicas do Checklist sem nova validação de conteúdo.

## Abordagens consideradas

### A. Hardening faseado por risco — escolhida

Separar em entregas independentes: autenticação/checkout, integração e banco,
produção/mídia, LGPD/documentação e validação final. Cada fase termina com
testes automatizados e um fluxo manual verificável.

É a abordagem escolhida porque pagamento e autenticação têm risco maior e
dependem de configuração externa; isolá-los reduz a chance de publicar um
produto que parece completo, mas não libera acesso corretamente.

### B. Grande rodada única

Alterar autenticação, seed, deploy, LGPD e documentação em uma única branch.
Tem menor custo de coordenação, mas torna regressões difíceis de localizar e
mistura código com ações externas irreversíveis.

### C. Lançamento mínimo

Fechar apenas Kiwify, banco, login e deploy, deixando LGPD, mídia e docs para
depois. É mais rápido, mas não satisfaz o objetivo de operação 100% pronta e
mantém riscos conhecidos de conformidade e manutenção.

## Arquitetura proposta

### 1. Acesso seguro

Adicionar `MagicLinkToken` ao Prisma. O token bruto só aparece no link; o
banco armazena HMAC-SHA256 com `SESSION_SECRET`, validade de 24 horas e
`usedAt`. `/api/auth/login` passa a emitir o token e retornar estado “confira
seu e-mail”; `/api/auth/verify` valida, consome o token e cria a sessão.

`sendMagicLink(userId)` grava o token e chama
`N8N_MAGIC_LINK_WEBHOOK_URL` com e-mail, nome e URL absoluta. Falha no n8n é
registrada, mas não interrompe o webhook de pagamento.

### 2. Catálogo e pagamento

O seed deve atualizar `platformProductId` e `checkoutUrl`. Os valores reais
ficam em configuração controlada ou no seed conforme a decisão operacional,
sem placeholders. A rota de simulação permanece disponível apenas quando
`DEMO_MODE=true`; produção deve recusá-la.

### 3. Operação e deploy

Manter Next.js standalone + Prisma migrations no startup. Documentar todas as
variáveis de runtime e de migração, healthcheck, rollback e seed controlado.
CI/CD pode ser adicionado depois do primeiro deploy manual validado, mas o
runbook deve deixar claro o estado de cada etapa.

### 4. Dados sensíveis

Adicionar consentimento explícito na captura, finalidade em linguagem clara,
link/texto de privacidade, canal de correção e política de retenção definida
para assessments e respostas. O texto clínico continua separado do código.

## Fases de entrega

1. **Magic link:** schema, migration, serviço, rotas, UI, testes de token e
   integração com `payment-handler`.
2. **Checkout real:** catálogo sem placeholders, seed idempotente, proteção de
   demo e teste do webhook/entitlement.
3. **Ambiente real:** Postgres, migrations, seed controlado, R2, Docker,
   healthcheck e variáveis de produção.
4. **LGPD e conteúdo operacional:** consentimento, retenção, correção,
   documentação e revisão dos textos com a responsável pelo conteúdo.
5. **Validação de lançamento:** navegador + banco real, compra, login,
   relatório, PDF, mídia e desafio; depois lint, build, testes e checklist.

## Pendências externas que não podem ser resolvidas só no código

- URLs e `platformProductId` reais dos produtos Kiwify.
- `KIWIFY_WEBHOOK_SECRET` de produção.
- URL e workflow n8n para envio de e-mail.
- `APP_BASE_URL` definitivo.
- Credenciais e domínio público do R2.
- Política de retenção e texto jurídico aprovados pela responsável.
- Acesso ao painel Kiwify/EasyPanel para configurar webhook e deploy.

## Evidências exigidas antes de considerar concluído

- `npm run lint`, `npm run build` e todos os testes de domínio verdes.
- `npx prisma validate` e `npx prisma migrate status` com banco acessível.
- Teste de token válido, expirado e reutilizado.
- Teste de webhook idempotente, pagamento e revogação.
- Teste manual ponta a ponta em ambiente com banco real.
- `DEMO_MODE=false` confirmado no ambiente de produção.
- Nenhum `PLACEHOLDER-*` no catálogo ou nas rotas de produção.
- Runbook e README alinhados ao comportamento implantado.
