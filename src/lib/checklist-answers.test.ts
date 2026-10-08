import assert from 'node:assert/strict';
import { toChecklistAnswers, validateChecklistSelection } from './checklist-answers';

const questions = [
  { id: 'q_idade', code: 'idade', multiSelect: false, options: [{ id: 'a', exclusive: false }, { id: 'b', exclusive: false }] },
  {
    id: 'q_dor',
    code: 'dor_pelvica',
    multiSelect: true,
    options: [
      { id: 'x', exclusive: false },
      { id: 'y', exclusive: false },
      { id: 'nenhum', exclusive: true },
    ],
  },
];

const ok = [
  { questionId: 'q_idade', optionId: 'a' },
  { questionId: 'q_dor', optionId: 'x' },
  { questionId: 'q_dor', optionId: 'y' },
];
assert.equal(validateChecklistSelection(questions, ok), null);

assert.match(validateChecklistSelection(questions, ok.slice(0, 1))!, /sem resposta: dor_pelvica/);
assert.match(
  validateChecklistSelection(questions, [...ok, { questionId: 'q_idade', optionId: 'b' }])!,
  /escolha única/
);
assert.match(
  validateChecklistSelection(questions, [...ok, { questionId: 'q_dor', optionId: 'nenhum' }])!,
  /exclusiva/
);
assert.match(validateChecklistSelection(questions, [...ok, { questionId: 'q_dor', optionId: 'x' }])!, /repetida/);
assert.match(
  validateChecklistSelection(questions, [
    { questionId: 'q_idade', optionId: 'x' },
    { questionId: 'q_dor', optionId: 'y' },
  ])!,
  /não pertence/
);
assert.match(validateChecklistSelection(questions, [...ok, { questionId: 'q_extra', optionId: 'z' }])!, /não faz parte/);

assert.deepEqual(
  toChecklistAnswers([
    { questionId: 'q1', optionId: 'o1', questionCode: 'dor_pelvica', value: 'x' },
    { questionId: 'q1', optionId: 'o2', questionCode: 'dor_pelvica', value: 'y' },
    { questionId: 'q2', optionId: 'o3', questionCode: 'idade', value: 'lt35' },
  ]),
  { dor_pelvica: ['x', 'y'], idade: ['lt35'] }
);

console.log('checklist-answers.test.ts: all assertions passed');
