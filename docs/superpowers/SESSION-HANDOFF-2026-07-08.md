# Handoff de sessão — 2026-07-08

> Documento de continuidade. Se você é um agente novo pegando este projeto,
> leia isto primeiro, depois `CLAUDE.md` na raiz, depois o plano da fase em
> andamento (linkado abaixo) antes de tocar em qualquer código.

## Onde as coisas estão agora

- **Branch atual:** `feature/fase-6-wiring-telas-seed`, checkout ativo.
- **Working tree:** limpo, nada staged, nada não commitado. Último commit: `cd030e1`.
- **Master:** contém até o fim da Fase 5b (migração de mídia). A Fase 6 **ainda
  não foi mergeada** — está pronta pra isso, só falta 1 correção cosmética
  opcional (ver "Próximo passo imediato" abaixo) e depois a pergunta padrão de
  merge ao usuário.
- **Docker Postgres:** container `mapa-fertilidade-app-postgres-1` rodando,
  porta host `5433`. Não precisa subir de novo.
- **Servidor de dev:** parado (nenhuma instância minha rodando). Se a porta
  3000 estiver ocupada ao retomar, é provavelmente o usuário — pergunte antes
  de matar o processo.

## Próximo passo imediato

O review final da Fase 6 (rodado com opus, aprovado, "Ready to merge: Yes")
encontrou 2 achados **Minor** (nenhum bloqueante):

1. **`seeds/midia-manifesto.csv` ainda lista imagens como `.jpg`** — o
   manifesto não foi atualizado quando `.jpg`→`.png` foi corrigido nos JSONs
   de seed (commit `cd030e1`, ver "O que foi feito na Fase 6" abaixo). Não é
   bug funcional (o script de migração já re-detecta a extensão real e
   confere todas as variantes antes de decidir baixar de novo), só deixa o
   manifesto inconsistente com a realidade do bucket. **Eu estava no meio
   dessa correção quando a sessão foi interrompida** — rodei
   `grep -c '\.jpg,' seeds/midia-manifesto.csv` e confirmei 26 ocorrências,
   mas não cheguei a aplicar o `sed`. Pra fechar (mesmo padrão já usado no
   commit `3beeea8` pro fix equivalente de áudio):
   ```bash
   sed -i 's/\.jpg,/\.png,/g' seeds/midia-manifesto.csv
   git add seeds/midia-manifesto.csv
   git commit -m "docs: correct midia-manifesto.csv r2Key extensions from .jpg to .png"
   ```
   Confirme com `grep -c '\.jpg,' seeds/midia-manifesto.csv` (deve dar 0) e
   `grep -c '\.png,' seeds/midia-manifesto.csv` antes de commitar.

2. **Texto de encorajamento do `ChallengeCompleteView` é hardcoded no
   componente** (`ENCOURAGEMENT_BY_DAY`), não vem do banco. Pré-existente
   (componente já existia desde a Fase 5, só foi ligado a uma rota real
   agora), fora de escopo da Fase 6, sem ação necessária agora — só fica
   registrado como possível item de backlog se algum dia o conteúdo do
   desafio for todo migrado pro banco.

**Depois de decidir sobre o achado #1** (aplicar ou pular), o passo seguinte é
perguntar ao usuário o que fazer com a branch `feature/fase-6-wiring-telas-seed`
(merge local / manter / descartar — sempre pergunte, nunca faça merge sem
confirmação explícita). Se merge: `git checkout master && git merge
feature/fase-6-wiring-telas-seed --no-edit && git branch -d
feature/fase-6-wiring-telas-seed`.

## Fases já completas (mergeadas em `master`)

Todas seguiram o mesmo processo: brainstorm → plano em
`docs/superpowers/plans/` → execução via subagent-driven-development (task
por task, cada uma com implementer + review independente) → review final de
branch inteira (modelo opus) → pergunta ao usuário sobre merge → merge local.

1. **Fase 1 — Fundação**: schema Prisma completo (15 models, 10 enums),
   Postgres via Docker Compose (porta 5433 — porta 5432 já ocupada por outro
   projeto local), `src/lib/db.ts`.
2. **Fase 2 — Motor de score + quiz nativo**: conteúdo real do quiz (41
   perguntas, 13 pilares, extraído do Typebot real —
   `prisma/seed-data/quiz-source.json`), `src/lib/scoring.ts` +
   `scoring-answers.ts` (funções puras, testadas), rotas `/welcome`,
   `/captura`, `/quiz`, `/resultado`, `/checkout`.
3. **Fase 3 — Auth demo**: sessão via cookie HMAC-SHA256 (`src/lib/auth.ts`),
   `/login`, `/dashboard`, usuária demo Carolina Palitot
   (`carolinapalitot20@gmail.com`) seedada.
4. **Fase 4 — Funil + webhooks**: `Entitlement`/pagamento
   (`src/lib/payment-handler.ts`), webhook real da Kiwify (HMAC-SHA1 via query
   param `?signature=`, payload real arquivado em
   `docs/reference/kiwify-webhook-exemplo.json`), idempotência por
   `` `${order_id}:${webhook_event_type}` `` (Kiwify reenvia o mesmo
   `order_id` em mudança de status — chave só por `order_id` perderia
   revogação em reembolso), simulação de compra em modo demo
   (`POST /api/checkout/simulate`).
5. **Fase 5 — Desafio de 7 dias**: roteiro real das 3 trilhas (seeds JSON),
   gating híbrido (`src/lib/challenge-gating.ts`, já existia desde antes —
   dia N+1 abre quando dia N concluído E cooldown passado), player estilo
   WhatsApp, `ChallengeProgress`, rotas `/desafio` e `/desafio/[dia]`.
6. **Fase 5b — Migração de mídia (Drive → R2)**: script
   `scripts/migrate-media.ts`, rodado de verdade contra o bucket R2 real
   (`mapa-da-fertilidade`) e o Google Drive real. **3 bugs reais descobertos
   só na execução ao vivo** (documentados em detalhe no ledger antigo, resumo
   aqui):
   - Google mudou o fluxo de confirmação de download de arquivo grande (agora
     é um `<form>` postando pra `drive.usercontent.google.com`, não mais um
     `confirm=TOKEN` na URL original).
   - **Todos os áudios são `.opus`, não `.mp3`** como o manifesto assumia — o
     `Content-Type` do Drive vinha genérico (`application/octet-stream`), só o
     `Content-Disposition` revelava a extensão real.
   - Bug de idempotência: a checagem de "já existe" usava a key do manifesto
     ANTES da correção de extensão, causando re-upload a cada execução pros
     arquivos que precisavam de correção.
   Tudo corrigido e reverificado contra o bucket real (idempotência
   confirmada: rodar de novo = 0 uploads).

## O que foi feito na Fase 6 (branch atual, aguardando merge)

Plano: `docs/superpowers/plans/2026-07-08-fase6-wiring-telas-seed.md`.
Ledger completo (todas as tasks, reviews, achados): `.superpowers/sdd/progress.md`.

**Contexto do porquê desta fase existir:** das 11 telas do funil original
(protótipo AI Studio), a maioria já tinha rota real com dados do Prisma desde
fases anteriores. Restavam 3 gaps concretos — componentes já existiam prontos
em `src/components/screens/` mas só eram usados em `/preview/*`:

1. **`ReportView`** (relatório completo, 13 pilares) — não tinha rota real
   nenhuma. `/dashboard` apontava pra `/relatorio`, que nunca existiu (link
   morto). Fix: `src/lib/report-assembly.ts` (função pura
   `buildAssessmentResult`, testada) + rota `/relatorio` + wrapper client
   `ReportClient.tsx`.
2. **`ChallengeOfferView`** (oferta do desafio) — nunca ligado. `/dashboard`
   linkava direto pro checkout externo cru do Kiwify, pulando a tela de venda
   bonita que já existia. Fix: rota `/desafio/oferta` (Server Component puro,
   sem wrapper — o componente não tem `'use client'`), rewiring de `/desafio`
   (redireciona pra cá em vez de `/dashboard` quando falta `Entitlement
   CHALLENGE`) e de `/dashboard` (link aponta pra cá; também passou a
   preencher `progressoDesafio` de verdade, que antes nunca era populado).
3. **`ChallengeCompleteView`** (celebração ao concluir um dia) — nunca ligado.
   Ao concluir um dia, o app pulava direto de volta pra `/desafio`, sem
   mostrar a tela de parabéns. Fix: rota `/desafio/[dia]/concluido` + wrapper
   client `ChallengeCompleteClient.tsx`; mudança de 1 linha em
   `ChallengePlayerClient.tsx` (`handleCompleteDay` agora navega pra essa
   rota nova em vez de `/desafio` direto).

**Seed da usuária showcase (Task 5):** a Carolina antes só tinha nível BAIXA e
`Entitlement REPORT`. Reescrito pra nível **MODERADA** (fórmula de seleção de
resposta verificada contra o banco real nesta sessão: ordenar opções por
`rawScore` crescente, pegar índice `floor(length * 0.5)` — dá
`resultadoFinal = 68.07`, margem confortável da fronteira 60), com
`Entitlement CHALLENGE` ativo e `ChallengeProgress` com dias 0-3 concluídos
(timestamps escalonados respeitando o cooldown de 20h da trilha Moderada) e
dia 4 liberado.

**Bug real encontrado pelo próprio usuário durante a verificação ao vivo (não
pela minha checklist):** ele testou o desafio no navegador e reportou "as
imagens não aparecem, o vídeo apareceu e o áudio também". Investiguei e achei
a causa raiz: **o mesmo tipo de bug do fix de áudio da Fase 5b, só que nunca
aplicado nas imagens** — os seeds ainda tinham `mediaKey` com `.jpg`, mas as
imagens foram re-subidas no R2 como `.png` durante a migração (mesma correção
automática de extensão real que pegou os áudios). Confirmado contra o bucket
real (`.jpg` → 404, `.png` → 200). Corrigido nos 3 JSONs de trilha, reseed
rodado, confirmado que MODERADA/68.07 não foi afetado. Commit `cd030e1`.

**Todos os 6 commits da branch** (do mais antigo pro mais novo):
```
fbbdcfb feat: add buildAssessmentResult pure function for the full report screen
c5c5a85 feat: wire /relatorio route with real data, gated by REPORT entitlement
aef2c24 feat: wire /desafio/oferta route; dashboard shows real challenge progress
a56966f feat: wire challenge-day-completion celebration screen
69d41c9 feat: seed showcase demo user with MODERADA level and active 7-day challenge
cd030e1 fix: correct challenge image mediaKey extensions from .jpg to .png
```

**Verificação ao vivo completa (rodada pelo controller, não por subagente —
subagentes em background não conseguem permissão interativa pra subir
servidor de dev nesta máquina):**
- Dashboard da Carolina mostra nível Raízes (Moderada) e "Dia 4 de 7 em
  andamento" com barra de progresso (não mais "Começar agora").
- `/relatorio` renderiza conteúdo real (200, contém labels reais de pilares).
- `/desafio` timeline: 4 dias "Concluído" (0-3), 1 "Continuar" (dia 4), 3
  "Bloqueado" (5-7).
- Concluir o dia 4 ao vivo → `/desafio/4/concluido` renderiza com
  `hoursUntilNextDay` correto (~20h, batendo com o cooldown real).
- Usuária de teste nova (só REPORT, sem CHALLENGE): `/desafio` redireciona
  corretamente pra `/desafio/oferta` (307); depois de simular a compra do
  desafio, `/desafio/oferta` redireciona de volta pra `/desafio` (sem loop).
- `/desafio/999/concluido` retorna 200 em vez de 404 (gap Minor já
  identificado e aceito na review da Task 4 — inacessível pelo fluxo real,
  já que só se chega lá com um `day.dayNumber` de verdade); `/desafio/abc/concluido`
  corretamente 404.
- `npm run build` limpo, todas as rotas novas confirmadas dinâmicas (`ƒ`).
- Estado da Carolina foi resetado via `npm run db:seed` depois do teste ao
  vivo (completar o dia 4 na verificação mudou o progresso dela; o reseed
  restaura o snapshot canônico "dia 4/7 liberado").

## Convenções e armadilhas já aprendidas (não redescobrir)

- **Nunca commitar com `Co-Authored-By: Claude`** — regra permanente do
  usuário, verificada em todo commit desta sessão via
  `git show -s --format="%B"`.
- **`tsx` sozinho não carrega `.env`** (diferente de `npm run dev`/`db:seed`,
  que passam por Next.js/Prisma que fazem isso por baixo dos panos). Pra
  rodar um script standalone com acesso a variáveis de ambiente:
  `node --env-file=.env node_modules/tsx/dist/cli.mjs script.ts` (o
  `node --env-file=.env npx tsx ...` não funciona direto por causa de como o
  `.bin/tsx` é um shim shell, não um `.mjs` puro).
- **Scripts standalone em `/tmp` não resolvem `node_modules`** — rode de
  dentro do diretório do projeto (ou copie o script temporário pra dentro de
  `scripts/` e apague depois).
- **Ações destrutivas em infra real (delete em massa no R2, etc.) são
  bloqueadas automaticamente** se o usuário não aprovou aquela ação
  específica — sempre peça confirmação explícita antes, mesmo que a ação
  anterior relacionada já tenha sido aprovada.
- **Background subagents não conseguem rodar servidor de dev** (permissão
  interativa) — verificação manual ao vivo é sempre tarefa do controller,
  com o usuário presente.
- **`.env` e `.env.example` são bloqueados pras minhas ferramentas
  (Read/Edit/Bash)** — sempre que precisar de uma variável nova lá, peça pro
  usuário editar manualmente.
- **Ao corrigir mediaKey de mídia por causa de extensão real ≠ assumida**:
  sempre atualizar em 3 lugares — os JSONs de seed (`seeds/desafio-track-*.json`),
  o manifesto CSV (`seeds/midia-manifesto.csv` / `seeds/aulas-manifesto.csv`,
  só pra manter documentação consistente, não é funcional) e rodar
  `npm run db:seed` de novo pra refletir no banco. **Aconteceu duas vezes
  nesta sessão** (áudio na Fase 5b, imagem na Fase 6) — se aparecer mídia
  quebrada de novo no futuro, é o primeiro lugar a checar.

## O que vem depois da Fase 6

Do design original (`docs/superpowers/specs/2026-07-07-app-demo-funcional-design.md`,
seção "Fases de implementação"):

- **Fase 7 — Docker + deploy**: `Dockerfile` multi-stage (`deps` → `builder`
  com `prisma generate` + `next build` standalone → `runner`
  `node:20-alpine`), entrypoint com `npx prisma migrate deploy && node
  server.js`, `.dockerignore`, `GET /api/health` pro EasyPanel, documentar
  env vars pra colar no EasyPanel. Ainda não tem plano escrito.

Também pendente, sem plano ainda (mencionado ao longo da sessão, não
bloqueante):
- Webhook da Hotmart — esperando o usuário mandar um payload real de exemplo
  (mesmo padrão usado pra desenhar o da Kiwify).
- `.env.example` está faltando `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` — baixa
  prioridade, bloqueado por permissão (não consigo editar `.env.example`
  diretamente).

Não pergunte ao usuário "o que vem depois" sem antes checar este documento —
a resposta mais provável é "Fase 7" ou fechar a Fase 6 primeiro.
