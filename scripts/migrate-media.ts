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

// A extensão real de um arquivo só é conhecida depois de baixá-lo (ver
// adjustKeyExtension). Pra idempotência funcionar sem precisar baixar de novo
// só pra descobrir isso, checamos todas as variantes plausíveis de extensão
// da mesma categoria (imagem ou áudio) antes de decidir baixar.
function possibleKeyVariants(key: string): string[] {
  const ext = path.extname(key).toLowerCase();
  const base = key.slice(0, -ext.length || undefined);
  const imageExts = ['.jpg', '.jpeg', '.png'];
  const audioExts = ['.mp3', '.opus', '.ogg'];

  if (imageExts.includes(ext)) return imageExts.map((e) => base + e);
  if (audioExts.includes(ext)) return audioExts.map((e) => base + e);
  return [key];
}

async function findExistingKey(key: string): Promise<string | null> {
  for (const variant of possibleKeyVariants(key)) {
    if (await keyExists(variant)) return variant;
  }
  return null;
}

interface DownloadResult {
  buffer: Buffer;
  contentType: string | null;
  /** Extensão real do arquivo (com ponto, ex. ".opus"), extraída do nome de
   *  arquivo original no header Content-Disposition — o Drive frequentemente
   *  devolve um Content-Type genérico (application/octet-stream), então essa
   *  é a fonte mais confiável do formato real. */
  realExt: string | null;
}

async function downloadFromDrive(driveId: string): Promise<DownloadResult> {
  const baseUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
  let res = await fetch(baseUrl);
  let contentType = res.headers.get('content-type');

  if (contentType?.includes('text/html')) {
    // Google mudou o fluxo de confirmação pra arquivos grandes: a página de aviso
    // agora é um <form> que envia pra um domínio diferente (drive.usercontent.google.com)
    // com um "confirm" fixo ("t") e um "uuid" dinâmico por requisição — não é mais um
    // token embutido como "confirm=XXXX" na própria URL.
    const html = await res.text();
    const confirmMatch = html.match(/name="confirm" value="([^"]+)"/);
    const uuidMatch = html.match(/name="uuid" value="([^"]+)"/);
    if (!confirmMatch || !uuidMatch) {
      throw new Error(`Não foi possível extrair os parâmetros de confirmação pro arquivo Drive ${driveId}`);
    }
    const confirmUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=${confirmMatch[1]}&uuid=${uuidMatch[1]}`;
    res = await fetch(confirmUrl);
    contentType = res.headers.get('content-type');
  }

  if (!res.ok) {
    throw new Error(`Falha ao baixar arquivo Drive ${driveId}: HTTP ${res.status}`);
  }

  const disposition = res.headers.get('content-disposition');
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const realExt = filenameMatch ? path.extname(filenameMatch[1]).toLowerCase() || null : null;

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType, realExt };
}

function guessExtensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const map: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/opus': '.opus',
    'audio/ogg': '.opus',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'video/mp4': '.mp4',
  };
  return map[contentType.split(';')[0].trim()] ?? null;
}

function mimeTypeForExtension(ext: string): string | undefined {
  const map: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.opus': 'audio/ogg',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
  };
  return map[ext.toLowerCase()];
}

function adjustKeyExtension(key: string, download: DownloadResult): { key: string; contentType: string | undefined } {
  // Prioriza a extensão real (do nome de arquivo original no Drive) sobre o
  // Content-Type — o Drive costuma devolver "application/octet-stream" genérico
  // pra formatos que ele não reconhece de cara (foi o caso do .opus).
  const detectedExt = download.realExt ?? guessExtensionFromContentType(download.contentType);
  const currentExt = path.extname(key);

  if (!detectedExt || currentExt.toLowerCase() === detectedExt) {
    return { key, contentType: mimeTypeForExtension(currentExt) ?? download.contentType ?? undefined };
  }

  const finalKey = key.slice(0, -currentExt.length || undefined) + detectedExt;
  return { key: finalKey, contentType: mimeTypeForExtension(detectedExt) ?? download.contentType ?? undefined };
}

async function uploadToR2(key: string, buffer: Buffer, contentType: string | undefined): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

async function migrateManifest(fileName: string, skipKeys: Set<string> = new Set()): Promise<void> {
  const rows = loadManifest(fileName).filter((r) => !skipKeys.has(r.r2Key));
  const downloadedByDriveId = new Map<string, DownloadResult>();

  let uploaded = 0;
  let skipped = 0;

  for (const row of rows) {
    const existingKey = await findExistingKey(row.r2Key);
    if (existingKey) {
      console.log(`SKIP (já existe no R2): ${existingKey}`);
      skipped += 1;
      continue;
    }

    let downloaded = downloadedByDriveId.get(row.driveId);
    if (!downloaded) {
      console.log(`Baixando do Drive: ${row.driveId} -> ${row.r2Key}`);
      downloaded = await downloadFromDrive(row.driveId);
      downloadedByDriveId.set(row.driveId, downloaded);
    }

    const { key: finalKey, contentType } = adjustKeyExtension(row.r2Key, downloaded);
    if (finalKey !== row.r2Key) {
      console.log(`  Extensão ajustada: ${row.r2Key} -> ${finalKey}`);
    }

    await uploadToR2(finalKey, downloaded.buffer, contentType);
    console.log(`  OK - subiu ${finalKey} (${downloaded.buffer.length} bytes, ${contentType ?? 'sem content-type'})`);
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
