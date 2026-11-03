# 06 — Relatório v2: gráficos, priorização e PDF

Spec de evolução da tela `/relatorio`. O relatório atual (ScoreRing + accordion
de 13 pilares + upsell) é funcional mas plano: todo pilar tem o mesmo peso
visual, o dado contínuo (`pillarScores`) nunca é visualizado e a usuária precisa
abrir 13 accordions para entender o que fazer primeiro.

**Objetivo:** transformar o relatório em um documento de valor percebido alto —
com o "mapa" literal (radar), priorização clara e export em PDF — sem alterar
motor de score, banco ou fluxo de entitlements.

## Status atual da implementação

O escopo principal desta spec está implementado no código: contrato com score
normalizado e peso, radar, prioridades, plano de ação, grupos derivados do
banco, preview, rota de impressão e testes de montagem/priorização. A validação
automatizada passa com `npm run lint`, `npx tsc --noEmit`, `npm run build` e os
testes de `src/lib`.

As caixas de aceite abaixo permanecem como checklist de QA visual/manual. Ainda
é necessário validar impressão em navegadores e dispositivos reais antes de
anunciar o PDF como compatível com todos os ambientes.

## Não-objetivos

- Mudar `computeAssessment`, `buildAssessmentResult` ou o schema Prisma.
- Comparação entre assessments (evolução no tempo) — fica para v3.
- Alterar o teaser bloqueado (`CheckoutReportView`) além do descrito na §7.

## Dados disponíveis (já chegam na página, hoje subutilizados)

Em `src/app/relatorio/page.tsx` já existem:

| Dado | Origem | Uso hoje | Uso na v2 |
| --- | --- | --- | --- |
| `pillarScores` (score bruto por pilar) | `assessment.pillarScores` | só entra no cálculo do nível | radar, barras de progresso |
| `maxDoPilar` e `peso` por pilar | `ScoreRule` | classificação | ratio, priorização, agrupamento |
| `resultadoFinal` (0–100) | `computeAssessment` | ScoreRing | ScoreRing com faixas |
| `level` por pilar | `report-assembly` | badge | mantém |
| `diagnostico` / `recomendacao` | `PillarMessage` | accordion | accordion + plano de ação |

**Mudança de contrato necessária:** `PillarResult` (em `types/assessment.ts`)
precisa carregar os números que hoje morrem no server:

```ts
export interface PillarResult {
  key: PillarKey;
  label: string;
  level: PillarLevel;
  diagnostico: string;
  recomendacao: string;
  locked?: boolean;
  // NOVOS — preenchidos em buildAssessmentResult (aditivo, sem breaking change):
  score: number;      // pillarScores[key]
  max: number;        // rule.maxDoPilar
  ratio: number;      // clamp(score / max, 0, 1)
  peso: 1 | 2 | 3;    // rule.peso
}
```

`buildAssessmentResult` já recebe `pillarScores` e `rules` — é só propagar.
Atualizar `report-assembly.test.ts` e o fixture de `preview/relatorio`.

## Dependência nova

```
npm i recharts
```

Usar **recharts ≥ 3.x** (compatível com React 19). Componentes de gráfico devem
ser `'use client'` — o `ReportView` já é client, então nada muda na arquitetura
Server → Client existente (`page.tsx` → `ReportClient` → `ReportView`).

Cores: usar os tokens existentes (`--color-brand-terracota: #C2795F`,
`--color-brand-sage: #8DA290`, `--color-brand-gold: #C9A24B`,
`--color-brand-brown: #2E2620`). Recharts não lê CSS vars em todas as props —
centralizar os hex em `src/lib/report-theme.ts` e importar nos dois lugares
(gráficos e, futuramente, PDF).

---

## Nova estrutura da tela (ordem das seções)

```
1. Header (mantém)
2. Score global — ScoreRing v2 com marcadores de faixa
3. Mapa da Fertilidade — radar dos 13 pilares        [NOVO]
4. Prioridades — top 3 atenção + top 3 fortalezas    [NOVO]
5. Pilares por grupo — accordion com barra de score  [REESTRUTURADO]
6. Plano de Ação — recomendações priorizadas         [NOVO]
7. Upsell do Desafio (mantém, movido para o fim)
8. Botão "Baixar PDF"                                [NOVO]
```

### §1. ScoreRing v2 — marcadores de faixa

Evoluir `src/components/ui/ScoreRing.tsx` (continua SVG puro, não vale Recharts
para isso):

- Dois ticks discretos no anel nas posições 60% e 80% (limiares
  BAIXA/MODERADA/ALTA do doc 02).
- Abaixo do anel, uma mini-legenda das três faixas com o nível atual destacado:
  `Semente (<60) · Raízes (60–80) · Floração (>80)`.
- Prop nova opcional `showThresholds?: boolean` (default `true`) para não
  quebrar outros usos do componente.

### §2. Radar dos 13 pilares — `PillarRadarChart`

Novo componente `src/components/charts/PillarRadarChart.tsx`.

- `RadarChart` do Recharts com `PolarAngleAxis` (13 eixos) e `Radar` plotando
  `ratio * 100` (0–100). **Nunca plotar score bruto** — os máximos variam de 3
  a 72 e o gráfico ficaria ilegível.
- `PolarRadiusAxis` oculto ou com ticks discretos em 60 e 80 (coerência com as
  faixas de nível por pilar: ≥80 Alto, ≥60 Moderado).
- Preenchimento `sage` com opacidade ~0.35, stroke `terracota`.
- **Labels no mobile (~380px):** 13 labels completos não cabem. Usar `tick`
  customizado com rótulos curtos (mapa `PILLAR_SHORT_LABEL` novo em
  `types/assessment.ts`: "Hormonal", "Ciclo", "Sono", "Fígado", "Tireoide"…) em
  fonte 9–10px. Tap/click no vértice pode abrir o accordion correspondente
  (nice-to-have, não bloqueante).
- Container com `ResponsiveContainer` altura ~300px, dentro de um card branco
  no mesmo estilo dos existentes, título "Seu Mapa da Fertilidade".

### §3. Prioridades — `PrioritySummary`

Novo componente `src/components/screens/PrioritySummary.tsx` + função pura
`rankPillars` em `src/lib/report-priority.ts` (com teste).

Score de prioridade: `(1 - ratio) * peso`. Ordena desc → top 3 são os
**pontos de atenção**; ordena por `ratio` desc (desempate por `peso` desc) →
top 3 **fortalezas**. O peso entra de propósito: um "Baixo" em
`fatores_infertilidade` (peso 3) importa mais que um "Baixo" em `toxinas`
(peso 1) — hoje a tela trata tudo igual e o upsell escolhe o pilar mais fraco
com um sort ingênuo (`ReportView` linha ~54, que inclusive só compara `a` e
pode ser substituído por `rankPillars`).

UI: dois blocos lado a lado (grid 2 col no mobile já funciona), cada item com
ícone do pilar + label + badge de nível. Atenção em tom `terracota`, fortalezas
em `sage`.

### §4. Pilares por grupo + barra de score

Reestruturar a lista do accordion em `ReportView`:

- Três grupos com subtítulo, derivados do `peso`:
  - **Fundamentais** (peso 3): fatores_infertilidade, saude_hormonal, ciclo
  - **Estilo de vida** (peso 2): sono, imunidade, atividade_fisica,
    alimentacao, saude_intestinal, figado, estresse
  - **Complementares** (peso 1): tireoide*, toxinas, historico
- Dentro de cada grupo, ordenar por `ratio` asc (pior primeiro).
- No header de cada card (sempre visível, não só expandido): barra horizontal
  fina de progresso — `ratio` preenchido com a cor do nível
  (`--color-level-*-fg`) + texto `"{score} de {max} pts"` em 9px.
  Componente novo `src/components/ui/PillarScoreBar.tsx` (SVG/div puro,
  Recharts é overkill aqui).

\* *tireoide tem peso 2 no doc 02 — conferir na tabela de `ScoreRule` do banco
e agrupar pelo `peso` real, não por lista hardcoded.*

### §5. Plano de Ação — `ActionPlan`

Novo componente `src/components/screens/ActionPlan.tsx`.

- Lista numerada (1º, 2º, 3º…) com as `recomendacao` dos pilares ranqueados
  por `rankPillars`, limitada aos pilares com nível `Baixo` e `Moderado`
  (máx. 5 itens).
- Cada item: número em círculo `terracota`, label do pilar em bold, texto da
  recomendação. É conteúdo que já existe no banco — só muda a apresentação:
  sai de "escondido em accordion" para "plano sequencial".
- Se todos os pilares forem `Alto`: mensagem de manutenção (usar tom do
  `NIVEL_DESCRICAO.ALTA`).

### §6. Export em PDF

**Abordagem: rota de impressão + `window.print()`.** Zero dependência de
servidor — importante porque o deploy é Docker em VPS Hostinger e embutir
Chromium/Puppeteer na imagem custa ~300MB e RAM que o VPS não tem sobrando.

- Nova rota `src/app/relatorio/imprimir/page.tsx`: mesmos dados e guards da
  `/relatorio` (extrair o data-fetching de `page.tsx` para
  `src/lib/report-data.ts` e reusar nas duas rotas — evita duplicar as 5
  queries).
- Componente `ReportPrintView`: layout A4 estático — sem accordion (todos os
  pilares abertos), sem upsell, sem botões; header com logo/nome da usuária e
  data; radar + prioridades + grupos + plano de ação.
- CSS `@media print` em módulo próprio: `@page { size: A4; margin: 14mm }`,
  `break-inside: avoid` nos cards, cores forçadas com
  `print-color-adjust: exact`.
- Recharts renderiza SVG → imprime vetorial sem trabalho extra. Fixar
  width/height explícitos no print (não usar `ResponsiveContainer`, que depende
  de layout de tela).
- Botão "Baixar PDF (📄)" no header da `/relatorio` → abre `/relatorio/imprimir`
  e dispara `window.print()` no mount (com botão manual de fallback).
- **Alternativa documentada (não implementar agora):** endpoint server-side com
  `playwright-core` + Chromium para gerar o PDF e subir no R2 (útil se um dia o
  PDF for anexado em e-mail pós-compra).

### §7. Teaser bloqueado (pré-pagamento)

No `CheckoutReportView`/fluxo com `locked: true`, o radar pode virar gancho de
conversão: renderizar o radar com `blur(6px)` + overlay "Desbloqueie seu mapa
completo". Só isso — sem prioridades nem plano de ação na versão locked.
Marcar como **fase 2 opcional** deste doc; não bloqueia o resto.

---

## Ordem de implementação sugerida (para o Claude Code)

1. **Contrato de dados** — estender `PillarResult` + `buildAssessmentResult` +
   testes + fixture do preview. *(tudo depende disso)*
2. `rankPillars` + teste (`report-priority.ts`).
3. `PillarScoreBar` + grupos por peso no `ReportView`.
4. `npm i recharts` + `report-theme.ts` + `PillarRadarChart`.
5. `PrioritySummary` e `ActionPlan` (usam 2 e 4).
6. ScoreRing v2 (independente, pode ir a qualquer momento).
7. `report-data.ts` (extração) + rota `/relatorio/imprimir` + CSS print + botão.
8. Validar tudo em `/preview/relatorio` com o fixture antes de testar logado.

## Critérios de aceite

- [ ] Radar mostra os 13 pilares em ratio 0–100, legível em 380px de largura.
- [ ] Nenhum gráfico plota score bruto sem normalizar.
- [ ] Prioridades e Plano de Ação consideram `peso` (pilar peso 3 fraco
      aparece antes de pilar peso 1 fraco com mesmo ratio).
- [ ] Cards mostram `score de max pts` com barra na cor do nível.
- [ ] Grupos derivados do `peso` vindo do banco, não hardcoded.
- [ ] `/relatorio/imprimir` gera PDF A4 via diálogo do navegador com cores da
      marca e sem cortar cards no meio da página.
- [ ] `preview/relatorio` continua funcionando com o fixture atualizado.
- [ ] Testes de `report-assembly` e `report-priority` verdes.
- [ ] Nenhuma mudança em schema Prisma, seeds ou motor de score.

## Riscos e pontos de atenção

- **Recharts × React 19:** garantir recharts 3.x; se o build do Next 16
  reclamar de SSR, isolar os charts com `dynamic(() => import(...), { ssr:
  false })` — mas como já estão sob `'use client'` num Client Component,
  provavelmente desnecessário.
- **13 eixos no radar mobile** é o maior risco visual. Se ficar poluído mesmo
  com labels curtos, fallback aprovado: radar com os 13 vértices mas labels só
  nos 6 piores + legenda numerada abaixo.
- **Impressão no iOS Safari** tem quirks com `@page`; testar no dispositivo da
  expert antes de anunciar a feature.
- **`resultadoFinal` > 100 teórico** (denominador 285 < soma dos máximos 291,
  ver doc 02): o ScoreRing já clampa; clampar `ratio` também (`Math.min(1, …)`).
