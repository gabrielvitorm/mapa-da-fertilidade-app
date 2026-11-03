export interface QuizProgressSnapshot {
  /** questionId → optionIds marcados (um só em perguntas de escolha única). */
  answers: Record<string, string[]>;
  index: number;
  updatedAt: number;
}

export interface QuizProgressQuestion {
  id: string;
  optionIds: readonly string[];
}

// v2: respostas viraram listas (múltipla escolha); snapshots v1 são ignorados.
const QUIZ_PROGRESS_KEY = 'mapa:quizProgress:v2';
const MAX_PROGRESS_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getStorage() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

function isQuizProgressSnapshot(
  value: unknown,
  questions: readonly QuizProgressQuestion[]
): value is QuizProgressSnapshot {
  if (!value || typeof value !== 'object') return false;

  const snapshot = value as Partial<QuizProgressSnapshot>;
  if (
    !snapshot.answers ||
    typeof snapshot.answers !== 'object' ||
    typeof snapshot.index !== 'number' ||
    !Number.isInteger(snapshot.index) ||
    snapshot.index < 0 ||
    snapshot.index >= questions.length ||
    typeof snapshot.updatedAt !== 'number' ||
    !Number.isFinite(snapshot.updatedAt) ||
    Date.now() - snapshot.updatedAt > MAX_PROGRESS_AGE_MS
  ) {
    return false;
  }

  const questionOptions = new Map(questions.map((question) => [question.id, new Set(question.optionIds)]));
  return Object.entries(snapshot.answers).every(
    ([questionId, optionIds]) =>
      questionOptions.has(questionId) &&
      Array.isArray(optionIds) &&
      optionIds.length > 0 &&
      optionIds.every((id) => typeof id === 'string' && questionOptions.get(questionId)?.has(id))
  );
}

export function loadQuizProgress(questions: readonly QuizProgressQuestion[]): QuizProgressSnapshot | null {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(QUIZ_PROGRESS_KEY);
    if (!raw) return null;

    const snapshot: unknown = JSON.parse(raw);
    if (isQuizProgressSnapshot(snapshot, questions)) return snapshot;

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
