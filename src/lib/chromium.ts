import { existsSync } from 'fs';

const CANDIDATE_PATHS = [
  process.env.CHROME_EXECUTABLE_PATH,
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/microsoft-edge',
].filter(Boolean) as string[];

export function resolveChromiumExecutablePath(): string | null {
  for (const candidate of CANDIDATE_PATHS) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
