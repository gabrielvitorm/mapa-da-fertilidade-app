export interface QuizProgressSnapshot {
  answers: Record<string, string>;
  index: number;
  updatedAt: number;
}

const QUIZ_PROGRESS_KEY = 'mapa:quizProgress:v1';
const MAX_PROGRESS_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getStorage() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

function isQuizProgressSnapshot(value: unknown, questionIds: string[]): value is QuizProgressSnapshot {
  if (!value || typeof value !== 'object') return false;

  const snapshot = value as Partial<QuizProgressSnapshot>;
  if (
    !snapshot.answers ||
    typeof snapshot.answers !== 'object' ||
    typeof snapshot.index !== 'number' ||
    !Number.isInteger(snapshot.index) ||
    snapshot.index < 0 ||
    snapshot.index >= questionIds.length ||
    typeof snapshot.updatedAt !== 'number' ||
    !Number.isFinite(snapshot.updatedAt) ||
    Date.now() - snapshot.updatedAt > MAX_PROGRESS_AGE_MS
  ) {
    return false;
  }

  const questionIdSet = new Set(questionIds);
  return Object.entries(snapshot.answers).every(
    ([questionId, optionId]) => questionIdSet.has(questionId) && typeof optionId === 'string'
  );
}

export function loadQuizProgress(questionIds: string[]): QuizProgressSnapshot | null {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(QUIZ_PROGRESS_KEY);
    if (!raw) return null;

    const snapshot: unknown = JSON.parse(raw);
    if (isQuizProgressSnapshot(snapshot, questionIds)) return snapshot;

    storage?.removeItem(QUIZ_PROGRESS_KEY);
  } catch {
    // Storage is optional: restricted contexts must not block the quiz.
  }

  return null;
}

export function saveQuizProgress(snapshot: QuizProgressSnapshot) {
  try {
    getStorage()?.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage is optional: restricted contexts must not block the quiz.
  }
}

export function clearQuizProgress() {
  try {
    getStorage()?.removeItem(QUIZ_PROGRESS_KEY);
  } catch {
    // Storage is optional: restricted contexts must not block the quiz.
  }
}
