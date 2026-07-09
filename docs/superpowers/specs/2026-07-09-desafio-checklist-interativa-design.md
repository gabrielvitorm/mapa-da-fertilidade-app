# Desafio 7 dias — imagens de rotina viram checklist interativa

> Spec de design. Contexto: `docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md`
> (formato stepper, já implementado) e `docs/04-motor-do-desafio.md`.

## Por que mudar

As 24 mensagens `IMAGEM` do desafio (8 dias × 3 trilhas) não são fotos/artes
soltas — são todas o mesmo template: um card verde "DESAFIO DIA N" com um
título e uma lista de itens de ação (rotina matinal, cardápio do dia,
práticas). É conteúdo estruturado preso dentro de um PNG, ilegível pro app e
sem nenhuma interação. Vira uma checklist de verdade: cada item tocável,
marca/desmarca, e o progresso fica salvo.

## Decisões

1. **Escopo: as 24 imagens, nas 3 trilhas.** Todas seguem o mesmo padrão
   (confirmado visualmente contra as 8 da trilha Moderada).
2. **Novo tipo de mensagem `CHECKLIST`** — substitui `IMAGEM` nessas 24
   mensagens específicas nos seeds. As outras imagens (se um dia existirem
   fora desse padrão) continuam `IMAGEM` normalmente — hoje não há nenhuma.
3. **Progresso da checklist é salvo no banco**, por usuária + dia + posição
   da mensagem — reaproveita o mesmo padrão já usado por `lastSeenOrdem` e
   `dayCompletions` em `ChallengeProgress` (nenhuma tabela nova).
4. **Visual: cartão novo, sem a imagem original.** Título no mesmo estilo
   "declaração" que os textos curtos já usam, itens como linhas tocáveis com
   checkbox — consistente com o resto do stepper, não uma sobreposição em
   cima da arte verde.
5. **Não trava nada** — marcar itens é puramente opcional/interativo, não
   afeta conclusão do dia nem gating (mesmo espírito da devolutiva).

## Modelo de dados

```prisma
enum ChallengeMessageType {
  TEXTO
  AUDIO
  IMAGEM
  VIDEO
  CHECKLIST
}

model ChallengeMessage {
  id             String              @id @default(cuid())
  dayId          String
  day            ChallengeDay        @relation(fields: [dayId], references: [id])
  ordem          Int
  tipo           ChallengeMessageType
  texto          String?             // título da checklist quando tipo = CHECKLIST
  mediaKey       String?
  checklistItems Json?               // string[] — um item por linha de ação, só quando tipo = CHECKLIST
  delayMs        Int
}
```
(`texto` e `checklistItems` já eram/ficam opcionais — cada `tipo` usa o
subconjunto de campos que faz sentido, igual já acontece hoje com
`texto`/`mediaKey`.)

```prisma
model ChallengeProgress {
  id                 String   @id @default(cuid())
  userId             String
  trackId            String
  currentDay         Int      @default(0)
  dayCompletions     Json     @default("{}")
  lastSeenOrdem      Json     @default("{}")
  checklistProgress  Json     @default("{}")  // { "<dayNumber>:<ordem>": number[] } — índices marcados
}
```

## API

`POST /api/challenge/checklist`
```json
{ "trackId": "...", "dayNumber": 4, "ordem": 2, "checkedIndices": [0, 2, 3] }
```
Grava o array completo de índices marcados pra aquela checklist (mesmo
padrão de "manda o estado inteiro atualizado" que `/api/challenge/progress`
já usa pra `lastSeenOrdem`). Sem validação de conteúdo além do shape — não
precisa saber quantos itens a checklist tem pra aceitar a gravação.

## Componente — `ChallengeChecklist`

- Título grande, mesmo tratamento visual da "declaração" (serifado, itálico,
  centralizado) usado pelos textos curtos.
- Lista de itens abaixo, cada um uma linha tocável: ícone de checkbox +
  texto do item. Tocar alterna marcado/desmarcado.
- Cada toque atualiza o estado local (feedback visual imediato) e dispara
  `POST /api/challenge/checklist` com o array atualizado (fire-and-forget,
  mesmo padrão de `onProgressChange`).
- Estado inicial vem de `checklistProgress["<dayNumber>:<ordem>"]` (carregado
  pela rota do dia, igual `lastSeenOrdem` já é hoje).

## Trabalho de conteúdo

Transcrever as 24 imagens (8 dias × 3 trilhas) — título + itens de cada
uma — pra dentro dos 3 JSONs de seed, substituindo a entrada `IMAGEM` por
`CHECKLIST`. Rodapé de marca da imagem ("Mapa da Fertilidade Integral /
Carolina Palitot / Nutricionista...") não entra na transcrição — é só
identidade visual do PNG, redundante com o app.

## Testes / verificação

- Sem runner de testes configurado — mesmo padrão já usado no resto do
  desafio: `npx tsc --noEmit`, teste ao vivo via `/preview/desafio` (fixture)
  e depois com a usuária demo real, verificando que marcar/desmarcar item
  persiste ao sair e voltar da tela.

## Fora de escopo

- Checklist não afeta gating nem conclusão do dia.
- Tela de acompanhamento da expert pra ver adesão às checklists — dado fica
  gravado, mas a tela de visualização é backlog (mesmo status que a
  devolutiva já tem em `docs/04`).
