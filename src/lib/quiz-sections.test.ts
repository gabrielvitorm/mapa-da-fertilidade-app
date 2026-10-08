import assert from 'node:assert/strict';
import { buildSections, crossesSectionBoundary, quizPillarMeta, sectionForIndex, toggleOption } from './quiz-sections';

const questions = [
  { id: 'q1', pillar: 'sono', texto: '1', options: [] },
  { id: 'q2', pillar: 'sono', texto: '2', options: [] },
  { id: 'q3', pillar: 'estresse', texto: '3', options: [] },
  { id: 'q4', pillar: 'ciclo', texto: '4', options: [] },
];

const sections = buildSections(questions, quizPillarMeta('MAPA_V1'));

assert.equal(sections.length, 3);
assert.deepEqual(sections[0], {
  pillar: 'sono',
  label: 'Sono',
  shortLabel: 'Sono',
  intro: 'Vamos entender como o descanso faz parte da sua saúde.',
  startIndex: 0,
  questionCount: 2,
});

// Checklist v2: rótulo completo no checkpoint, rótulo curto no cabeçalho da pergunta.
const v2 = buildSections(
  [{ id: 'a', pillar: 'endometriose_pelve', texto: 'a', options: [] }],
  quizPillarMeta('CHECKLIST_V2')
);
assert.equal(v2[0].label, 'Endometriose, adenomiose e anatomia pélvica');
assert.equal(v2[0].shortLabel, 'Endometriose e pelve');
assert.deepEqual(sectionForIndex(sections, 2), {
  section: sections[1],
  sectionIndex: 1,
  questionInSection: 0,
});

// Avançar dentro da mesma seção -> sem checkpoint
assert.equal(crossesSectionBoundary(sections, 0, 1), false);

// Avançar cruzando pra uma seção não-inicial -> checkpoint
assert.equal(crossesSectionBoundary(sections, 1, 2), true);

// Avançar cruzando de novo (seção 1 -> seção 2) -> checkpoint
assert.equal(crossesSectionBoundary(sections, 2, 3), true);

// Voltar cruzando seção -> nunca mostra checkpoint
assert.equal(crossesSectionBoundary(sections, 2, 1), false);

// Entrar na primeira seção (índice 0) -> nunca mostra checkpoint, mesmo "vindo de fora"
assert.equal(crossesSectionBoundary(sections, -1, 0), false);

// Múltipla escolha: "Nenhum" é exclusivo nos dois sentidos.
const opcoes = [{ id: 'a' }, { id: 'b' }, { id: 'nenhum', exclusive: true }];
assert.deepEqual(toggleOption([], opcoes[0], opcoes), ['a']);
assert.deepEqual(toggleOption(['a'], opcoes[1], opcoes), ['a', 'b']);
assert.deepEqual(toggleOption(['a', 'b'], opcoes[2], opcoes), ['nenhum']);
assert.deepEqual(toggleOption(['nenhum'], opcoes[0], opcoes), ['a']);
assert.deepEqual(toggleOption(['a', 'b'], opcoes[0], opcoes), ['b']);

console.log('quiz-sections.test.ts: all assertions passed');
