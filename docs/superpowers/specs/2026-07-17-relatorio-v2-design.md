# Relatório v2: radar, prioridades e exportação em PDF - Design

> Spec de referência para o plano de implementação. Evolui a tela `/relatorio` para mostrar o mapa literal dos pilares, explicitar prioridades e entregar uma saída imprimível em A4, sem alterar motor de score, schema Prisma ou contrato de entitlements.

## Contexto

O relatório atual funciona, mas a apresentação é plana:

- o score global aparece só como anel;
- os 13 pilares ficam todos visualmente equivalentes;
- o dado contínuo `pillarScores` não é mostrado;
- a usuária precisa abrir muitos accordions para entender o que atacar primeiro;
- não existe um caminho de exportação em PDF.

O objetivo desta evolução é aumentar valor percebido sem mexer na mecânica de cálculo. A tela precisa deixar claro:

1. qual é o score global;
2. quais pilares estão melhores e piores;
3. quais devem ser priorizados agora;
4. como imprimir ou salvar o relatório.

## Não-objetivos

- Não mudar `computeAssessment`.
- Não mudar `buildAssessmentResult` na regra de negócio, apenas propagar dados já disponíveis.
- Não alterar schema Prisma.
- Não criar comparação entre assessments.
- Não implementar teaser bloqueado além do que já está previsto como fase 2 opcional.
- Não criar geração server-side de PDF.

## Dados já disponíveis

Hoje a rota `/relatorio` já reúne:

- `pillarScores` por pilar;
- `maxDoPilar` e `peso` vindos de `ScoreRule`;
- `resultadoFinal` e `nivelGlobal`;
- `level`, `diagnostico` e `recomendacao` por pilar;
- `locked` no fluxo pré-pagamento.

A mudança principal é transportar para o cliente os números que já existem no backend e hoje são descartados após o cálculo:

```ts
export interface PillarResult {
  key: PillarKey;
  label: string;
  level: PillarLevel;
  diagnostico: string;
  recomendacao: string;
  locked?: boolean;
  score: number;
  max: number;
  ratio: number;
  peso: 1 | 2 | 3;
}
```

`ratio` deve ser sempre normalizado e clamped entre `0` e `1`. O gráfico jamais deve receber score bruto.

## Estrutura da tela

Ordem proposta para `/relatorio`:

1. Header
2. Score global com `ScoreRing` v2
3. Radar dos 13 pilares
4. Bloco de prioridades
5. Pilares por grupo com barra de score
6. Plano de ação
7. Upsell do desafio
8. Botão de impressão ou PDF

Essa ordem prioriza leitura executiva: primeiro a síntese, depois o mapa, depois o que fazer.

## Arquitetura

O relatório continua com o mesmo fluxo geral:

- `src/app/relatorio/page.tsx` busca dados no servidor e monta o `AssessmentResult`;
- `src/components/screens/ReportClient.tsx` permanece como wrapper client;
- `src/components/screens/ReportView.tsx` vira o orquestrador da nova composição;
- componentes novos tratam cada bloco de UI separadamente;
- a rota `/relatorio/imprimir` reutiliza a mesma fonte de dados e renderiza uma versão A4 estática.

A separação importante é esta:

- a camada de dados continua no server;
- a camada de visualização interativa fica no client;
- a camada de impressão é um client view estático, sem accordion e sem ações.

## Componentes e responsabilidades

### `ScoreRing` v2

Evolução de `src/components/ui/ScoreRing.tsx`.

Requisitos:

- manter implementação SVG pura;
- adicionar ticks discretos em 60 e 80;
- exibir mini-legenda com as três faixas;
- destacar a faixa correspondente ao score atual;
- aceitar `showThresholds?: boolean` com default `true`.

O componente deve continuar compatível com os usos existentes em dashboard e relatórios.

### `PillarRadarChart`

Novo componente em `src/components/charts/PillarRadarChart.tsx`.

Requisitos:

- usar `recharts` 3.x;
- plotar `ratio * 100`;
- mostrar os 13 pilares;
- esconder ou simplificar a escala radial;
- usar cor de preenchimento sage e stroke terracota;
- funcionar bem em mobile.

As labels precisam ser legíveis em largura pequena. Se 13 labels completas poluírem demais a viewport, o fallback aceito é usar rótulos curtos e um tratamento visual mais compactado. O detalhe-chave é a legibilidade, não a literalidade do texto.

### `PrioritySummary` e `rankPillars`

Novo componente em `src/components/screens/PrioritySummary.tsx` e função pura em `src/lib/report-priority.ts`.

Regras:

- ordenar pontos de atenção por `(1 - ratio) * peso`, desc;
- ordenar fortalezas por `ratio` desc, com desempate por `peso` desc;
- exibir top 3 de cada lista;
- considerar somente pilares não bloqueados;
- quando necessário, o peso deve influenciar mais a prioridade que um score baixo genérico.

### `PillarScoreBar`

Novo componente em `src/components/ui/PillarScoreBar.tsx`.

Requisitos:

- mostrar barra horizontal compacta com `ratio`;
- exibir `score de max pts`;
- colorir conforme o nível do pilar;
- ser leve, sem dependências extras.

### Agrupamento por peso

O accordion de pilares passa a ser agrupado por `peso` real do banco, não por lista fixa.

Requisitos:

- três grupos conceituais: fundamentais, estilo de vida e complementares;
- ordenar os pilares dentro do grupo por `ratio` asc;
- renderizar sempre o header com a barra de score;
- manter diagnóstico e recomendação no conteúdo expandido;
- não depender de labels hardcoded para definir grupo quando o peso real já existir.

### `ActionPlan`

Novo componente em `src/components/screens/ActionPlan.tsx`.

Requisitos:

- listar recomendações dos pilares priorizados;
- limitar a itens com nível `Baixo` e `Moderado`;
- cortar em no máximo 5 itens;
- se todos estiverem em `Alto`, mostrar mensagem de manutenção;
- apresentar uma sequência de ação, não uma lista neutra.

### Exportação em PDF

Abordagem escolhida: rota de impressão + `window.print()`.

Motivos:

- não adiciona peso de Chromium/Puppeteer ao deploy;
- mantém a saída vetorial via SVG;
- reduz risco operacional em VPS pequena;
- permite uma versão A4 estática controlada.

Implementação prevista:

- criar `src/app/relatorio/imprimir/page.tsx`;
- extrair a busca de dados para `src/lib/report-data.ts`;
- reutilizar a mesma montagem do relatório;
- renderizar uma view sem accordions, sem botões e sem upsell;
- aplicar `@media print` com `@page { size: A4 }`;
- disparar `window.print()` no mount, com fallback manual visível.

## Fase 2 opcional

O teaser bloqueado pode reutilizar o radar como gancho de conversão:

- radar com blur;
- overlay de desbloqueio;
- sem prioridades;
- sem plano de ação.

Isso não entra no núcleo desta spec. Só deve ser tratado depois da entrega principal estabilizar.

## Dependências e mudanças de contrato

- `PillarResult` precisa carregar os novos campos numéricos.
- `buildAssessmentResult` deve preencher os novos campos.
- `report-assembly.test.ts` precisa validar os novos campos.
- `src/app/preview/relatorio/fixture.ts` precisa refletir a estrutura nova.
- `recharts` deve ser instalado em versão compatível com React 19.
- as cores do relatório devem ser centralizadas em `src/lib/report-theme.ts`.

## Riscos

- Radar com 13 eixos pode ficar poluído em mobile.
- `recharts` precisa operar bem no contexto do app atual.
- Impressão no navegador tem diferenças entre Chrome desktop e Safari mobile.
- `ratio` mal calculado pode distorcer prioridades e visualização.
- o agrupamento por peso precisa respeitar o peso real do banco, não suposição do doc.

## Critérios de aceite

- [ ] O score global mostra faixas e marcadores de 60 e 80.
- [ ] O radar exibe os 13 pilares com ratio normalizado.
- [ ] O relatório destaca top prioridades e top fortalezas.
- [ ] Os pilares aparecem agrupados por peso real e com barra de score no header.
- [ ] O plano de ação lista recomendações priorizadas e respeita o limite de 5.
- [ ] A view de impressão abre em A4 e usa `window.print()`.
- [ ] O preview continua funcionando com fixture atualizado.
- [ ] `report-assembly` e `report-priority` têm cobertura mínima e passam.
- [ ] Nenhuma alteração de schema Prisma ou motor de score.

## Perguntas resolvidas nesta spec

- O PDF será client-side via impressão do navegador.
- O teaser bloqueado fica fora do núcleo e entra como fase 2.
- `score` bruto nunca vai para o radar.
- o peso do banco manda no agrupamento, mesmo que isso contradiga uma lista fixa.
