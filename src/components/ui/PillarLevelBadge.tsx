import type { PillarLevel } from '@/types/assessment';

const LEVEL_STYLES: Record<PillarLevel, string> = {
  Alto: 'bg-[var(--color-level-alto-bg)] text-[var(--color-level-alto-fg)]',
  Moderado: 'bg-[var(--color-level-moderado-bg)] text-[var(--color-level-moderado-fg)]',
  Baixo: 'bg-[var(--color-level-baixo-bg)] text-[var(--color-level-baixo-fg)]',
};

export function PillarLevelBadge({ level }: { level: PillarLevel }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${LEVEL_STYLES[level]}`}
    >
      {level}
    </span>
  );
}
