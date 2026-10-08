import { PillarStatusBadge } from '@/components/ui/PillarStatusBadge';
import { PILLAR_STATUS_CLASSES } from '@/lib/checklist-theme';
import { CHECKLIST_PILLAR_ICON } from '@/lib/pillar-icons';
import { PILLAR_STATUS_LABEL, type ChecklistReport, type PillarStatus } from '@/types/checklist';

/** Ordem de leitura do mapa: do mais urgente ao não aplicável. */
const STATUS_ORDER: `${PillarStatus}`[] = ['3', '2', '1', 'ND', '0', 'NA'];

/**
 * Mapa visual dos 13 pilares: barra de distribuição por status + lista com o
 * selo de cada pilar. Não expõe porcentagem nem pontuação (orientação do manual).
 */
export function PillarStatusMap({ report }: { report: ChecklistReport }) {
  const total = report.pillars.length;
  const legend = STATUS_ORDER.filter((s) => report.statusCounts[s] > 0);

  return (
    <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4 sm:p-5 space-y-4 break-inside-avoid">
      <div className="space-y-1">
        <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] leading-tight">
          Seu mapa dos 13 pilares
        </h3>
        <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/70">
          Como cada pilar ficou a partir das suas respostas.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-border-soft)]" aria-hidden="true">
          {legend.map((s) => (
            <div
              key={s}
              className={`h-full ${PILLAR_STATUS_CLASSES[s].split(' ')[0]}`}
              style={{ width: `${(report.statusCounts[s] / total) * 100}%` }}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {legend.map((s) => (
            <li key={s} className="flex items-center gap-1.5 text-[10px] text-[var(--color-brand-brown)]/70">
              <span className={`inline-block w-2 h-2 rounded-full ${PILLAR_STATUS_CLASSES[s].split(' ')[0]}`} />
              {report.statusCounts[s]} {PILLAR_STATUS_LABEL[s].toLowerCase()}
            </li>
          ))}
        </ul>
      </div>

      <ul className="divide-y divide-[var(--color-border-soft)]">
        {report.pillars.map((p) => {
          const Icon = CHECKLIST_PILLAR_ICON[p.key];
          return (
            <li key={p.key} className="flex items-center gap-3 py-2.5">
              <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--color-brand-terracota)]" aria-hidden="true" />
              <span className="flex-1 min-w-0 text-[11.5px] leading-snug text-[var(--color-brand-brown)]">{p.label}</span>
              <PillarStatusBadge status={p.status} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
