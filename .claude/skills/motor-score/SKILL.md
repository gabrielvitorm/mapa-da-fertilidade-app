---
name: motor-score
description: Use ao implementar ou alterar o cálculo do assessment de fertilidade (13 pilares, score global, classificação Baixa/Moderada/Alta) e os pontos de atenção do relatório. Garante fidelidade à lógica original do Typebot.
---

# Motor de score do assessment

Implemente como **função pura** em `/lib/scoring` com testes. A spec completa
está em `docs/02-motor-de-score.md`. Pontos que não podem ser alterados sem
confirmação da expert:

## Constantes

- 13 pilares, cada um com peso e máximo (tabela em `docs/02`).
- `SCORE_DENOMINATOR = 285` (fixo no Typebot). **Não** derive da soma dos máximos
  (que dá 291). Tratar como constante de calibração; há um TODO para confirmar.

## Fórmulas (fiéis ao original)

```
scoreTotal     = soma dos 13 pillarScores
resultadoFinal = (scoreTotal / 285) * 100
nivelGlobal:  > 80 ALTA | 60..80 MODERADA | < 60 BAIXA
```

## Nível por pilar = pontos de atenção

```
ratio = pillarScore / maxDoPilar
ratio >= 0.8 Alto | >= 0.6 Moderado | senão Baixo
```
Cada (pilar, nível) tem `{ diagnostico, recomendacao }`. São 13×3 textos —
migrados do Typebot para a tabela `pillar_messages` (conteúdo editável, não
hardcoded). Exibição:
```
{diagnostico}

*Recomendação:* {recomendacao}
```

## Fonte da verdade

O app **recalcula** o score a partir das `answers` cruas, tanto no caminho
Typebot quanto no nativo. Não confie em score pré-calculado vindo de fora.

## Testes obrigatórios

- Casos de fronteira: resultadoFinal exatamente 60 e 80 (devem cair em MODERADA).
- Cada pilar nos cortes 0.6 e 0.8.
- Score 0 e score máximo.
