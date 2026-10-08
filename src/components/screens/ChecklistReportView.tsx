import Link from 'next/link';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import { ChecklistReportBody } from '@/components/screens/ChecklistReportBody';
import type { ChecklistReport } from '@/types/checklist';

interface ChecklistReportViewProps {
  report: ChecklistReport;
  backHref: string;
  /** Rota que gera o PDF; ausente nas páginas de preview. */
  pdfHref?: string;
  upsellHref?: string;
}

/** Relatório completo do Checklist da Fertilidade (quiz v2) — tela do app. */
export function ChecklistReportView({ report, backHref, pdfHref, upsellHref }: ChecklistReportViewProps) {
  const foco = report.priorities[0];

  return (
    <div className="flex-grow flex flex-col bg-[var(--color-surface-cream)] min-h-screen">
      <header className="bg-white sticky top-0 z-30 flex items-center justify-between px-5 h-16 border-b border-[var(--color-border-soft)]">
        <Link
          href={backHref}
          aria-label="Voltar"
          className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-brand-terracota)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-serif italic text-sm font-bold text-[var(--color-brand-terracota)] flex-1 text-center pr-2">
          Checklist da Fertilidade
        </h1>
        <div className="flex min-w-[92px] items-center justify-end">
          {pdfHref ? (
            <a
              href={pdfHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-cream)] px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-brown)] hover:bg-white"
            >
              <Download className="h-3.5 w-3.5 text-[var(--color-brand-terracota)]" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </a>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </header>

      <div className="flex-grow p-6 space-y-6 pb-24 text-left">
        <ChecklistReportBody report={report} />

        {upsellHref && (
          <div className="bg-[var(--color-brand-sage)] text-[var(--color-surface-cream)] p-5 rounded-xl relative overflow-hidden shadow-sm">
            <div className="space-y-1 z-10 relative">
              <h3 className="font-serif text-base font-bold">Comece a agir nos próximos 7 dias</h3>
              <p className="text-xs leading-relaxed opacity-90">
                {foco
                  ? `Seu relatório aponta ${foco.label.toLowerCase()} como primeira prioridade. O Desafio de 7 Dias organiza a rotina que sustenta o seu cuidado enquanto você busca as avaliações indicadas.`
                  : 'O Desafio de 7 Dias organiza a rotina que sustenta o seu perfil favorável.'}
              </p>
              <div className="pt-3">
                <Link
                  href={upsellHref}
                  className="inline-block bg-[var(--color-surface-cream)] hover:opacity-90 text-[var(--color-brand-brown)] text-xs font-bold px-5 py-2.5 rounded-lg transition-colors uppercase tracking-wider"
                >
                  Ver o desafio
                </Link>
              </div>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-15">
              <Sparkles className="w-24 h-24 stroke-white fill-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
