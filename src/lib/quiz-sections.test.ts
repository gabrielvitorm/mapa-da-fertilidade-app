import assert from 'node:assert/strict';
import { buildSections, sectionForIndex } from './quiz-sections';

const questions = [
  { id: 'q1', pillar: 'sono' as const, texto: '1', options: [] },
  { id: 'q2', pillar: 'sono' as const, texto: '2', options: [] },
  { id: 'q3', pillar: 'estresse' as const, texto: '3', options: [] },
];

const sections = buildSections(questions);

assert.equal(sections.length, 2);
assert.deepEqual(sections[0], { pillar: 'sono', label: 'Sono', startIndex: 0, questionCount: 2 });
assert.deepEqual(sectionForIndex(sections, 2), {
  section: sections[1],
  sectionIndex: 1,
  questionInSection: 0,
});

console.log('quiz-sections.test.ts: all assertions passed');
