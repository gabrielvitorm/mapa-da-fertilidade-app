import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import path from 'path';
import { parseCsv } from '../src/lib/csv';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET = process.env.R2_BUCKET ?? '';

interface ManifestRow {
  r2Key: string;
  driveId: string;
}

function loadManifest(fileName: string): ManifestRow[] {
  const csvPath = path.join(process.cwd(), 'seeds', fileName);
  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);
  const [header, ...dataRows] = rows;
  const r2KeyIdx = header.indexOf('r2Key');
  const driveIdIdx = header.indexOf('driveId');

  return dataRows.map((row) => ({
    r2Key: row[r2KeyIdx],
    driveId: row[driveIdIdx],
  }));
}

async function keyExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}

async function downloadFromDrive(driveId: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const baseUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
  let res = await fetch(baseUrl);
  let contentType = res.headers.get('content-type');

  if (contentType?.includes('text/html')) {
    const html = await res.text();
    const match = html.match(/confirm=([0-9A-Za-z_-]+)/);
    if (!match) {
      throw new Error(`Não foi possível extrair o token de confirmação pro arquivo Drive ${driveId}`);
    }
    res = await fetch(`${baseUrl}&confirm=${match[1]}`);
    contentType = res.headers.get('content-type');
  }

  if (!res.ok) {
    throw new Error(`Falha ao baixar arquivo Drive ${driveId}: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

function guessExtensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const map: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'video/mp4': '.mp4',
  };
  return map[contentType.split(';')[0].trim()] ?? null;
}

function adjustKeyExtension(key: string, contentType: string | null): string {
  const guessedExt = guessExtensionFromContentType(contentType);
  if (!guessedExt) return key;
  const currentExt = path.extname(key);
  if (currentExt.toLowerCase() === guessedExt) return key;
  return key.slice(0, -currentExt.length || undefined) + guessedExt;
}

async function uploadToR2(key: string, buffer: Buffer, contentType: string | null): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType ?? undefined,
    })
  );
}

async function migrateManifest(fileName: string, skipKeys: Set<string> = new Set()): Promise<void> {
  const rows = loadManifest(fileName).filter((r) => !skipKeys.has(r.r2Key));
  const downloadedByDriveId = new Map<string, { buffer: Buffer; contentType: string | null }>();

  let uploaded = 0;
  let skipped = 0;

  for (const row of rows) {
    if (await keyExists(row.r2Key)) {
      console.log(`SKIP (já existe no R2): ${row.r2Key}`);
      skipped += 1;
      continue;
    }

    let downloaded = downloadedByDriveId.get(row.driveId);
    if (!downloaded) {
      console.log(`Baixando do Drive: ${row.driveId} -> ${row.r2Key}`);
      downloaded = await downloadFromDrive(row.driveId);
      downloadedByDriveId.set(row.driveId, downloaded);
    }

    const finalKey = adjustKeyExtension(row.r2Key, downloaded.contentType);
    if (finalKey !== row.r2Key) {
      console.log(`  Extensão ajustada: ${row.r2Key} -> ${finalKey}`);
    }

    await uploadToR2(finalKey, downloaded.buffer, downloaded.contentType);
    console.log(`  OK - subiu ${finalKey} (${downloaded.buffer.length} bytes)`);
    uploaded += 1;
  }

  console.log(`${fileName}: ${uploaded} enviados, ${skipped} já existiam no R2`);
}

async function main() {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !BUCKET) {
    throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET precisam estar no .env');
  }

  // Dia 0 tem duas versões de "Boas-vindas" no manifesto; usamos só a primeira
  // ("videos/boas-vindas.mp4"), pulando a alternativa marcada "CONFIRMAR" no CSV.
  await migrateManifest('aulas-manifesto.csv', new Set(['videos/boas-vindas-2.mp4']));
  await migrateManifest('midia-manifesto.csv');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
