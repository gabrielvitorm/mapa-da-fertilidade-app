# 02 — Motor de score do assessment

Especificação extraída do Typebot (`typebot-export-mapa-da-fertilidade.json`).
Deve virar uma **função pura em TypeScript** em `/lib/scoring`, com testes.

## Os 13 pilares

Cada pilar tem um **peso** (multiplicador da pontuação das suas perguntas) e um
**máximo** (usado para classificar o nível *daquele* pilar). O `pillarScore` já
é o valor ponderado e somado das respostas do pilar.

| # | Pilar (chave) | Peso | Máx do pilar |
| --- | --- | :-: | :-: |
| 1 | `fatores_infertilidade` | 3 | 72 |
| 2 | `saude_hormonal` | 3 | 36 |
| 3 | `ciclo` | 3 | 27 |
| 4 | `sono` | 2 | 24 |
| 5 | `imunidade` | 2 | 24 |
| 6 | `atividade_fisica` | 2 | 18 |
| 7 | `alimentacao` | 2 | 18 |
| 8 | `saude_intestinal` | 2 | 18 |
| 9 | `figado` | 2 | 18 |
| 10 | `estresse` | 2 | 18 |
| 11 | `tireoide` | 2 | 9 |
| 12 | `toxinas` | 1 | 6 |
| 13 | `historico` | 1 | 3 |

## Score global

```
scoreTotal     = soma dos 13 pillarScores
resultadoFinal = (scoreTotal / 285) * 100      // em %
nivelGlobal:
  resultadoFinal  > 80          → ALTA
  60 <= ... <= 80               → MODERADA
  resultadoFinal  < 60          → BAIXA
```

> **Atenção — constante a confirmar:** a soma dos *máximos* dos 13 pilares dá
> **291**, mas o denominador usado é **285**. No Typebot o 285 é fixo. Trate 285
> como uma **constante de calibração** (`SCORE_DENOMINATOR = 285`) e confirme com
> a expert se é intencional. Não derive o denominador da soma dos máximos.

## Nível por pilar (os "pontos de atenção")

Cada pilar é classificado **independentemente** pela razão `pillarScore / maxDoPilar`:

```
ratio >= 0.8  → Alto
ratio >= 0.6  → Moderado
senão         → Baixo
```

Para cada pilar e cada nível existe um par `{ i, r }` = (diagnóstico,
recomendação). Esses 13 blocos são os **pontos de atenção** do relatório. Os
textos completos estão no JSON (grupos `Calculo personalizado 1/2/3`) — migre-os
para o banco como conteúdo editável, na forma:

```ts
// tabela: pillar_messages
{ pillar: 'sono', level: 'Moderado',
  diagnostico: 'Você dorme pouco ou acorda muitas vezes à noite...',
  recomendacao: 'Rotina de higiene do sono + suplemento natural...' }
```

Formato de exibição (igual ao WhatsApp original):
```
{diagnostico}

*Recomendação:* {recomendacao}
```

## Esqueleto da função

```ts
type Pillar =
  | 'fatores_infertilidade' | 'saude_hormonal' | 'ciclo' | 'sono'
  | 'imunidade' | 'atividade_fisica' | 'alimentacao' | 'saude_intestinal'
  | 'figado' | 'estresse' | 'tireoide' | 'toxinas' | 'historico';

const PILLAR_MAX: Record<Pillar, number> = {
  fatores_infertilidade: 72, saude_hormonal: 36, ciclo: 27, sono: 24,
  imunidade: 24, atividade_fisica: 18, alimentacao: 18, saude_intestinal: 18,
  figado: 18, estresse: 18, tireoide: 9, toxinas: 6, historico: 3,
};
const SCORE_DENOMINATOR = 285;

function pillarLevel(score: number, max: number): 'Alto'|'Moderado'|'Baixo' {
  const r = score / max;
  if (r >= 0.8) return 'Alto';
  if (r >= 0.6) return 'Moderado';
  return 'Baixo';
}

function globalLevel(resultadoFinal: number): 'ALTA'|'MODERADA'|'BAIXA' {
  if (resultadoFinal > 80) return 'ALTA';
  if (resultadoFinal >= 60) return 'MODERADA';
  return 'BAIXA';
}

function computeAssessment(pillarScores: Record<Pillar, number>) {
  const scoreTotal = Object.values(pillarScores).reduce((a, b) => a + b, 0);
  const resultadoFinal = (scoreTotal / SCORE_DENOMINATOR) * 100;
  const pontosAtencao = (Object.keys(PILLAR_MAX) as Pillar[]).map((p) => ({
    pillar: p,
    level: pillarLevel(pillarScores[p] ?? 0, PILLAR_MAX[p]),
  }));
  return {
    scoreTotal,
    resultadoFinal: Number(resultadoFinal.toFixed(2)),
    nivelGlobal: globalLevel(resultadoFinal),
    pontosAtencao,
  };
}
```

## De onde vêm os `pillarScores`

No Typebot, cada resposta de cada pergunta seta `perguntaN_pesoM` e a soma
ponderada gera o `*_score` do pilar. Ao trazer o quiz pro app nativo, replique
esse mapeamento resposta→peso como dado (tabela `question_options` com
`weightContribution` por pilar). Pelo caminho Typebot, basta receber os
`answers` e recalcular aqui, OU receber os `pillarScores` já prontos — mas
prefira recalcular no app para ter uma fonte de verdade só.
