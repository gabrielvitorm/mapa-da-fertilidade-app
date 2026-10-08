import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { ReportClient } from '@/components/screens/ReportClient';
import { ChecklistReportView } from '@/components/screens/ChecklistReportView';
import { loadReportData } from '@/lib/report-data';

export const dynamic = 'force-dynamic';

export default async function RelatorioPage() {
  const user = await requireSessionUser();

  const hasReport = await hasActiveEntitlement(user.id, 'REPORT');
  if (!hasReport) {
    redirect('/dashboard');
  }

  const data = await loadReportData(user.id);
  if (!data) {
    redirect('/dashboard');
  }

  if (data.version === 'CHECKLIST_V2') {
    return (
      <ChecklistReportView
        report={data.report}
        backHref="/dashboard"
        pdfHref="/relatorio/pdf"
        upsellHref="/desafio/oferta"
      />
    );
  }

  return <ReportClient result={data.result} />;
}
