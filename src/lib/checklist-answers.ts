import type { ChecklistAnswers } from '@/types/checklist';

/** Formato persistido em Assessment.answers para o quiz v2 (sobrevive a re-seed). */
export interface ChecklistStoredAnswer {
  questionId: string;
  optionId: string;
  questionCode: string;
  value: string;
}

export function toChecklistAnswers(stored: ChecklistStoredAnswer[]): ChecklistAnswers {
  const answers: ChecklistAnswers = {};
  for (const { questionCode, value } of stored) {
    (answers[questionCode] ??= []).push(value);
  }
  return answers;
}

export interface ChecklistQuestionShape {
  id: string;
  code: string;
  multiSelect: boolean;
  options: { id: string; exclusive: boolean }[];
}

/**
 * Garante que o envio cobre o checklist inteiro e respeita o formato de cada
 * pergunta. Devolve a mensagem do primeiro problema, ou null se está válido.
 */
export function validateChecklistSelection(
  questions: ChecklistQuestionShape[],
  selection: { questionId: string; optionId: string }[]
): string | null {
  const byQuestion = new Map<string, string[]>();
  for (const { questionId, optionId } of selection) {
    const ids = byQuestion.get(questionId) ?? [];
    if (ids.includes(optionId)) return `Opção repetida na pergunta ${questionId}`;
    byQuestion.set(questionId, [...ids, optionId]);
  }

  for (const q of questions) {
    const chosen = byQuestion.get(q.id) ?? [];
    if (chosen.length === 0) return `Pergunta sem resposta: ${q.code}`;
    if (!q.multiSelect && chosen.length > 1) return `Pergunta de escolha única com mais de uma resposta: ${q.code}`;
    for (const optionId of chosen) {
      const option = q.options.find((o) => o.id === optionId);
      if (!option) return `Opção ${optionId} não pertence à pergunta ${q.code}`;
      if (option.exclusive && chosen.length > 1) return `Opção exclusiva combinada com outras: ${q.code}`;
    }
    byQuestion.delete(q.id);
  }

  if (byQuestion.size > 0) return 'Resposta para pergunta que não faz parte do checklist';
  return null;
}
