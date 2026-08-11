import { chromium } from 'playwright-core';
import { resolveChromiumExecutablePath } from '@/lib/chromium';

export async function renderReportPdf(url: string, cookieHeader: string): Promise<Uint8Array> {
  const executablePath = resolveChromiumExecutablePath();
  if (!executablePath) {
    throw new Error('Nao foi possivel localizar um executavel de Chromium para gerar o PDF');
  }

  const browser = await chromium.launch({
    executablePath,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1240, height: 1754 },
      deviceScaleFactor: 1,
    });

    if (cookieHeader) {
      await context.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' },
    });
  } finally {
    await browser.close();
  }
}
