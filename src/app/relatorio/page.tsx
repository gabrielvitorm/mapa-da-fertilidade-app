import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { ReportClient } from '@/components/screens/ReportClient';
import { loadReportData } from '@/lib/report-data';

export const dynamic = 'force-dynamic';

export default async function RelatorioPage() {
  const user = await requireSessionUser();

  const hasReport = await hasActiveEntitlement(user.id, 'REPORT');
  if (!hasReport) {
    redirect('/dashboard');
  }

  const result = await loadReportData(user.id);
  if (!result) {
    redirect('/dashboard');
  }

  return <ReportClient result={result} />;
}
