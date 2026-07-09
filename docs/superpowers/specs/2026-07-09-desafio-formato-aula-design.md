# Desafio 7 dias — de chat WhatsApp para formato de aula (stepper)

> Spec de design. Contexto: `docs/04-motor-do-desafio.md` (modelo atual do
> desafio). Não confundir com o formato de chat original — este documento
> descreve a substituição dele.

## Por que mudar

O desafio hoje reproduz um chat do WhatsApp: mensagens aparecem em sequência
com delay automático e um indicador "digitando…", simulando conversa em
tempo real. Como o desafio não roda mais dentro do WhatsApp, essa mecânica
perdeu o motivo de existir e não ajuda a reter a usuária — ela só espera.

Trocamos por um formato de aula/lição: cartão único por conteúdo, navegação
ativa (a pessoa decide o ritmo), sensação clara de progresso. Junto,
simplificamos a devolutiva (retorno da usuária ao final do dia) pra só
aceitar texto — hoje o modelo já suporta TEXTO/ÁUDIO/FOTO, mas só o botão de
texto funciona; áudio e foto ficam na tela sem fazer nada.

## Decisões

1. **Cada `ChallengeMessage` continua sendo uma unidade atômica** — nenhuma
   mudança no modelo de dados do desafio nem nos seeds das 3 trilhas (160
   mensagens). Só muda como elas são apresentadas: uma por vez, não a lista
   toda.
2. **Navegação é um stepper livre**: botões Voltar/Próximo. A pessoa pode
   revisitar qualquer passo já visto, mas só revela um passo novo por vez
   (não pula pra um passo nunca visto).
3. **Sem delay automático nem "digitando…"** — o ritmo é 100% controlado por
   quem está fazendo o desafio.
4. **`delayMs` continua no schema e nos seeds, mas para de ser lido** pela
   tela nova. Decisão explícita: não vale o retrabalho de tirar esse campo
   de 160 registros de conteúdo já validado pela expert só por limpeza.
5. **Devolutiva vira só texto.** Remove os tipos ÁUDIO/FOTO (nunca
   funcionaram de verdade) do banco e da tela — fica um campo de texto
   único, opcional, desacoplado da conclusão do dia (isso não muda:
   `docs/04` já definia devolutiva como algo que nunca trava o avanço).

## Fluxo (UX)

- **Header**: título do dia + barra de progresso fina + "Passo X de N".
- **Corpo**: um cartão por vez, ocupando a área principal.
  - `TEXTO`: corpo de texto normal, sem bolha/avatar de chat.
  - `IMAGEM`/`VIDEO`: mídia em destaque, grande.
  - `AUDIO`: player como já existe hoje (ícone play/pause + barra de
    progresso), só que centralizado no cartão em vez de dentro de um balão.
- **Rodapé**: botões **Voltar** / **Próximo** (Voltar desabilitado no
  primeiro passo).
- **Último passo**: rodapé troca para o botão **"Concluí o dia de hoje"** +
  campo de texto opcional ("Como foi o seu desafio hoje?"). As duas ações
  continuam independentes — concluir não exige devolutiva.
- **Retomada**: ao sair e voltar, abre no mesmo passo onde parou (mecanismo
  já existente via `lastSeenOrdem`, só muda o que dispara a atualização —
  antes era "quantas mensagens revelou pelo timer", agora é "índice do
  passo atual").

## Implementação técnica

**Hook novo — `useChallengeStepper`** (substitui `useMessageSequence`):
controla só o índice do passo atual, sem timer.
```ts
function useChallengeStepper(messages: ChallengeMessage[], initialIndex = 0) {
  // currentIndex, maxVisitedIndex (não deixa pular pra um passo nunca visto)
  // next(), previous(), canGoNext, canGoBack, isLastStep
}
```
`useMessageSequence.ts` e o `TypingIndicator` dentro de `ChallengePlayerView`
são removidos.

**`ChallengeMessageBubble` → conteúdo do passo**: mesma lógica por `tipo`
(TEXTO/AUDIO/IMAGEM/VIDEO), removendo o avatar/estilo bolha — vira um
componente de "conteúdo de passo" dentro do cartão de aula. Pode manter o
nome do arquivo ou renomear para refletir o novo papel (decisão de
implementação, sem impacto de produto).

**`ChallengePlayerView`**: perde a lista acumulada de mensagens + indicador
de digitação; ganha header com progresso, um passo por vez, rodapé
Voltar/Próximo. A lógica de "chegou no fim → mostra concluir + devolutiva"
continua igual, só que disparada por `isLastStep` do stepper em vez de
`isComplete` do sequenciador por delay.

**`ChallengePlayerClient`**: `onProgressChange` passa a receber o índice do
passo atual em vez da contagem de mensagens reveladas pelo timer — mesmo
campo `lastSeenOrdem` no banco, sem mudança de contrato na API
(`/api/challenge/progress`).

**Devolutiva — simplificação do schema:**
```prisma
model Devolutiva {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  dayNumber Int
  texto     String
  createdAt DateTime @default(now())
}
```
Remove o enum `DevolutivaTipo` e os campos `tipo`/`mediaUrl`; `conteudo` vira
`texto` (obrigatório — sem texto não existe devolutiva, mesma checagem que já
existe hoje no botão "Salvar"). Nova migration Prisma.

Arquivos afetados pela simplificação de devolutiva:
- `prisma/schema.prisma` (model + remoção do enum)
- nova migration em `prisma/migrations/`
- `src/lib/challenge-service.ts` (`SubmitDevolutivaInput`, `submitDevolutiva`)
- `src/app/api/challenge/devolutiva/route.ts`
- `src/types/challenge.ts` (`DevolutivaInput`, remoção de `DevolutivaTipo`)
- `src/components/screens/ChallengePlayerView.tsx` (remove botões
  Áudio/Foto, `DevolutivaButton` de ícone único ou remove o seletor de tipo
  por completo já que só resta uma opção)
- `src/app/preview/desafio/page.tsx` (fixture/callback da devolutiva)
- `docs/01-dominio-e-modelo.md`, `docs/04-motor-do-desafio.md` (atualizar
  descrição do modelo)

## Testes / verificação

- Sem runner de testes configurado no projeto (`CLAUDE.md`) — validar como as
  outras features do desafio: rodar `npx tsc --noEmit`, testar ao vivo em
  `/preview/desafio` (fixture, sem precisar de banco) e depois com a
  usuária demo (Carolina) num dia real.
- Conferir especificamente: retomada no passo certo após sair/voltar,
  Voltar desabilitado no passo 0, não dá pra pular pra um passo nunca
  visto, devolutiva grava no banco com o schema novo, conclusão do dia
  funciona com e sem devolutiva preenchida.

## Fora de escopo

- Mudar o conteúdo/roteiro das 3 trilhas.
- Qualquer gamificação nova (streaks, badges) — não foi pedido.
- Tela de acompanhamento da expert pra ver devolutivas (já era "fora do MVP
  se quiser" em `docs/04`, continua assim).
