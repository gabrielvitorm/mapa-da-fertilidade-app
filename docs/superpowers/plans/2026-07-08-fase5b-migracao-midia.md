# Fase 5b — Migração de Mídia (Drive → R2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar as ~68 mídias do desafio (áudios/imagens das 3 trilhas + 8 aulas em vídeo compartilhadas) do Google Drive pro bucket R2 real, de forma idempotente — script escrito e testado estaticamente por subagente, execução real feita pelo controller com o usuário presente (mesmo padrão já usado pra ações que tocam sistemas externos reais).

**Architecture:** Um script standalone (`scripts/migrate-media.ts`, rodado via `npx tsx`, não uma rota da aplicação) usa `@aws-sdk/client-s3` (R2 é S3-compatível) pra falar com o bucket, e `fetch` direto pro Google Drive (link de download público, sem precisar de credencial OAuth — os arquivos são compartilhados publicamente). Reaproveita o parser de CSV já usado em `prisma/seed.ts`, extraído agora pra `src/lib/csv.ts` como fonte única.

## Decisões tomadas nesta rodada (contexto para as tasks)

1. **Vídeo de boas-vindas do Dia 0:** existe uma linha alternativa no `aulas-manifesto.csv` marcada "CONFIRMAR qual é a versão correta" (`videos/boas-vindas-2.mp4`, 3MB). Decisão do usuário: migrar só a primeira versão (`videos/boas-vindas.mp4`), pular a alternativa.
2. **Coluna `duplicado` do `midia-manifesto.csv`:** a skill de migração original dizia pra "pular" linhas marcadas `duplicado=sim` — mas conferi contra o seed real (`seeds/desafio-track-*.json`) e cada trilha tem seu **próprio** `mediaKey` mesmo quando o arquivo fonte no Drive é idêntico entre trilhas (ex.: um mesmo áudio vira `desafio/baixa/dia0/4.mp3`, `desafio/moderada/dia0/4.mp3` E `desafio/alta/dia0/4.mp3` — três objetos R2 distintos). Decisão do usuário: **baixar do Drive uma vez por `driveId`** (evita gastar banda/cota à toa), mas **subir pro R2 em todas as `r2Key` associadas** àquele `driveId` — as 3 trilhas ficam com mídia real, não só a primeira ocorrência.
3. **Download sem credencial OAuth do Google:** os arquivos são acessados via link direto (`drive.google.com/uc?export=download&id=...`), que funciona pra arquivos compartilhados publicamente sem precisar de API key/service account do Google. Arquivos grandes disparam uma página de confirmação ("não foi possível escanear por vírus") — o script trata esse caso extraindo o token de confirmação e refazendo a requisição. **Risco conhecido, a validar na execução real:** se algum arquivo não estiver com permissão "qualquer pessoa com o link", esse método falha com erro de permissão — nesse caso, precisaríamos de credenciais reais da API do Google Drive (fora do escopo previsto agora).

## Global Constraints

- Idempotência: se a `r2Key` já existe no bucket (`HeadObjectCommand`), não baixa nem reenvia.
- Nunca subir nada fora do bucket configurado em `R2_BUCKET`.
- Confirmar a extensão real do arquivo baixado (via `Content-Type` da resposta) e ajustar a `r2Key` se necessário, em vez de confiar cegamente na extensão que o manifesto assume.
- Commits: **nunca** incluir trailer `Co-Authored-By: Claude` ou qualquer menção de co-autoria de IA.
- **A execução real do script (Task 3) não é delegada a subagente** — toca um bucket R2 real e consome cota de download do Google Drive; o controller roda pessoalmente, com o usuário presente, mesmo padrão já usado nesta sessão pra ações que dependem de infraestrutura externa real.

---

### Task 1: Extrair o parser de CSV pra `src/lib/csv.ts`

**Files:**
- Create: `src/lib/csv.ts`
- Modify: `prisma/seed.ts` (remove o parser local duplicado, importa do novo módulo)

**Interfaces:**
- Produces: `parseCsv(content: string): string[][]` — usado por `prisma/seed.ts` (já existia, agora centralizado) e pela Task 2 (script de migração).

- [ ] **Step 1: Criar `src/lib/csv.ts`**

```typescript
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCsv(content: string): string[][] {
  return content
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map(parseCsvLine);
}
```

- [ ] **Step 2: Atualizar `prisma/seed.ts` pra usar o módulo novo**

Em `prisma/seed.ts`, remova as duas funções locais `parseCsvLine` e a lógica de split embutida em `loadDayTitles` (a parte que faz `content.split('\n').map(...).filter(...).map(parseCsvLine)`), e troque por um import:

```typescript
import { parseCsv } from '../src/lib/csv';
```

Dentro de `loadDayTitles()`, troque:

```typescript
  const rows = content
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map(parseCsvLine);
```

por:

```typescript
  const rows = parseCsv(content);
```

Remova a função `parseCsvLine` inteira de `prisma/seed.ts` (ela vive só em `src/lib/csv.ts` agora).

- [ ] **Step 3: Verificar que o seed ainda funciona identicamente**

Run: `npm run db:seed`

Expected: mesmas linhas de log de sempre, incluindo `ChallengeTrack BAIXA: 8 dias` etc. — nenhuma mudança de comportamento, só de onde o parser vive.

Run: `npx tsc --noEmit`

Expected: nenhum erro em nenhum arquivo do repositório.

- [ ] **Step 4: Commit**

```bash
git add src/lib/csv.ts prisma/seed.ts
git commit -m "refactor: extract CSV parser to src/lib/csv.ts, reused by seed and media migration"
```

---

### Task 2: `scripts/migrate-media.ts`

**Files:**
- Modify: `package.json` (adiciona `@aws-sdk/client-s3`)
- Create: `scripts/migrate-media.ts`

**Interfaces:**
- Consumes: `parseCsv` (Task 1), `seeds/midia-manifesto.csv`, `seeds/aulas-manifesto.csv` (já existem, não modificar), variáveis de ambiente `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET` (já confirmadas presentes no `.env` local pelo usuário).
- Produces: o script executável — rodado de verdade só na Task 3, pelo controller.

- [ ] **Step 1: Instalar a dependência**

Run: `npm install @aws-sdk/client-s3`

Expected: `package.json` ganha `@aws-sdk/client-s3` em `dependencies`; `package-lock.json` atualizado.

- [ ] **Step 2: Criar `scripts/migrate-media.ts`**

```typescript
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
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro em nenhum arquivo do repositório. **Não execute o script de verdade nesta task** — ele precisa de credenciais reais do R2 e vai consumir cota do Google Drive; a execução real é a Task 3, feita pelo controller.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/migrate-media.ts
git commit -m "feat: add media migration script (Drive to R2, idempotent)"
```

---

### Task 3 (controller — não delegar a subagente): Rodar a migração de verdade

Esta task não é implementação — é a execução real do script contra o Google Drive e o bucket R2 de produção, feita pelo controller com o usuário presente (mesmo padrão já usado nesta sessão pra ações que tocam infraestrutura externa real e não são totalmente reversíveis).

- [ ] Confirmar com o usuário que `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` e `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` estão todos no `.env` local
- [ ] Rodar `npx tsx scripts/migrate-media.ts` e acompanhar a saída linha a linha
- [ ] Se algum arquivo falhar por erro de permissão do Drive (arquivo não é público), parar e reportar ao usuário — nesse ponto precisaríamos de credenciais reais da API do Google Drive, fora do escopo previsto
- [ ] Ao final, confirmar a contagem total: `docs/04-motor-do-desafio.md` cita "20 mídias" pra trilha Baixa + 8 vídeos de aula compartilhados — confirmar que os números batem com o que o script reportou
- [ ] Rodar o script **uma segunda vez** e confirmar que tudo aparece como `SKIP (já existe no R2)` — prova de idempotência real contra o bucket de produção
- [ ] Testar pelo menos 2-3 URLs públicas manualmente (`${R2_PUBLIC_BASE_URL}/desafio/baixa/dia0/1.mp3`, `${R2_PUBLIC_BASE_URL}/videos/boas-vindas.mp4`) num navegador ou via `curl -I`, confirmando `200 OK` e `Content-Type` correto
- [ ] Rodar `npm run dev`, logar como a usuária de teste da Fase 5 (ou criar uma nova), acessar `/desafio/0` e confirmar visualmente que o áudio/vídeo tocam de verdade (não mais quebrados)
- [ ] Parar o servidor de dev

---

## Ao final desta fase

Toda a mídia real do desafio (roteiro completo das 3 trilhas + aulas em vídeo) está no R2, servida via URL pública, e o player mostra tudo funcionando de verdade — sem mais placeholders quebrados. O app está pronto pra gravação do vídeo mostrando o desafio completo.
