# Quiz v2: capítulos, progresso e retomada - Design

> Spec de referência para o plano de implementação. Evolui o fluxo `/quiz` para sair do modelo linear “uma pergunta por tela” e virar uma jornada em capítulos, com progresso segmentado, retomada após refresh e uma tela de cálculo que não pareça travada.

## Contexto

O quiz atual funciona, mas tem três problemas estruturais:

- não há noção visual de capítulos;
- um refresh no meio do fluxo apaga a continuidade da experiência;
- a tela de cálculo é estática e passa sensação de bloqueio.

O objetivo desta evolução é aumentar clareza de progresso, reduzir perda de contexto e melhorar a percepção de valor do momento final, sem alterar schema, seed, motor de score ou o contrato de `POST /api/assessments`.

## Não-objetivos

- Não alterar perguntas, respostas, ordem ou pontuação.
- Não alterar schema Prisma.
- Não alterar `POST /api/assessments`.
- Não refatorar `/captura` além do mínimo necessário para retomar o fluxo.
- Não mudar a lógica de cálculo do resultado final.

## Fatos do código atual que a implementação deve respeitar

| Fato | Onde | Implicação |
| --- | --- | --- |
| `motion` já está instalado | `package.json` | animações podem ser feitas sem dependência nova |
| As perguntas já chegam ordenadas por `pillarOrdem, ordem` | `src/app/quiz/page.tsx` | os capítulos podem ser derivados do array de perguntas |
| `TOTAL_STEPS = 42` está hardcoded | `src/components/screens/QuizFlow.tsx` e `src/app/captura/page.tsx` | deve deixar de ser fixo e passar a ser derivado |
| A troca de pergunta hoje é um remount seco | `src/components/screens/QuizFlow.tsx` | há um ponto claro de encaixe para transições |
| O botão de voltar não repassa a resposta anterior | `src/components/screens/QuizFlow.tsx` | precisa ser corrigido para não perder estado visual |
| O submit hoje falha sem UI de retry | `src/components/screens/QuizFlow.tsx` | precisa de tratamento explícito de erro |
| `leadData` é guardado em `sessionStorage` | `src/app/captura/page.tsx` | a retomada deve considerar esse estado existente |
| Já existe um preview de pergunta, mas não um preview do fluxo completo | `src/app/preview/quiz-pergunta/page.tsx` | a nova spec inclui `/preview/quiz` |

## Estrutura do fluxo

O fluxo passa a ter duas camadas de navegação:

1. **Perguntas**: estado principal do quiz.
2. **Intros de pilar**: telas curtas exibidas quando a navegação avança para um novo capítulo.

Os capítulos são derivados do array de perguntas já ordenado. Não existe persistência de capítulos no banco, nem hardcode de “13 pilares” como fonte primária de verdade.

## Fase 1 - Fundação do fluxo

Esta fase entrega a espinha dorsal do novo quiz sem depender das animações mais ricas.

### Requisitos funcionais

- Criar uma estrutura derivada de capítulos em `src/lib/quiz-sections.ts`.
- Criar um mapa compartilhado de ícones por pilar.
- Trocar a barra linear por uma barra segmentada, com um segmento por capítulo.
- Corrigir o cálculo de passos para derivar do número real de perguntas.
- Persistir progresso e respostas em `localStorage`.
- Restaurar progresso quando houver estado válido salvo.
- Integrar retomada com `/captura` quando houver quiz salvo sem `leadData`.
- Criar `/preview/quiz` para validar o fluxo sem banco.

### `quiz-sections.ts`

O módulo deve ser puro e derivado do array de perguntas.

Responsabilidades:

- agrupar perguntas por pilar em ordem de aparição;
- indicar início e quantidade de perguntas por capítulo;
- resolver a seção atual a partir do índice da pergunta;
- expor rótulos e metadados suficientes para header e intro.

O módulo também deve concentrar o conteúdo estático da intro de cada pilar, em uma única estrutura de fácil edição.

### Barra segmentada

O header do quiz deve sair do modelo de barra contínua e passar para uma barra segmentada:

- um segmento por capítulo;
- capítulos anteriores preenchidos integralmente;
- capítulo atual preenchido parcialmente conforme o progresso local do capítulo;
- capítulos futuros vazios;
- texto de contexto no header indicando capítulo atual e total de capítulos;
- contador discreto de pergunta total no lado oposto.

O objetivo é tornar o quiz legível como jornada, não como porcentagem abstrata.

### Persistência e retomada

O progresso do quiz deve ser salvo localmente com:

- respostas já marcadas;
- índice atual da pergunta;
- timestamp da última atualização.

Regras:

- salvar a cada resposta;
- limpar o estado salvo ao concluir com sucesso;
- descartar automaticamente estado expirado;
- descartar automaticamente estado com IDs que não batem com as perguntas atuais;
- não travar o fluxo se `localStorage` falhar em ambiente restritivo.

UX de retomada:

- ao montar o fluxo, se existir progresso válido e `index > 0`, mostrar uma tela/card intermediário;
- essa tela deve informar onde a usuária parou;
- a usuária pode continuar de onde parou ou recomeçar do zero;
- recomeçar limpa o estado salvo.

### Integração com `/captura`

Se houver quiz salvo e não houver `leadData` em `sessionStorage`, o fluxo não deve tentar submeter cegamente no final.

Requisito:

- antecipar a ida para `/captura` antes da retomada do quiz;
- ao voltar da captura, o progresso anterior precisa continuar intacto.

### Preview do quiz

Criar uma rota de preview dedicada para o quiz completo.

Objetivo do preview:

- validar navegação;
- validar barra segmentada;
- validar retomada;
- validar o header;
- validar a experiência sem depender do banco.

## Fase 2 - Animações e máquina de estados

Esta fase entra depois que a base estiver estável.

### Requisitos funcionais

- introduzir máquina de estados explícita no `QuizFlow`;
- inserir telas de intro entre capítulos;
- animar transições de entrada e saída;
- preservar visualmente a resposta marcada ao voltar;
- substituir a tela estática de cálculo por uma experiência cênica;
- adicionar retry explícito no submit falho.

### Máquina de estados

O fluxo deixa de depender apenas de um índice e de um booleano de submissão.

Estados mínimos esperados:

- `question`
- `intro`
- `resume`
- `calculating`

Essa separação existe para tornar o fluxo previsível em navegação para frente, para trás e em retomada.

### `PillarIntroView`

Tela curta exibida ao cruzar a fronteira de um novo capítulo quando a navegação é para frente.

Regras:

- não exibir na primeira pergunta;
- não exibir ao voltar;
- mostrar ícone, rótulo do pilar e uma frase curta de contexto;
- permitir auto-avanço e avanço manual;
- ser compatível com motion reduzido.

As frases de contexto devem ficar em uma constante única dentro do módulo de capítulos, para revisão editorial simples.

### Animações

As transições devem transmitir movimento sem ficar excessivas.

Requisitos:

- troca de pergunta com slide leve + fade;
- animação diferente para avanço e retorno;
- entrada das opções em cascata sutil;
- seleção com feedback visual claro;
- suporte a `prefers-reduced-motion`.

### Seleção ao voltar

Ao voltar para uma pergunta já respondida:

- a opção anterior deve aparecer marcada;
- a usuária pode trocar a resposta normalmente;
- o estado visual não pode sugerir que a resposta foi perdida.

### `CalculatingView`

Substitui a tela estática final.

Requisitos:

- comunicar que o resultado está sendo calculado;
- exibir mensagens sequenciais;
- segurar a navegação por um tempo mínimo perceptível;
- tratar falha da API com retry dentro da própria tela;
- manter as respostas salvas caso a requisição falhe.

## Preview e fixtures

O preview do quiz deve seguir o padrão dos outros previews do projeto:

- usar fixture local;
- não depender do banco;
- permitir validar layout e fluxo básico em desenvolvimento.

O preview precisa cobrir o novo header segmentado e a navegação entre perguntas, não apenas a renderização isolada de uma pergunta.

## Dependências e mudanças de contrato

- `QuizFlow` passa a depender de `quiz-sections.ts` e da nova estrutura de persistência.
- `QuizQuestionView` precisa aceitar o estado visual de resposta pré-selecionada.
- `CaptureView` não muda de contrato, mas o fluxo pode redirecionar para ela de forma antecipada.
- A nova navegação interna não altera o contrato de `POST /api/assessments`.

## Riscos

- Barra segmentada pode ficar apertada em telas menores.
- `localStorage` pode falhar em navegação privada ou abas restritas.
- A lógica de retomada precisa ser rigorosa com validação de IDs.
- Frases da intro são conteúdo de marca e precisam de revisão.
- Auto-avanço da intro precisa respeitar acessibilidade e não confundir leitor de tela.

## Critérios de aceite

- [ ] O quiz passa a ser lido como sequência de capítulos, não como lista linear.
- [ ] A barra segmentada mostra capítulos concluídos, atual e futuros.
- [ ] O progresso é salvo e restaurado após refresh.
- [ ] Estados inválidos ou expirados são descartados sem crash.
- [ ] Ao voltar, a resposta anterior aparece marcada.
- [ ] O fluxo antecipa `/captura` quando faltar `leadData` na retomada.
- [ ] A tela de cálculo deixa de ser estática e passa a oferecer retry.
- [ ] O preview dedicado do quiz existe e cobre o novo fluxo.

## Perguntas resolvidas nesta spec

- O preview dedicado será `/preview/quiz`.
- A persistência será local, não no banco.
- O fluxo será dividido em duas fases de implementação.
- A navegação para frente poderá exibir intro de pilar; a navegação para trás não.
- O contrato de avaliação continua intocado.
