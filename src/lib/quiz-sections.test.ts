import assert from 'node:assert/strict';
import { buildSections, crossesSectionBoundary, sectionForIndex } from './quiz-sections';

const questions = [
  { id: 'q1', pillar: 'sono' as const, texto: '1', options: [] },
  { id: 'q2', pillar: 'sono' as const, texto: '2', options: [] },
  { id: 'q3', pillar: 'estresse' as const, texto: '3', options: [] },
  { id: 'q4', pillar: 'ciclo' as const, texto: '4', options: [] },
];

const sections = buildSections(questions);

assert.equal(sections.length, 3);
assert.deepEqual(sections[0], { pillar: 'sono', label: 'Sono', startIndex: 0, questionCount: 2 });
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

console.log('quiz-sections.test.ts: all assertions passed');
