import { CheckCircle, ClipboardList, Leaf, Lock, Sparkles, TriangleAlert } from 'lucide-react';
import { PillarStatusBadge } from '@/components/ui/PillarStatusBadge';
import { PillarStatusMap } from '@/components/ui/PillarStatusMap';
import { CLASSIFICATION_COLOR } from '@/lib/checklist-theme';
import { COMPLETENESS_LABEL, type ChecklistReport } from '@/types/checklist';

interface ChecklistTeaserViewProps {
  primeiroNome: string;
  report: ChecklistReport;
  checkoutUrl: string;
}

/**
 * Teaser pré-pagamento do Checklist v2.
 *
 * Liberado: classificação com o texto do manual, mapa dos 13 pilares, travas
 * de prioridade, exames pendentes (com orientação), as 3 prioridades com os
 * achados e a explicação completa do achado principal como prévia.
 * Fica para o relatório pago: a explicação de cada achado, o próximo passo de
 * cada pilar e o PDF para levar à consulta.
 */
export function ChecklistTeaserView({ primeiroNome, report, checkoutUrl }: ChecklistTeaserViewProps) {
  const cor = CLASSIFICATION_COLOR[report.classification];
  const previa = report.priorities[0]?.findings.find((f) => f.points > 0);
  const achadosBloqueados = Math.max(0, report.findingsCount - (previa ? 1 : 0));

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      <div className="bg-white border-b border-[var(--color-border-soft)] px-6 pt-10 pb-8 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20" style={{ background: cor }} />

        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative z-10"
          style={{ background: `color-mix(in srgb, ${cor} 12%, transparent)` }}
        >
          <Sparkles className="w-7 h-7" style={{ color: cor }} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/50 mb-1 relative z-10">
          Resultado do seu checklist
        </p>
        <h1 className="font-serif italic text-2xl font-bold text-[var(--color-brand-brown)] mb-1 relative z-10">
          {primeiroNome}, seu resultado é
        </h1>
        <p className="font-serif italic text-3xl font-bold mb-3 relative z-10" style={{ color: cor }}>
          {report.classificationLabel}
        </p>
        <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/70 max-w-[320px] relative z-10">
          {report.classificationText}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 relative z-10">
          <span className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-brown)]/70">
            {report.findingsCount} {report.findingsCount === 1 ? 'achado identificado' : 'achados identificados'}
          </span>
          <span className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--color-brand-brown)]/70">
            Completude dos dados: {COMPLETENESS_LABEL[report.completeness]}
          </span>
        </div>
      </div>

      <div className="px-6 pt-6 pb-4 flex flex-col gap-5">
        <PillarStatusMap report={report} />

        {report.locks.length > 0 && (
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/45">
              Pedem avaliação prioritária
            </p>
            {report.locks.map((lock) => (
              <div
                key={lock.key}
                className="flex gap-3 rounded-xl border border-[var(--color-brand-terracota)]/30 bg-[var(--color-brand-terracota)]/5 p-4"
              >
                <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-brand-terracota)]" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--color-brand-brown)]">{lock.title}</p>
                  <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/75">{lock.body}</p>
                </div>
              </div>
            ))}
            <p className="text-[10px] leading-relaxed text-[var(--color-brand-brown)]/45">
              Isso indica prioridade de encaminhamento, não impossibilidade de gravidez.
            </p>
          </section>
        )}

        {report.missingData.length > 0 && (
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/45">
              {report.missingData.length === 1
                ? '1 avaliação essencial pendente'
                : `${report.missingData.length} avaliações essenciais pendentes`}
            </p>
            {report.missingData.map((m) => (
              <div key={m.key} className="flex gap-3 rounded-xl border border-[var(--color-border-soft)] bg-white p-4">
                <ClipboardList className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-brand-brown)]/60" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--color-brand-brown)]">{m.label}</p>
                  <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/75">{m.text}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {report.priorities.length > 0 && (
          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/45">
              Suas prioridades, em ordem
            </p>

            {report.priorities.map((pilar, index) => (
              <div
                key={pilar.key}
                className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-terracota)] text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-xs font-bold text-[var(--color-brand-brown)] leading-snug">{pilar.label}</p>
                  <PillarStatusBadge status={pilar.status} />
                </div>

                <ul className="flex flex-col gap-1.5 pl-9">
                  {pilar.findings
                    .filter((f) => f.points > 0)
                    .map((f) => (
                      <li key={f.key} className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--color-brand-brown)]/75">
                        <span className="w-1 h-1 rounded-full bg-[var(--color-brand-terracota)] shrink-0 mt-[6px]" />
                        {f.title}
                      </li>
                    ))}
                </ul>

                {index === 0 && previa && (
                  <div className="ml-9 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] p-3 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-sage)]">
                      Prévia do seu relatório
                    </p>
                    <p className="text-[11px] font-semibold text-[var(--color-brand-brown)]">{previa.title}</p>
                    <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/80">{previa.body}</p>
                  </div>
                )}

                <div className="ml-9 flex items-start gap-1.5 pt-2 border-t border-dashed border-[var(--color-border-soft)]">
                  <Lock className="w-3 h-3 shrink-0 mt-0.5 text-[var(--color-brand-brown)]/30" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-brown)]/40">
                      Próximo passo indicado
                    </p>
                    <p
                      className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/50 blur-[3px] select-none line-clamp-2"
                      aria-hidden="true"
                    >
                      {pilar.nextStep}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {report.favorables.length > 0 && (
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/45">
              O que está a seu favor
            </p>
            <div className="rounded-xl border border-[var(--color-brand-sage)]/30 bg-[var(--color-brand-sage)]/8 p-4 flex flex-wrap gap-1.5">
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
          </section>
        )}
      </div>

      <div className="px-6 pt-2 pb-10 mt-auto">
        <div className="bg-white rounded-2xl border border-[var(--color-border-soft)] p-5 flex flex-col gap-4">
          <div>
            <p className="font-serif italic text-base font-bold text-[var(--color-brand-brown)] mb-2">
              No relatório completo você recebe
            </p>
            <ul className="space-y-2">
              {[
                achadosBloqueados > 0
                  ? `A explicação de ${achadosBloqueados === 1 ? 'mais 1 achado' : `mais ${achadosBloqueados} achados`} identificados nas suas respostas`
                  : 'A explicação de cada pilar avaliado',
                'O próximo passo indicado para cada um dos 13 pilares',
                'Os exames e encaminhamentos a priorizar, em ordem',
                'O relatório em PDF para levar à consulta',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-[var(--color-brand-sage)] shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold text-[var(--color-brand-brown)]">R$&nbsp;49,90</span>
            <span className="text-[10px] text-[var(--color-brand-brown)]/40 mb-0.5 leading-tight">pagamento único</span>
          </div>

          <a
            href={checkoutUrl}
            className="block w-full py-4 bg-[var(--color-brand-terracota)] hover:opacity-90 text-white font-bold rounded-xl text-sm uppercase tracking-wider text-center transition-opacity"
          >
            Quero meu relatório completo
          </a>

          <p className="text-center text-[10px] text-[var(--color-brand-brown)]/35 leading-relaxed">
            Este checklist não é diagnóstico e não substitui a consulta médica.
          </p>
        </div>
      </div>
    </div>
  );
}
