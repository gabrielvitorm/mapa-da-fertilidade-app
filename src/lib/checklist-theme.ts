import type { ChecklistClassification, PillarStatus } from '@/types/checklist';

/** Cor de destaque por classificação — tokens do globals.css, nunca hex solto. */
export const CLASSIFICATION_COLOR: Record<ChecklistClassification, string> = {
  FAVORAVEL: 'var(--color-brand-sage)',
  INTERMEDIARIA: 'var(--color-brand-gold)',
  ALTA_PRIORIDADE: 'var(--color-brand-terracota)',
  INCONCLUSIVA: 'var(--color-brand-brown)',
};

/** Frase curta para teaser e dashboard (o texto longo do manual vai no relatório). */
export const CLASSIFICATION_SHORT_TEXT: Record<ChecklistClassification, string> = {
  FAVORAVEL: 'Nenhum sinal de alta prioridade nas suas respostas. O relatório mostra como manter esse cenário.',
  INTERMEDIARIA: 'Há pontos que merecem ajustes ou investigação. O relatório mostra onde concentrar o cuidado.',
  ALTA_PRIORIDADE: 'Alguns fatores pedem avaliação médica prioritária. O relatório mostra quais e por onde começar.',
  INCONCLUSIVA: 'Faltam dados essenciais para concluir o seu perfil. O relatório mostra quais exames buscar primeiro.',
};

export const PILLAR_STATUS_CLASSES: Record<`${PillarStatus}`, string> = {
  '0': 'bg-[var(--color-level-alto-bg)] text-[var(--color-level-alto-fg)]',
  '1': 'bg-[var(--color-level-moderado-bg)] text-[var(--color-level-moderado-fg)]',
  '2': 'bg-[var(--color-level-baixo-bg)] text-[var(--color-level-baixo-fg)]',
  '3': 'bg-[var(--color-brand-terracota)] text-white',
  ND: 'bg-[var(--color-brand-brown)]/10 text-[var(--color-brand-brown)]',
  NA: 'bg-[var(--color-border-soft)] text-[var(--color-brand-brown)]/60',
};
