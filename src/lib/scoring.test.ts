import assert from 'node:assert/strict';
import { computeAssessment, type ScoreRuleInput } from './scoring';
import type { PillarKey } from '@/types/assessment';

const RULES: ScoreRuleInput[] = [
  { pillar: 'fatores_infertilidade', peso: 3, maxDoPilar: 72 },
  { pillar: 'saude_hormonal', peso: 3, maxDoPilar: 36 },
  { pillar: 'ciclo', peso: 3, maxDoPilar: 27 },
  { pillar: 'sono', peso: 2, maxDoPilar: 24 },
  { pillar: 'imunidade', peso: 2, maxDoPilar: 24 },
  { pillar: 'atividade_fisica', peso: 2, maxDoPilar: 18 },
  { pillar: 'alimentacao', peso: 2, maxDoPilar: 18 },
  { pillar: 'saude_intestinal', peso: 2, maxDoPilar: 18 },
  { pillar: 'figado', peso: 2, maxDoPilar: 18 },
  { pillar: 'estresse', peso: 2, maxDoPilar: 18 },
  { pillar: 'tireoide', peso: 2, maxDoPilar: 9 },
  { pillar: 'toxinas', peso: 1, maxDoPilar: 6 },
  { pillar: 'historico', peso: 1, maxDoPilar: 3 },
];
const SCORE_DENOMINATOR = 285;

function zeroScores(overrides: Partial<Record<string, number>> = {}) {
  const base: Record<string, number> = {};
  for (const r of RULES) base[r.pillar] = overrides[r.pillar] ?? 0;
  return base as Record<ScoreRuleInput['pillar'], number>;
}

// Score 0 -> BAIXA, todos os pilares Baixo
{
  const result = computeAssessment(zeroScores(), RULES, SCORE_DENOMINATOR);
  assert.equal(result.scoreTotal, 0);
  assert.equal(result.resultadoFinal, 0);
  assert.equal(result.nivelGlobal, 'BAIXA');
  assert.equal(result.pontosAtencao.length, 13);
  assert.ok(result.pontosAtencao.every((p) => p.level === 'Baixo'));
}

// Score máximo (soma dos maxDoPilar = 291) -> resultadoFinal > 100, ALTA, todos Alto
{
  const maxed = zeroScores();
  for (const r of RULES) maxed[r.pillar] = r.maxDoPilar;
  const result = computeAssessment(maxed, RULES, SCORE_DENOMINATOR);
  assert.equal(result.scoreTotal, 291);
  assert.equal(result.resultadoFinal, Number(((291 / 285) * 100).toFixed(2)));
  assert.equal(result.nivelGlobal, 'ALTA');
  assert.ok(result.pontosAtencao.every((p) => p.level === 'Alto'));
}

// Fronteira: resultadoFinal exatamente 80 -> MODERADA (regra é "> 80" para ALTA)
{
  // scoreTotal necessário para resultadoFinal = 80: (scoreTotal/285)*100 = 80 -> scoreTotal = 228
  const rulesUmPilar: ScoreRuleInput[] = [{ pillar: 'fatores_infertilidade', peso: 3, maxDoPilar: 72 }];
  const scoresUmPilar = { fatores_infertilidade: 228 } as Record<PillarKey, number>;
  const result = computeAssessment(scoresUmPilar, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(result.resultadoFinal, 80);
  assert.equal(result.nivelGlobal, 'MODERADA');
}

// Fronteira: resultadoFinal exatamente 60 -> MODERADA
{
  const rulesUmPilar: ScoreRuleInput[] = [{ pillar: 'fatores_infertilidade', peso: 3, maxDoPilar: 72 }];
  const scoresUmPilar = { fatores_infertilidade: 171 } as Record<PillarKey, number>; // (171/285)*100 = 60
  const result = computeAssessment(scoresUmPilar, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(result.resultadoFinal, 60);
  assert.equal(result.nivelGlobal, 'MODERADA');
}

// Nível por pilar: corte 0.8 (Alto) e 0.6 (Moderado) exatos
{
  const rulesUmPilar: ScoreRuleInput[] = [{ pillar: 'sono', peso: 1, maxDoPilar: 100 }];
  const alto = computeAssessment({ sono: 80 } as Record<PillarKey, number>, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(alto.pontosAtencao[0].level, 'Alto');
  const moderado = computeAssessment({ sono: 60 } as Record<PillarKey, number>, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(moderado.pontosAtencao[0].level, 'Moderado');
  const baixo = computeAssessment({ sono: 59 } as Record<PillarKey, number>, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(baixo.pontosAtencao[0].level, 'Baixo');
}

console.log('scoring.test.ts: all assertions passed');
