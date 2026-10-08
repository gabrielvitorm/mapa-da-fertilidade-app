import { ChevronDown, ClipboardList, Leaf, TriangleAlert } from 'lucide-react';
import { PillarStatusBadge } from '@/components/ui/PillarStatusBadge';
import { PillarStatusMap } from '@/components/ui/PillarStatusMap';
import { CLASSIFICATION_COLOR } from '@/lib/checklist-theme';
import { CHECKLIST_PILLAR_ICON } from '@/lib/pillar-icons';
import { COMPLETENESS_LABEL, type ChecklistReport, type ChecklistReportPillar } from '@/types/checklist';

/**
 * Conteúdo do relatório do Checklist v2, no formato do "Modelo de relatório
 * individual" do manual: resultado → travas → dados pendentes → prioridades →
 * pontos favoráveis → resumo por pilar → encerramento. Sem porcentagem em
 * lugar nenhum (orientação explícita do manual).
 *
 * Server Component: a expansão dos pilares usa <details>, que também imprime
 * aberto quando `expanded` é true (versão PDF).
 */

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] leading-tight">{title}</h3>
      {description && (
        <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/70">{description}</p>
      )}
    </div>
  );
}

function PillarCard({ pillar, expanded }: { pillar: ChecklistReportPillar; expanded: boolean }) {
  const Icon = CHECKLIST_PILLAR_ICON[pillar.key];

  return (
    <details
      open={expanded || undefined}
      className="group bg-white rounded-xl border border-[var(--color-border-soft)] overflow-hidden break-inside-avoid"
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer p-4 flex items-center gap-3 hover:bg-[var(--color-surface-cream)]/50">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-terracota)]/10 flex items-center justify-center text-[var(--color-brand-terracota)] shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h4 className="text-xs font-bold text-[var(--color-brand-brown)] leading-snug">{pillar.label}</h4>
          <div className="flex flex-wrap items-center gap-1.5">
            <PillarStatusBadge status={pillar.status} />
            {pillar.findings.length > 0 && (
              <span className="text-[10px] text-[var(--color-brand-brown)]/50">
                {pillar.findings.length} {pillar.findings.length === 1 ? 'achado' : 'achados'}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-brand-terracota)] transition-transform group-open:rotate-180" />
      </summary>

      <div className="p-4 bg-[var(--color-surface-cream)]/50 text-xs text-[var(--color-brand-brown)]/95 space-y-3 leading-relaxed border-t border-[var(--color-border-soft)]">
        {pillar.findings.map((f) => (
          <div key={f.key}>
            <strong className="text-[var(--color-brand-terracota)] block text-[11px] font-bold mb-0.5">{f.title}</strong>
            <p>{f.body}</p>
          </div>
        ))}
        <div>
          <strong className="text-[var(--color-brand-sage)] block uppercase tracking-wider text-[9px] font-bold mb-0.5">
            Próximo passo
          </strong>
          <p>{pillar.nextStep}</p>
        </div>
      </div>
    </details>
  );
}

export function ChecklistReportBody({ report, expanded = false }: { report: ChecklistReport; expanded?: boolean }) {
  const cor = CLASSIFICATION_COLOR[report.classification];

  return (
    <div className="space-y-6">
      {/* Resultado do checklist */}
      <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-6 text-center relative overflow-hidden break-inside-avoid">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-15" style={{ background: cor }} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/50 mb-1">
          Resultado do checklist
        </p>
        <h2 className="font-serif italic text-2xl font-bold mb-3" style={{ color: cor }}>
          {report.classificationLabel}
        </h2>
        <p className="text-[12px] leading-relaxed text-[var(--color-brand-brown)]/85 max-w-[320px] mx-auto">
          {report.classificationText}
        </p>
        <p className="mt-4 inline-block rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-brown)]/70">
          Completude dos dados: {COMPLETENESS_LABEL[report.completeness]}
        </p>
      </section>

      <PillarStatusMap report={report} />

      {report.locks.length > 0 && (
        <section className="space-y-3 break-inside-avoid">
          <SectionTitle
            title="Pontos que pedem avaliação prioritária"
            description="Indicam prioridade de encaminhamento. Não significam impossibilidade de gravidez."
          />
          <div className="space-y-2">
            {report.locks.map((lock) => (
              <div
                key={lock.key}
                className="flex gap-3 rounded-xl border border-[var(--color-brand-terracota)]/30 bg-[var(--color-brand-terracota)]/5 p-4"
              >
                <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-brand-terracota)]" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--color-brand-brown)]">{lock.title}</p>
                  <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/80">{lock.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.missingData.length > 0 && (
        <section className="space-y-3 break-inside-avoid">
          <SectionTitle
            title="Dados que faltam para concluir"
            description="Avaliações que já são indicadas para o seu momento e ainda não foram feitas."
          />
          <div className="space-y-2">
            {report.missingData.map((m) => (
              <div key={m.key} className="flex gap-3 rounded-xl border border-[var(--color-border-soft)] bg-white p-4">
                <ClipboardList className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-brand-brown)]/60" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--color-brand-brown)]">{m.label}</p>
                  <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/75">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.priorities.length > 0 && (
        <section className="space-y-3 break-inside-avoid">
          <SectionTitle title="Principais prioridades" description="Os pilares que mais pedem atenção agora, em ordem." />
          <ol className="space-y-3">
            {report.priorities.map((p, index) => (
              <li key={p.key} className="rounded-2xl border border-[var(--color-border-soft)] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-terracota)] text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--color-brand-brown)] leading-snug">{p.label}</p>
                      <PillarStatusBadge status={p.status} />
                    </div>
                    {p.findings.some((f) => f.points > 0) && (
                      <ul className="space-y-1">
                        {p.findings
                          .filter((f) => f.points > 0)
                          .map((f) => (
                            <li key={f.key} className="flex items-start gap-2 text-[11px] text-[var(--color-brand-brown)]/70">
                              <span className="w-1 h-1 rounded-full bg-[var(--color-brand-terracota)] shrink-0 mt-[6px]" />
                              {f.title}
                            </li>
                          ))}
                      </ul>
                    )}
                    <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/85">{p.nextStep}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {report.favorables.length > 0 && (
        <section className="space-y-3 break-inside-avoid">
          <SectionTitle title="Pontos favoráveis identificados" />
          <div className="rounded-xl border border-[var(--color-brand-sage)]/30 bg-[var(--color-brand-sage)]/8 p-4">
            <div className="flex flex-wrap gap-1.5">
              {report.favorables.map((p) => (
                <span
                  key={p.key}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-brand-brown)]/80 bg-white border border-[var(--color-border-soft)] rounded-full px-2.5 py-1"
                >
                  <Leaf className="w-3 h-3 text-[var(--color-brand-sage)]" />
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionTitle
          title="Resumo por pilares"
          description={expanded ? undefined : 'Toque em um pilar para ver os achados e o próximo passo.'}
        />
        <div className="space-y-3">
          {report.pillars.map((p) => (
            <PillarCard key={p.key} pillar={p} expanded={expanded} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-border-soft)] bg-white p-5 space-y-3 break-inside-avoid">
        <p className="font-serif italic text-sm font-bold text-[var(--color-brand-brown)]">Encerramento</p>
        <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/80">{report.closing}</p>
        <p className="text-[10px] leading-relaxed text-[var(--color-brand-brown)]/50">{report.disclaimer}</p>
      </section>
    </div>
  );
}
