import { ChecklistReportView } from '@/components/screens/ChecklistReportView';
import { sampleChecklistReport } from './fixture';

/** Preview do relatório do Checklist v2: ?perfil=favoravel|intermediario|alta|inconclusivo */
export default async function RelatorioChecklistPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string }>;
}) {
  const { perfil } = await searchParams;
  return (
    <ChecklistReportView report={sampleChecklistReport(perfil)} backHref="/preview/relatorio-checklist" upsellHref="#" />
  );
}
