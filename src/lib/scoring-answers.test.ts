import assert from 'node:assert/strict';
import { computePillarScores, type AnsweredOption } from './scoring-answers';

const WEIGHTS = {
  fatores_infertilidade: 3, saude_hormonal: 3, ciclo: 3, sono: 2, imunidade: 2,
  atividade_fisica: 2, alimentacao: 2, saude_intestinal: 2, figado: 2, estresse: 2,
  tireoide: 2, toxinas: 1, historico: 1,
} as const;

// Duas respostas no mesmo pilar somam antes de multiplicar pelo peso
{
  const answers: AnsweredOption[] = [
    { pillar: 'sono', rawScore: 3 },
    { pillar: 'sono', rawScore: 2 },
  ];
  const result = computePillarScores(answers, WEIGHTS as any);
  assert.equal(result.sono, (3 + 2) * 2); // peso sono = 2
}

// Pilar sem nenhuma resposta fica em 0, não undefined
{
  const result = computePillarScores([], WEIGHTS as any);
  assert.equal(result.historico, 0);
  assert.equal(Object.keys(result).length, 13);
}

// rawScore 0 (ex.: opção "não sei") não contribui, mas pilar continua presente
{
  const answers: AnsweredOption[] = [{ pillar: 'saude_hormonal', rawScore: 0 }];
  const result = computePillarScores(answers, WEIGHTS as any);
  assert.equal(result.saude_hormonal, 0);
}

console.log('scoring-answers.test.ts: all assertions passed');
