import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { loadReportData } from '@/lib/report-data';
import { ReportPrintView } from '@/components/screens/ReportPrintView';
import { ChecklistReportPrintView } from '@/components/screens/ChecklistReportPrintView';

export const dynamic = 'force-dynamic';

export default async function RelatorioPrintPage({
  searchParams,
}: {
  searchParams?: { pdf?: string };
}) {
  const user = await requireSessionUser();
  const hasReport = await hasActiveEntitlement(user.id, 'REPORT');
  if (!hasReport) {
    redirect('/dashboard');
  }

  const params = searchParams;
  const data = await loadReportData(user.id);
  if (!data) {
    redirect('/dashboard');
  }

  const isPdfMode = params?.pdf === '1';
  const userName = user.nome?.trim() || user.email;
  const generatedAtLabel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());

  if (data.version === 'CHECKLIST_V2') {
    return (
      <ChecklistReportPrintView
        report={data.report}
        userName={userName}
        generatedAtLabel={generatedAtLabel}
        autoPrint={!isPdfMode}
        showControls={!isPdfMode}
      />
    );
  }

  return (
    <ReportPrintView
      result={data.result}
      userName={userName}
      generatedAtLabel={generatedAtLabel}
      autoPrint={!isPdfMode}
      showControls={!isPdfMode}
    />
  );
}
