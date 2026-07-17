import { PILLAR_LABEL, type PillarKey } from '@/types/assessment';
import type { QuizFlowQuestion } from '@/components/screens/QuizFlow';

export interface QuizSection {
  pillar: PillarKey;
  label: string;
  startIndex: number;
  questionCount: number;
}

export const PILLAR_INTRO: Record<PillarKey, string> = {
  fatores_infertilidade: 'Vamos olhar para fatores que podem influenciar a fertilidade.',
  saude_hormonal: 'Agora vamos observar os sinais da sua saúde hormonal.',
  ciclo: 'Seu ciclo menstrual traz informações importantes sobre o seu corpo.',
  sono: 'Vamos entender como o descanso faz parte da sua saúde.',
  imunidade: 'Agora vamos olhar para os sinais do seu sistema imunológico.',
  atividade_fisica: 'Seu movimento diário também compõe este mapa.',
  alimentacao: 'Vamos observar como sua alimentação apoia sua rotina.',
  saude_intestinal: 'Seu intestino tem um papel importante no equilíbrio do corpo.',
  figado: 'Agora vamos considerar hábitos que impactam a saúde do fígado.',
  estresse: 'Vamos entender como o estresse aparece na sua rotina.',
  tireoide: 'A tireoide ajuda a regular processos importantes do organismo.',
  toxinas: 'Agora vamos observar sua exposição a toxinas no dia a dia.',
  historico: 'Por fim, vamos reunir informações importantes do seu histórico.',
};

export function buildSections(questions: QuizFlowQuestion[]): QuizSection[] {
  const sections: QuizSection[] = [];

  for (const [index, question] of questions.entries()) {
    const section = sections.at(-1);

    if (section?.pillar === question.pillar) {
      section.questionCount += 1;
      continue;
    }

    sections.push({
      pillar: question.pillar,
      label: PILLAR_LABEL[question.pillar],
      startIndex: index,
      questionCount: 1,
    });
  }

  return sections;
}

export function sectionForIndex(
  sections: QuizSection[],
  index: number
): { section: QuizSection; sectionIndex: number; questionInSection: number } {
  const sectionIndex = sections.findIndex(
    (section) => index >= section.startIndex && index < section.startIndex + section.questionCount
  );

  if (sectionIndex === -1) {
    throw new RangeError(`Question index ${index} does not belong to a quiz section.`);
  }

  const section = sections[sectionIndex];
  return { section, sectionIndex, questionInSection: index - section.startIndex };
}
