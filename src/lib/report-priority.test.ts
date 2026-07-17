import assert from 'node:assert/strict';
import { rankPillars } from './report-priority';
import type { PillarResult } from '@/types/assessment';

function pillar(
  input: Pick<
    PillarResult,
    'key' | 'label' | 'level' | 'diagnostico' | 'recomendacao' | 'score' | 'max' | 'ratio' | 'peso'
  > & {
    locked?: boolean;
  }
): PillarResult {
  return {
    locked: false,
    ...input,
  };
}

function keysOf(result: PillarResult[]) {
  return result.map((pillar) => pillar.key);
}

const rankingCase = rankPillars([
  pillar({
    key: 'estresse',
    label: 'Estresse',
    level: 'Baixo',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 6,
    max: 30,
    ratio: 0.2,
    peso: 3,
  }),
  pillar({
    key: 'ciclo',
    label: 'Ciclo',
    level: 'Moderado',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 12,
    max: 30,
    ratio: 0.4,
    peso: 3,
  }),
  pillar({
    key: 'saude_hormonal',
    label: 'Saúde Hormonal',
    level: 'Moderado',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 15,
    max: 30,
    ratio: 0.5,
    peso: 3,
  }),
  pillar({
    key: 'toxinas',
    label: 'Toxinas',
    level: 'Baixo',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 5,
    max: 20,
    ratio: 0.25,
    peso: 2,
  }),
  pillar({
    key: 'alimentacao',
    label: 'Alimentação',
    level: 'Moderado',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 12,
    max: 20,
    ratio: 0.6,
    peso: 2,
  }),
  pillar({
    key: 'saude_intestinal',
    label: 'Saúde Intestinal',
    level: 'Moderado',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 7,
    max: 10,
    ratio: 0.7,
    peso: 1,
  }),
  pillar({
    key: 'sono',
    label: 'Sono',
    level: 'Alto',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 18,
    max: 20,
    ratio: 0.9,
    peso: 3,
  }),
  pillar({
    key: 'imunidade',
    label: 'Imunidade',
    level: 'Alto',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 19,
    max: 20,
    ratio: 0.95,
    peso: 3,
    locked: true,
  }),
]);

assert.deepEqual(keysOf(rankingCase.priorities), ['estresse', 'ciclo', 'saude_hormonal']);
assert.equal(rankingCase.priorities.length, 3);
assert.equal(
  rankingCase.priorities.some((pillar) => pillar.key === 'imunidade'),
  false,
  'locked fica fora das prioridades'
);

assert.deepEqual(keysOf(rankingCase.strengths), ['sono', 'saude_intestinal', 'alimentacao']);
assert.equal(rankingCase.strengths.length, 3);
assert.equal(
  rankingCase.strengths.some((pillar) => pillar.key === 'imunidade'),
  false,
  'locked fica fora das fortalezas'
);

assert.deepEqual(keysOf(rankingCase.actionItems), ['estresse', 'ciclo', 'saude_hormonal', 'toxinas', 'alimentacao']);
assert.equal(rankingCase.actionItems.length, 5);
assert.equal(
  rankingCase.actionItems.every((pillar) => pillar.level !== 'Alto'),
  true,
  'actionItems não inclui pilares de nível Alto'
);
assert.equal(
  rankingCase.actionItems.some((pillar) => pillar.key === 'imunidade'),
  false,
  'locked fica fora do plano de ação'
);

const strengthWeightCase = rankPillars([
  pillar({
    key: 'sono',
    label: 'Sono',
    level: 'Alto',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 18,
    max: 20,
    ratio: 0.9,
    peso: 3,
  }),
  pillar({
    key: 'estresse',
    label: 'Estresse',
    level: 'Alto',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 12,
    max: 20,
    ratio: 0.9,
    peso: 2,
  }),
  pillar({
    key: 'alimentacao',
    label: 'Alimentação',
    level: 'Moderado',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 8,
    max: 20,
    ratio: 0.4,
    peso: 1,
  }),
]);

assert.deepEqual(keysOf(strengthWeightCase.strengths), ['sono', 'estresse', 'alimentacao']);

const strengthScoreCase = rankPillars([
  pillar({
    key: 'sono',
    label: 'Sono',
    level: 'Alto',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 18,
    max: 20,
    ratio: 0.9,
    peso: 3,
  }),
  pillar({
    key: 'ciclo',
    label: 'Ciclo',
    level: 'Alto',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 16,
    max: 20,
    ratio: 0.8,
    peso: 2,
  }),
  pillar({
    key: 'saude_hormonal',
    label: 'Saúde Hormonal',
    level: 'Alto',
    diagnostico: 'd',
    recomendacao: 'r',
    score: 22,
    max: 20,
    ratio: 0.8,
    peso: 2,
  }),
]);

assert.deepEqual(keysOf(strengthScoreCase.strengths), ['sono', 'ciclo', 'saude_hormonal']);

console.log('report-priority.test.ts: all assertions passed');
