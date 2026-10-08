import { PILLAR_STATUS_CLASSES } from '@/lib/checklist-theme';
import { PILLAR_STATUS_LABEL, type PillarStatus } from '@/types/checklist';

/** Selo do status de um pilar do Checklist v2 (Favorável → Prioridade alta, ND, NA). */
export function PillarStatusBadge({ status }: { status: PillarStatus }) {
  return (
    <span
      className={`inline-block shrink-0 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${PILLAR_STATUS_CLASSES[`${status}`]}`}
    >
      {PILLAR_STATUS_LABEL[`${status}`]}
    </span>
  );
}
