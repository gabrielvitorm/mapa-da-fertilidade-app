import type { QuizVersion } from '@/types/checklist';

/**
 * Versão do quiz servida em /quiz. O Checklist v2 é o padrão; o Mapa v1
 * (quiz original do Typebot) continua no banco e no código, só oculto —
 * `QUIZ_VERSION=MAPA_V1` o reativa sem deploy de código.
 */
export function activeQuizVersion(): QuizVersion {
  return process.env.QUIZ_VERSION === 'MAPA_V1' ? 'MAPA_V1' : 'CHECKLIST_V2';
}
