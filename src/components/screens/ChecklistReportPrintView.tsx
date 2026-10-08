'use client';

import { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { ChecklistReportBody } from '@/components/screens/ChecklistReportBody';
import type { ChecklistReport } from '@/types/checklist';
import styles from '@/app/relatorio/imprimir/print.module.css';

/** Versão para impressão/PDF do relatório do Checklist v2 — pilares já abertos. */
export function ChecklistReportPrintView({
  report,
  userName,
  generatedAtLabel,
  autoPrint = true,
  showControls = true,
}: {
  report: ChecklistReport;
  userName: string;
  generatedAtLabel: string;
  autoPrint?: boolean;
  showControls?: boolean;
}) {
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || hasPrintedRef.current) return;
    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <main className={styles.printRoot}>
      <div className="mx-auto max-w-[210mm] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-4 border-b border-[var(--color-border-soft)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--color-brand-terracota)]/80">
              Checklist da Fertilidade
            </p>
            <h1 className="font-serif text-2xl font-bold text-[var(--color-brand-brown)]">Relatório de {userName}</h1>
            <p className="text-sm text-[var(--color-brand-brown)]/70">Emitido em {generatedAtLabel}</p>
          </div>

          {showControls ? (
            <div className={`${styles.screenOnly} flex items-center gap-3 sm:justify-end`}>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-terracota)] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar PDF
              </button>
            </div>
          ) : null}
        </header>

        <ChecklistReportBody report={report} expanded />
      </div>
    </main>
  );
}
