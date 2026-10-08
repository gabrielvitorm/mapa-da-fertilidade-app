import { NextResponse, type NextRequest } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { loadReportData } from '@/lib/report-data';
import { renderReportPdf } from '@/lib/report-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function slugifyFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mapa-fertilidade';
}

export async function GET(request: NextRequest) {
  const user = await requireSessionUser();
  const hasReport = await hasActiveEntitlement(user.id, 'REPORT');
  if (!hasReport) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const data = await loadReportData(user.id);
  if (!data) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const pdf = await renderReportPdf(
    new URL('/relatorio/imprimir?pdf=1', request.url).toString(),
    request.headers.get('cookie') ?? ''
  );

  const filename = `relatorio-${slugifyFilename(user.nome?.trim() || user.email)}.pdf`;
  const body = Buffer.from(pdf);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
