import { PILLAR_LABEL, PILLAR_SHORT_LABEL, type PillarKey } from '@/types/assessment';
import {
  CHECKLIST_PILLARS,
  CHECKLIST_PILLAR_INTRO,
  CHECKLIST_PILLAR_LABEL,
  CHECKLIST_PILLAR_SHORT_LABEL,
  type QuizVersion,
} from '@/types/checklist';
import type { QuizFlowQuestion } from '@/components/screens/QuizFlow';

export interface QuizSection {
  pillar: string;
  label: string;
  shortLabel: string;
  intro: string;
  startIndex: number;
  questionCount: number;
}

export interface QuizPillarMeta {
  label: string;
  shortLabel: string;
  intro: string;
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

/** Rótulos e textos de checkpoint dos pilares da versão de quiz servida. */
export function quizPillarMeta(version: QuizVersion): Record<string, QuizPillarMeta> {
  if (version === 'CHECKLIST_V2') {
    return Object.fromEntries(
      CHECKLIST_PILLARS.map((key) => [
        key,
        { label: CHECKLIST_PILLAR_LABEL[key], shortLabel: CHECKLIST_PILLAR_SHORT_LABEL[key], intro: CHECKLIST_PILLAR_INTRO[key] },
      ])
    );
  }
  return Object.fromEntries(
    (Object.keys(PILLAR_LABEL) as PillarKey[]).map((key) => [
      key,
      { label: PILLAR_LABEL[key], shortLabel: PILLAR_SHORT_LABEL[key], intro: PILLAR_INTRO[key] },
    ])
  );
}

export function buildSections(questions: QuizFlowQuestion[], meta: Record<string, QuizPillarMeta>): QuizSection[] {
  const sections: QuizSection[] = [];

  for (const [index, question] of questions.entries()) {
    const section = sections.at(-1);

    if (section?.pillar === question.pillar) {
      section.questionCount += 1;
      continue;
    }

    const pillarMeta = meta[question.pillar];
    sections.push({
      pillar: question.pillar,
      label: pillarMeta?.label ?? question.pillar,
      shortLabel: pillarMeta?.shortLabel ?? pillarMeta?.label ?? question.pillar,
      intro: pillarMeta?.intro ?? '',
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

/**
 * Um checkpoint (PillarIntroView) só aparece ao avançar para uma seção nova
 * que não seja a primeira — a pergunta 1 já é a abertura do quiz.
 */
export function crossesSectionBoundary(sections: QuizSection[], fromIndex: number, toIndex: number): boolean {
  if (toIndex <= fromIndex) return false;

  const { sectionIndex: toSectionIndex } = sectionForIndex(sections, toIndex);
  if (toSectionIndex === 0) return false;

  if (fromIndex < 0) return true;

  const { sectionIndex: fromSectionIndex } = sectionForIndex(sections, fromIndex);
  return toSectionIndex !== fromSectionIndex;
}

/** Alterna uma opção de múltipla escolha respeitando as exclusivas ("Nenhum desses" não convive com as outras). */
export function toggleOption(
  checked: string[],
  option: { id: string; exclusive?: boolean },
  options: { id: string; exclusive?: boolean }[]
): string[] {
  if (checked.includes(option.id)) return checked.filter((id) => id !== option.id);
  if (option.exclusive) return [option.id];
  const exclusiveIds = new Set(options.filter((o) => o.exclusive).map((o) => o.id));
  return [...checked.filter((id) => !exclusiveIds.has(id)), option.id];
}
