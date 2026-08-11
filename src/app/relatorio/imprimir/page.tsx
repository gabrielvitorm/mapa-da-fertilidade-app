import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { loadReportData } from '@/lib/report-data';
import { ReportPrintView } from '@/components/screens/ReportPrintView';

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
  const result = await loadReportData(user.id);
  if (!result) {
    redirect('/dashboard');
  }

  const isPdfMode = params?.pdf === '1';

  return (
    <ReportPrintView
      result={result}
      userName={user.nome?.trim() || user.email}
      generatedAtLabel={new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}
      autoPrint={!isPdfMode}
      showControls={!isPdfMode}
    />
  );
}
