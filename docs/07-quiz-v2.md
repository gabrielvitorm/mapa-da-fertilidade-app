# 07 — Quiz v2: checkpoints, animações e persistência

Spec de evolução do fluxo `/quiz`. O quiz atual (41 perguntas em fluxo único,
uma por tela) funciona, mas é uma escadaria monótona: sem transições, sem senso
de capítulos, sem memória — um refresh na pergunta 35 descarta tudo — e a tela
de cálculo (o momento de maior expectativa do funil) é um `<p>` estático.

**Objetivo:** transformar o quiz em uma jornada por 13 capítulos (os pilares),
com animações, retomada de progresso e uma revelação cênica do resultado — sem
mudar schema, seeds, motor de score ou o contrato do `POST /api/assessments`.

## Status atual da implementação

O fluxo descrito está implementado: capítulos derivados dos dados, progresso
segmentado, intros de pilar, animações com reduced motion, retomada via
`localStorage`, validação de perguntas e opções contra o quiz servido, tela de
cálculo com duração mínima/retry e preview dedicado. A validação automatizada
passa com `npm run lint`, `npx tsc --noEmit`, `npm run build` e os testes de
`src/lib`.

As caixas de aceite abaixo continuam sendo checklist de QA manual para
dispositivos compactos, acessibilidade/foco e comportamento visual. O conteúdo
das frases de introdução também deve receber aprovação editorial antes do
lançamento comercial.

## Não-objetivos

- Alterar perguntas, opções, ordem ou pontuação (tudo continua vindo do banco).
- Mudar schema Prisma ou `/api/assessments`.
- Refazer a `/captura` (só integrar com a retomada, ver §3).

## Fatos do código atual que a implementação deve respeitar

| Fato | Onde | Implicação |
| --- | --- | --- |
| `motion` já está instalado e **não é usado em lugar nenhum** | `package.json` | animações sem dependência nova |
| Perguntas chegam ordenadas por `pillarOrdem, ordem` | `app/quiz/page.tsx` | os 13 capítulos são deriváveis do array, sem query extra |
| `TOTAL_STEPS = 42` é hardcoded | `QuizFlow.tsx` | **bug latente**: derive de `questions.length + 1` |
| Troca de pergunta é remount seco (`key={current.id}`) | `QuizFlow.tsx` | ponto de encaixe do `AnimatePresence` |
| `handleBack` não repassa a resposta salva | `QuizFlow.tsx` | §4 corrige |
| Submit com erro dá `throw` sem UI de retry | `QuizFlow.tsx` | §5 corrige |
| `PILLAR_ICON` (lucide) já existe, mas dentro de `ReportView` | `ReportView.tsx` | extrair para módulo compartilhado |
| `leadData` fica em `sessionStorage` | `CaptureView`/`QuizFlow` | padrão de storage já existente no app |

---

## §1. Estrutura de capítulos (derivada, não persistida)

Novo módulo `src/lib/quiz-sections.ts` (função pura + teste):

```ts
export interface QuizSection {
  pillar: PillarKey;
  label: string;          // PILLAR_LABEL
  startIndex: number;     // índice da 1ª pergunta do pilar no array
  questionCount: number;
}

export function buildSections(questions: QuizFlowQuestion[]): QuizSection[];
export function sectionForIndex(sections: QuizSection[], index: number): {
  section: QuizSection; sectionIndex: number; questionInSection: number;
};
```

Agrupa o array já ordenado por `pillar` preservando a ordem. **Não** assumir
que são exatamente 13 seções nem hardcodear contagens — se a expert adicionar
uma pergunta no seed, tudo se ajusta.

Extrair também `PILLAR_ICON` de `ReportView.tsx` para
`src/lib/pillar-icons.ts` e importar nos dois lugares (relatório e quiz).

## §2. Barra de progresso segmentada — `SegmentedProgressBar`

Novo componente `src/components/ui/SegmentedProgressBar.tsx`, substitui a
barra linear no header do `QuizQuestionView`:

- Um segmento por seção (gap de 2–3px, cantos arredondados). Com 13 segmentos
  em ~340px úteis, cada um tem ~23px — ok, mas **não** colocar labels nos
  segmentos.
- Segmentos de pilares concluídos: 100% preenchidos (`terracota`).
- Segmento atual: preenchimento parcial = `questionInSection / questionCount`,
  animado com `motion` (spring suave na largura).
- Segmentos futuros: `--color-border-soft`.
- Abaixo da barra, linha de contexto: `"Sono · pilar 4 de 13"` (substitui o
  badge sage solto no corpo — o pilar passa a viver no header junto do
  progresso). Manter o contador discreto `"pergunta 12 de 41"` do lado oposto.

## §3. Persistência e retomada (localStorage)

Novo hook `src/lib/useQuizPersistence.ts`:

- Chave `mapa:quizProgress:v1` com `{ answers, index, updatedAt }`.
- Salvar a cada resposta (síncrono, é barato). Limpar no submit com sucesso.
- **Validação na retomada:** os IDs de pergunta/opção são cuids do banco. Se o
  seed rodar de novo, os IDs mudam. Ao carregar, validar que **todas** as
  chaves de `answers` existem no array de `questions` atual; se qualquer uma
  não existir, descartar o estado salvo silenciosamente.
- Expirar estados com `updatedAt` > 7 dias (funil de lançamento, não faz
  sentido retomar um quiz de semanas atrás).
- **UX de retomada:** no mount do `QuizFlow`, se houver estado válido com
  `index > 0`, mostrar um cartão antes da primeira pergunta: "Você parou na
  pergunta N (pilar X). **Continuar de onde parou** / Recomeçar". Recomeçar
  limpa o storage.
- **Interação com `/captura`:** `leadData` continua em `sessionStorage`. Se a
  usuária retorna com quiz salvo mas sem `leadData` (fechou o navegador), o
  fluxo atual já redireciona para `/captura` **só no submit** — antecipar:
  na retomada sem `leadData`, mandar para `/captura` primeiro e voltar ao quiz
  com o progresso intacto (a `/captura` já navega para `/quiz` ao concluir;
  nada a mudar lá).

## §4. Tela de transição de pilar — `PillarIntroView`

Novo componente `src/components/screens/PillarIntroView.tsx`. Exibida quando a
navegação **para frente** cruza a fronteira de uma seção (nunca ao voltar, e
nunca para a seção 1 — a primeira pergunta já é a abertura).

- Layout: ícone do pilar grande num círculo `sage/15`, "Pilar N de 13" em
  eyebrow, label em serif, 1 frase de contexto, botão "Continuar".
- Auto-avanço em ~2,5s **e** botão manual (o que vier primeiro). Barra fininha
  de auto-avanço no botão para comunicar que ele vai sozinho.
- Frases de contexto: constante `PILLAR_INTRO: Record<PillarKey, string>` em
  `quiz-sections.ts` (código, não banco — sem mudança de schema). Tom acolhedor
  da marca, 1 linha cada, ex.: `sono: 'Como você dorme diz muito sobre como
  seu corpo se regula.'`. **Escrever as 13 frases na implementação e validar
  com a expert antes do deploy.**
- Entrada/saída animadas com `motion` (fade + scale sutil no ícone).

Estado no `QuizFlow`: `phase: 'question' | 'intro' | 'resume' | 'calculating'`
em vez do booleano `submitting` atual.

## §5. Animações com `motion`

Em `QuizFlow` / `QuizQuestionView`:

- **Troca de pergunta:** `AnimatePresence mode="wait"` em volta do
  `QuizQuestionView`; slide horizontal ~24px + fade (avançar: entra da
  direita; voltar: entra da esquerda — guardar `direction` no state).
  Duração ~200ms, easing padrão do motion.
- **Opções:** container com `staggerChildren: 0.04` — as opções entram em
  cascata sutil a cada pergunta.
- **Seleção:** manter o delay de 220ms atual, adicionar um `Check` (lucide)
  animado (scale spring) à direita da opção selecionada + leve `scale: 0.98`
  no tap (`whileTap`).
- **Voltar com resposta marcada:** `QuizQuestionView` ganha prop
  `selectedOptionId?: string` (vinda de `answers[current.id]`); a opção
  aparece pré-marcada (estilo selecionado, sem o check animado) e tocar em
  qualquer opção — inclusive outra — responde normalmente.
- **Reduced motion:** usar `useReducedMotion()` do motion; se ativo, trocar
  slides por fades instantâneos e desligar stagger.

## §6. Tela de cálculo cênica — `CalculatingView`

Novo componente `src/components/screens/CalculatingView.tsx`, substitui o
`<p>` estático:

- Fundo cream, `ScoreRing`-like pulsando (anel girando com stroke parcial,
  SVG + motion) ou ícone `Sparkles` respirando.
- Mensagens sequenciais com `AnimatePresence` (~1,2s cada):
  1. "Analisando suas respostas…"
  2. "Cruzando os 13 pilares…"
  3. "Montando o seu mapa…"
- **Duração mínima de ~3s:** disparar o `fetch` em paralelo e navegar apenas
  quando `Promise.all([apiCall, minDelay(3000)])` resolver. A API é rápida;
  o delay é intencional para valor percebido.
- **Erro com retry (corrige o `throw` atual):** se o `fetch` falhar, trocar
  para estado de erro na própria tela — "Não conseguimos calcular agora." +
  botão "Tentar novamente" (reenvia as mesmas respostas; elas continuam no
  localStorage, nada se perde).

---

## Ordem de implementação sugerida (para o Claude Code)

1. `quiz-sections.ts` (+ teste) e extração de `pillar-icons.ts`. Corrigir
   `TOTAL_STEPS` hardcoded no mesmo passo.
2. `SegmentedProgressBar` + header novo do `QuizQuestionView`.
3. Máquina de fases no `QuizFlow` (`question | intro | resume | calculating`)
   + `PillarIntroView` (frases placeholder, marcar TODO de validação).
4. Animações do §5 (inclui `selectedOptionId` no voltar).
5. `useQuizPersistence` + cartão de retomada + integração com `/captura`.
6. `CalculatingView` com duração mínima e retry.
7. Criar `/preview/quiz` com perguntas fixture (hoje não existe preview do
   quiz — seguir o padrão dos outros previews) para validar visual sem banco.

## Critérios de aceite

- [ ] Barra segmentada reflete pilares concluídos/atual/futuros e anima o
      preenchimento do segmento atual.
- [ ] Tela de intro aparece ao entrar em cada pilar (exceto o 1º), só ao
      avançar, com auto-avanço + botão.
- [ ] Refresh no meio do quiz → cartão "Continuar de onde parou" com respostas
      e posição intactas; "Recomeçar" zera.
- [ ] Estado salvo com IDs órfãos (seed re-rodado) é descartado sem crash.
- [ ] Voltar mostra a resposta anterior marcada e permite trocá-la.
- [ ] Transições respeitam `prefers-reduced-motion`.
- [ ] Tela de cálculo dura ≥3s, mostra as mensagens em sequência e tem retry
      funcional em caso de falha da API.
- [ ] Nada de novo em `package.json` (motion e lucide já existem), nenhum
      schema/seed alterado, `POST /api/assessments` intocado.
- [ ] Número de perguntas/pilares derivado dos dados (nenhum 41/42/13
      hardcoded restante).

## Riscos e pontos de atenção

- **13 segmentos em telas <340px** (Android compactos): validar visual; se
  ficar espremido, reduzir gap para 2px antes de pensar em outra solução.
- **Frases do `PILLAR_INTRO` são conteúdo da marca** — a expert precisa
  aprovar; deixar em constante única fácil de editar e sinalizar no PR.
- **localStorage em aba anônima do iOS** pode lançar em `setItem`: envolver o
  hook em try/catch e degradar para comportamento atual (sem persistência).
- **Auto-avanço da intro + leitoras de tela:** garantir foco no título da
  intro ao montar e no `h2` da pergunta ao trocar, senão a navegação assistiva
  se perde nas transições.
