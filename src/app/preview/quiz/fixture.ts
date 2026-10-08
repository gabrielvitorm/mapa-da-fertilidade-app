import type { QuizFlowQuestion } from '@/components/screens/QuizFlow';
import checklistSource from '../../../../prisma/seed-data/checklist-v2.json';

interface SourceQuestion {
  pillar: string;
  code: string;
  texto: string;
  helpText?: string;
  multiSelect?: boolean;
  options: { value: string; label: string; exclusive?: boolean }[];
}

/**
 * Perguntas reais do Checklist v2, lidas do mesmo JSON do seed — o preview
 * mostra exatamente o que vai ao ar. IDs são locais (o POST final falha de
 * propósito, para validar o estado de erro da tela de cálculo).
 */
export const fixtureQuestions: QuizFlowQuestion[] = (checklistSource.questions as SourceQuestion[]).map((q) => ({
  id: `preview_${q.code}`,
  pillar: q.pillar,
  texto: q.texto,
  helpText: q.helpText,
  multiSelect: q.multiSelect ?? false,
  options: q.options.map((o) => ({ id: `preview_${q.code}__${o.value}`, label: o.label, exclusive: o.exclusive })),
}));
