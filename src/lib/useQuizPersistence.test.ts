import assert from 'node:assert/strict';
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from './useQuizPersistence';

const STORAGE_KEY = 'mapa:quizProgress:v2';
const questions = [
  { id: 'q1', optionIds: ['a', 'b'] },
  { id: 'q2', optionIds: ['b', 'c'] },
  { id: 'q3', optionIds: ['d'] },
];

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

saveQuizProgress({ answers: { q1: ['a'], q2: ['b', 'c'] }, index: 1, updatedAt: Date.now() });
const progress = loadQuizProgress(questions);

assert.equal(progress?.index, 1);
assert.deepEqual(progress?.answers.q2, ['b', 'c']);

// Snapshot no formato antigo (string em vez de lista) é descartado.
storage.setItem(STORAGE_KEY, JSON.stringify({ answers: { q1: 'a' }, index: 1, updatedAt: Date.now() }));
assert.equal(loadQuizProgress(questions), null);
assert.equal(storage.getItem(STORAGE_KEY), null);

storage.setItem(
  STORAGE_KEY,
  JSON.stringify({ answers: { q1: ['a'] }, index: 0, updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 })
);
assert.equal(loadQuizProgress(questions), null);
assert.equal(storage.getItem(STORAGE_KEY), null);

storage.setItem(
  STORAGE_KEY,
  JSON.stringify({ answers: { orphan: ['a'] }, index: 0, updatedAt: Date.now() })
);
assert.equal(loadQuizProgress(questions), null);
assert.equal(storage.getItem(STORAGE_KEY), null);

// Uma opção removida ou renomeada pelo seed também invalida o snapshot.
storage.setItem(
  STORAGE_KEY,
  JSON.stringify({ answers: { q1: ['removed-option'] }, index: 1, updatedAt: Date.now() })
);
assert.equal(loadQuizProgress(questions), null);
assert.equal(storage.getItem(STORAGE_KEY), null);

clearQuizProgress();
assert.equal(loadQuizProgress(questions), null);

console.log('useQuizPersistence.test.ts: all assertions passed');
