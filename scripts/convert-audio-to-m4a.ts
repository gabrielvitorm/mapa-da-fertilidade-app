import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import desafioBaixa from '../seeds/desafio-track-baixa.json';
import desafioModerada from '../seeds/desafio-track-moderada.json';
import desafioAlta from '../seeds/desafio-track-alta.json';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET = process.env.R2_BUCKET ?? '';
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? '';
const TMP_DIR = path.join(process.cwd(), 'tmp-audio-convert');

interface DesafioSourceMessage {
  tipo: string;
  mediaKey?: string;
}
interface DesafioSourceDay {
  messages: DesafioSourceMessage[];
}
interface DesafioSourceTrack {
  days: DesafioSourceDay[];
}

const TRACKS = [desafioBaixa, desafioModerada, desafioAlta] as unknown as DesafioSourceTrack[];

function collectOpusKeys(): string[] {
  const keys = new Set<string>();
  for (const track of TRACKS) {
    for (const day of track.days) {
      for (const m of day.messages) {
        if (m.tipo === 'AUDIO' && m.mediaKey?.endsWith('.opus')) {
          keys.add(m.mediaKey);
        }
      }
    }
  }
  return [...keys];
}

async function downloadOpus(key: string): Promise<string> {
  const localPath = path.join(TMP_DIR, key);
  mkdirSync(path.dirname(localPath), { recursive: true });
  const res = await fetch(`${PUBLIC_BASE}/${key}`);
  if (!res.ok) throw new Error(`Falha ao baixar ${key}: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buffer);
  return localPath;
}

function convertAllToM4a(): void {
  // Escreve o script num arquivo dentro do próprio diretório montado, em vez
  // de passar inline via -c "..." — evita a lambada de escaping de aspas/
  // quebras de linha atravessando Git Bash -> execSync -> docker -> sh.
  const scriptPath = path.join(TMP_DIR, 'convert.sh');
  const script = [
    '#!/bin/sh',
    "find /data -name '*.opus' | while read -r f; do",
    '  out="${f%.opus}.m4a"',
    '  ffmpeg -y -i "$f" -c:a aac -b:a 128k "$out"',
    'done',
    '',
  ].join('\n');
  writeFileSync(scriptPath, script, { mode: 0o755 });

  // Um único container processa todos os arquivos (evita overhead de subir
  // container por arquivo). --entrypoint sh porque a imagem linuxserver/ffmpeg
  // tem entrypoint fixo em ffmpeg.
  execSync(`docker run --rm -v "${TMP_DIR}:/data" --entrypoint sh linuxserver/ffmpeg /data/convert.sh`, {
    stdio: 'inherit',
  });
}

async function uploadM4a(key: string): Promise<void> {
  const m4aKey = key.replace(/\.opus$/, '.m4a');
  const localPath = path.join(TMP_DIR, m4aKey);
  if (!existsSync(localPath)) throw new Error(`Conversão não gerou arquivo esperado: ${localPath}`);
  const buffer = readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: m4aKey,
      Body: buffer,
      ContentType: 'audio/mp4',
    })
  );
  console.log(`OK - subiu ${m4aKey} (${buffer.length} bytes)`);
}

async function main() {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !BUCKET || !PUBLIC_BASE) {
    throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET e R2_PUBLIC_BASE_URL precisam estar no .env');
  }

  const keys = collectOpusKeys();
  console.log(`${keys.length} áudios .opus únicos encontrados nos 3 seeds de trilha.`);

  console.log('Baixando do R2...');
  for (const key of keys) {
    await downloadOpus(key);
  }
  console.log('Download concluído.');

  console.log('Convertendo pra AAC/.m4a via ffmpeg (Docker)...');
  convertAllToM4a();
  console.log('Conversão concluída.');

  console.log('Subindo .m4a pro R2...');
  for (const key of keys) {
    await uploadM4a(key);
  }
  console.log(`Concluído: ${keys.length} áudios convertidos e enviados como .m4a.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
