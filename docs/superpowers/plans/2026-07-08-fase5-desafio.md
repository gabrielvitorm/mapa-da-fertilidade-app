# Fase 5 — Desafio de 7 Dias (roteiro real + gating + player) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O desafio de 7 dias funcionando de ponta a ponta com o roteiro real das 3 trilhas — timeline com gating (dia bloqueado/liberado/concluído), player estilo WhatsApp com progresso persistido (retoma de onde parou), conclusão de dia e devolutiva opcional gravando no banco.

**Architecture:** Reaproveita `challenge-gating.ts` (Fase 0, já testável) sem alterações. `ChallengeProgress` nasce automaticamente quando `handlePayment` concede um `Entitlement CHALLENGE` (fechando uma lacuna que a Fase 4 deixou aberta de propósito, já que `ChallengeTrack` ainda não existia no banco). Duas telas já existentes (`ChallengeTimelineView`, `ChallengePlayerView`) são client components com callbacks — cada uma ganha um wrapper client fino (mesmo padrão do `QuizFlow` da Fase 2) que fala com as novas rotas de API.

## Escopo desta rodada (importante)

A **migração de mídia pro R2 fica de fora** — você ainda não tem o bucket configurado. O roteiro, o gating e a persistência de progresso funcionam inteiramente sem depender de mídia real; o player vai tentar carregar áudio/vídeo/imagem que ainda não existem (vai aparecer quebrado), mas toda a lógica de negócio é testável e demonstrável mesmo assim. O script de migração (`scripts/migrate-media.ts`) fica para quando o R2 estiver pronto — não faz sentido escrevê-lo agora, já que não dá pra testar nenhuma parte dele (download do Drive, upload no R2) sem credenciais reais.

**Nota separada (não é uma task, é um lembrete):** `ChallengeMessageBubble.tsx` (já existente) lê `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` — mas o `.env.example` só tem `R2_PUBLIC_BASE_URL` (sem o prefixo `NEXT_PUBLIC_`, que o Next.js exige pra expor a variável no client). Esse arquivo está bloqueado pra mim (mesma proteção de permissão do `.env`). Quando for configurar o R2 de verdade, adicione **as duas** variáveis no `.env.example` e no `.env`.

## Global Constraints

- Não modificar `ChallengeTimelineView.tsx` nem `ChallengeMessageBubble.tsx`.
- **Exceção deliberada:** `ChallengePlayerView.tsx` recebe uma modificação pequena e aditiva (um novo prop opcional `onProgressChange`) — é a única forma de observar o avanço interno do player (`visibleCount`, hoje só existe dentro do hook `useMessageSequence`) sem duplicar a lógica de sequenciamento fora do componente. Prop opcional, comportamento existente inalterado quando omitido.
- `challenge-gating.ts` não muda — já testável, já correto.
- Idempotência do seed: rodar `npm run db:seed` de novo não deve duplicar `ChallengeTrack`/`ChallengeDay`/`ChallengeMessage`.
- `ChallengeProgress` só é criado uma vez por (usuária, trilha) — `@@unique([userId, trackId])` já existe no schema.
- Devolutiva **nunca** trava a conclusão do dia — são ações independentes (`docs/04`).
- Commits: **nunca** incluir trailer `Co-Authored-By: Claude` ou qualquer menção de co-autoria de IA.

---

### Task 1: Migration (`ChallengeDay.title`) + seed do roteiro completo

**Files:**
- Modify: `prisma/schema.prisma`
- Create (gerado pelo Prisma): `prisma/migrations/<timestamp>_add_challenge_day_title/migration.sql`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `seeds/desafio-track-{baixa,moderada,alta}.json`, `seeds/aulas-manifesto.csv` (já existem, não modificar).
- Produces: `ChallengeTrack` (3 linhas), `ChallengeDay` (24 linhas, 8 por trilha), `ChallengeMessage` (uma por mensagem do roteiro) — consumidos pela Task 2 (resolução de trilha) e Task 6 (páginas).

- [ ] **Step 1: Adicionar `title` ao model `ChallengeDay`**

Em `prisma/schema.prisma`, no model `ChallengeDay`, adicione `title` logo após `isOnboarding`:

```prisma
model ChallengeDay {
  id            String             @id @default(cuid())
  trackId       String
  track         ChallengeTrack     @relation(fields: [trackId], references: [id])
  dayNumber     Int
  isOnboarding  Boolean            @default(false)
  title         String
  cooldownHours Int?
  messages      ChallengeMessage[]

  @@unique([trackId, dayNumber])
}
```

- [ ] **Step 2: Rodar a migration**

Run: `npx prisma migrate dev --name add_challenge_day_title`

Expected: `Your database is now in sync with your schema.` — a tabela `ChallengeDay` ainda está vazia (nenhum seed de desafio rodou antes), então não deve pedir valor default.

- [ ] **Step 3: Adicionar os imports e o parser de CSV no topo de `prisma/seed.ts`**

Logo após os imports existentes (`import { createAssessment } from '../src/lib/assessment-service';`), adicione:

```typescript
import { readFileSync } from 'fs';
import path from 'path';
import desafioBaixa from '../seeds/desafio-track-baixa.json';
import desafioModerada from '../seeds/desafio-track-moderada.json';
import desafioAlta from '../seeds/desafio-track-alta.json';
```

- [ ] **Step 4: Adicionar as interfaces e o parser de CSV mínimo**

Adicione em `prisma/seed.ts`, antes de `seedDemoUserAndCatalog`:

```typescript
interface DesafioSourceMessage {
  ordem: number;
  tipo: 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'VIDEO';
  delayMs: number;
  texto?: string;
  mediaKey?: string;
}
interface DesafioSourceDay {
  dayNumber: number;
  isOnboarding: boolean;
  messages: DesafioSourceMessage[];
}
interface DesafioSourceTrack {
  track: {
    level: 'BAIXA' | 'MODERADA' | 'ALTA';
    codename: string;
    title: string;
    defaultCooldownHours: number;
  };
  days: DesafioSourceDay[];
}

const DESAFIO_TRACKS = [desafioBaixa, desafioModerada, desafioAlta] as unknown as DesafioSourceTrack[];

function parseCsvLine(line: string): string[] {
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

function loadDayTitles(): Map<number, string> {
  const csvPath = path.join(process.cwd(), 'seeds', 'aulas-manifesto.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const rows = content
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map(parseCsvLine);

  const [header, ...dataRows] = rows;
  const dayIdx = header.indexOf('dia');
  const titleIdx = header.indexOf('titulo');

  const titles = new Map<number, string>();
  for (const row of dataRows) {
    const dayNumber = Number(row[dayIdx]);
    if (!titles.has(dayNumber)) {
      titles.set(dayNumber, row[titleIdx]);
    }
  }
  return titles;
}
```

- [ ] **Step 5: Adicionar `seedChallengeTracks`**

```typescript
async function seedChallengeTracks() {
  const dayTitles = loadDayTitles();

  for (const source of DESAFIO_TRACKS) {
    const track = await db.challengeTrack.upsert({
      where: { level: source.track.level },
      update: {
        codename: source.track.codename,
        title: source.track.title,
        defaultCooldownHours: source.track.defaultCooldownHours,
      },
      create: {
        level: source.track.level,
        codename: source.track.codename,
        title: source.track.title,
        defaultCooldownHours: source.track.defaultCooldownHours,
      },
    });

    const existingDays = await db.challengeDay.findMany({
      where: { trackId: track.id },
      select: { id: true },
    });
    if (existingDays.length > 0) {
      await db.challengeMessage.deleteMany({
        where: { dayId: { in: existingDays.map((d) => d.id) } },
      });
      await db.challengeDay.deleteMany({ where: { trackId: track.id } });
    }

    for (const day of source.days) {
      await db.challengeDay.create({
        data: {
          trackId: track.id,
          dayNumber: day.dayNumber,
          isOnboarding: day.isOnboarding,
          title: dayTitles.get(day.dayNumber) ?? `Dia ${day.dayNumber}`,
          messages: {
            create: day.messages.map((m) => ({
              ordem: m.ordem,
              tipo: m.tipo,
              texto: m.texto,
              mediaKey: m.mediaKey,
              delayMs: m.delayMs,
            })),
          },
        },
      });
    }

    console.log(`ChallengeTrack ${source.track.level}: ${source.days.length} dias`);
  }
}
```

- [ ] **Step 6: Chamar em `main()`**

Adicione depois de `await seedDemoUserAndCatalog();`:

```typescript
  await seedChallengeTracks();
```

- [ ] **Step 7: Rodar o seed e conferir**

Run: `npm run db:seed`

Expected: as linhas já conhecidas mais três novas:
```
ChallengeTrack BAIXA: 8 dias
ChallengeTrack MODERADA: 8 dias
ChallengeTrack ALTA: 8 dias
```

- [ ] **Step 8: Verificar idempotência**

Run: `npm run db:seed` de novo.

Run: `docker compose exec postgres psql -U fertilidade -d fertilidade -c "SELECT (SELECT COUNT(*) FROM \"ChallengeTrack\") t, (SELECT COUNT(*) FROM \"ChallengeDay\") d, (SELECT COUNT(*) FROM \"ChallengeMessage\") m;"`

Expected: `t=3`, `d=24` (8×3), `m` igual em ambas as rodadas (não duplica).

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts
git commit -m "feat: seed the 3 challenge tracks with real script content"
```

---

### Task 2: Estender `payment-handler.ts` — criar `ChallengeProgress` ao conceder CHALLENGE

**Files:**
- Modify: `src/lib/payment-handler.ts`

**Interfaces:**
- Consumes: `ChallengeTrack` (Task 1, precisa existir no banco antes desta task rodar de verdade).
- Produces: `ChallengeProgress` criado automaticamente quando `handlePayment` concede um `Entitlement CHALLENGE` — fecha a lacuna documentada em `docs/04-motor-do-desafio.md` ("Quando o webhook concede CHALLENGE: ... Cria ChallengeProgress").

- [ ] **Step 1: Modificar o bloco de resolução de trilha em `handlePayment`**

Em `src/lib/payment-handler.ts`, substitua:

```typescript
    if (grants.entitlement === 'CHALLENGE' && grants.trackByLevel) {
      const latestAssessment = await db.assessment.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestAssessment) {
        metadata.track = latestAssessment.nivelGlobal;
      }
    }
```

por:

```typescript
    if (grants.entitlement === 'CHALLENGE' && grants.trackByLevel) {
      const latestAssessment = await db.assessment.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestAssessment) {
        metadata.track = latestAssessment.nivelGlobal;

        const track = await db.challengeTrack.findUnique({
          where: { level: latestAssessment.nivelGlobal },
        });
        if (track) {
          await db.challengeProgress.upsert({
            where: { userId_trackId: { userId: user.id, trackId: track.id } },
            update: {},
            create: { userId: user.id, trackId: track.id, currentDay: 0 },
          });
        }
      }
    }
```

- [ ] **Step 2: Verificar de ponta a ponta**

Crie um arquivo temporário `verify-challenge-progress.tmp.ts` na raiz:

```typescript
import { db } from './src/lib/db';
import { handlePayment } from './src/lib/payment-handler';

const TEST_EMAIL = 'teste-challenge-progress@example.com';

async function main() {
  const product = await db.product.findUniqueOrThrow({ where: { slug: 'desafio-7-dias' } });

  // Cria um assessment ALTA pra essa usuária de teste primeiro (sem isso não tem trilha pra resolver)
  const rules = await db.scoreRule.findMany();
  const pillarScores = Object.fromEntries(rules.map((r) => [r.pillar, r.maxDoPilar]));
  const user = await db.user.upsert({
    where: { email: TEST_EMAIL },
    update: {},
    create: { email: TEST_EMAIL, nome: 'Teste Challenge Progress' },
  });
  await db.assessment.create({
    data: {
      userId: user.id,
      source: 'APP_NATIVE',
      leadEmail: TEST_EMAIL,
      answers: {},
      pillarScores,
      scoreTotal: 291,
      resultadoFinal: 102.11,
      nivelGlobal: 'ALTA',
    },
  });

  await handlePayment({
    platform: product.platform,
    transactionId: 'TEST-CHALLENGE-PROGRESS-001',
    status: 'PAID',
    platformProductId: product.platformProductId,
    amountCents: product.priceCents,
    buyer: { email: TEST_EMAIL, nome: 'Teste Challenge Progress' },
    raw: { test: true },
  });

  const track = await db.challengeTrack.findUniqueOrThrow({ where: { level: 'ALTA' } });
  const progress = await db.challengeProgress.findUnique({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });
  console.log('ChallengeProgress criado:', progress ? `sim (currentDay=${progress.currentDay})` : 'NÃO (falhou)');

  // limpeza
  await db.challengeProgress.deleteMany({ where: { userId: user.id } });
  await db.entitlement.deleteMany({ where: { userId: user.id } });
  await db.order.deleteMany({ where: { userId: user.id } });
  await db.assessment.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log('OK - dados de teste limpos');
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run: `npx tsx verify-challenge-progress.tmp.ts`

Expected:
```
ChallengeProgress criado: sim (currentDay=0)
OK - dados de teste limpos
```

- [ ] **Step 3: Remover o script temporário e rodar `npx tsc --noEmit` no repo inteiro**

Run: `rm verify-challenge-progress.tmp.ts`

Run: `npx tsc --noEmit`

Expected: nenhum erro em nenhum arquivo do repositório (reporte QUALQUER erro encontrado, mesmo fora dos arquivos desta task).

- [ ] **Step 4: Commit**

```bash
git add src/lib/payment-handler.ts
git commit -m "feat: create ChallengeProgress when granting a CHALLENGE entitlement"
```

---

### Task 3: `src/lib/challenge-service.ts`

**Files:**
- Create: `src/lib/challenge-service.ts`

**Interfaces:**
- Consumes: `db` (`@/lib/db`), `DevolutivaTipo` (Prisma Client).
- Produces: `completeDay`, `updateLastSeenOrdem`, `submitDevolutiva` — usados pela Task 4 (rotas de API).

- [ ] **Step 1: Criar `src/lib/challenge-service.ts`**

```typescript
import { db } from '@/lib/db';
import type { DevolutivaTipo } from '@prisma/client';

export async function completeDay(userId: string, trackId: string, dayNumber: number): Promise<void> {
  const progress = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId, trackId } },
  });

  const dayCompletions = (progress.dayCompletions as Record<string, { completedAt: string }>) ?? {};
  dayCompletions[String(dayNumber)] = { completedAt: new Date().toISOString() };

  await db.challengeProgress.update({
    where: { userId_trackId: { userId, trackId } },
    data: {
      dayCompletions: dayCompletions as unknown as object,
      currentDay: Math.max(progress.currentDay, dayNumber + 1),
    },
  });
}

export async function updateLastSeenOrdem(
  userId: string,
  trackId: string,
  dayNumber: number,
  ordem: number
): Promise<void> {
  const progress = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId, trackId } },
  });

  const lastSeenOrdem = (progress.lastSeenOrdem as Record<string, number>) ?? {};
  lastSeenOrdem[String(dayNumber)] = ordem;

  await db.challengeProgress.update({
    where: { userId_trackId: { userId, trackId } },
    data: { lastSeenOrdem: lastSeenOrdem as unknown as object },
  });
}

export interface SubmitDevolutivaInput {
  userId: string;
  dayNumber: number;
  tipo: DevolutivaTipo;
  conteudo?: string;
  mediaUrl?: string;
}

export async function submitDevolutiva(input: SubmitDevolutivaInput): Promise<void> {
  await db.devolutiva.create({
    data: {
      userId: input.userId,
      dayNumber: input.dayNumber,
      tipo: input.tipo,
      conteudo: input.conteudo,
      mediaUrl: input.mediaUrl,
    },
  });
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro em nenhum arquivo do repositório (reporte QUALQUER erro, mesmo fora desta task).

- [ ] **Step 3: Commit**

```bash
git add src/lib/challenge-service.ts
git commit -m "feat: add challenge-service (completeDay, updateLastSeenOrdem, submitDevolutiva)"
```

---

### Task 4: Rotas `POST /api/challenge/complete-day`, `/progress`, `/devolutiva`

**Files:**
- Create: `src/app/api/challenge/complete-day/route.ts`
- Create: `src/app/api/challenge/progress/route.ts`
- Create: `src/app/api/challenge/devolutiva/route.ts`

**Interfaces:**
- Consumes: `getSessionUser` (`@/lib/auth`), `completeDay`/`updateLastSeenOrdem`/`submitDevolutiva` (Task 3).
- Produces: as três rotas — consumidas pela Task 5 (`ChallengePlayerClient`).

- [ ] **Step 1: Criar `src/app/api/challenge/complete-day/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { completeDay } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { trackId?: string; dayNumber?: number };
  if (!body.trackId || body.dayNumber === undefined) {
    return NextResponse.json({ error: 'trackId and dayNumber are required' }, { status: 400 });
  }

  await completeDay(user.id, body.trackId, body.dayNumber);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Criar `src/app/api/challenge/progress/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { updateLastSeenOrdem } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { trackId?: string; dayNumber?: number; ordem?: number };
  if (!body.trackId || body.dayNumber === undefined || body.ordem === undefined) {
    return NextResponse.json({ error: 'trackId, dayNumber and ordem are required' }, { status: 400 });
  }

  await updateLastSeenOrdem(user.id, body.trackId, body.dayNumber, body.ordem);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Criar `src/app/api/challenge/devolutiva/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { submitDevolutiva } from '@/lib/challenge-service';
import type { DevolutivaTipo } from '@prisma/client';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    dayNumber?: number;
    tipo?: DevolutivaTipo;
    conteudo?: string;
    mediaUrl?: string;
  };
  if (body.dayNumber === undefined || !body.tipo) {
    return NextResponse.json({ error: 'dayNumber and tipo are required' }, { status: 400 });
  }

  await submitDevolutiva({
    userId: user.id,
    dayNumber: body.dayNumber,
    tipo: body.tipo,
    conteudo: body.conteudo,
    mediaUrl: body.mediaUrl,
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro em nenhum arquivo do repositório (reporte QUALQUER erro, mesmo fora desta task). Não inicie o servidor de dev — a verificação ao vivo é a Task 7, feita pelo controller.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/challenge/complete-day src/app/api/challenge/progress src/app/api/challenge/devolutiva
git commit -m "feat: add challenge API routes (complete-day, progress, devolutiva)"
```

---

### Task 5: Modificar `ChallengePlayerView` + wrappers client

**Files:**
- Modify: `src/components/screens/ChallengePlayerView.tsx`
- Create: `src/components/screens/ChallengePlayerClient.tsx`
- Create: `src/components/screens/ChallengeTimelineClient.tsx`

**Interfaces:**
- Consumes: `useMessageSequence` (já existe, não modificar), as rotas da Task 4.
- Produces: `ChallengePlayerClient`, `ChallengeTimelineClient` — usados pela Task 6 (páginas).

- [ ] **Step 1: Adicionar o prop `onProgressChange` a `ChallengePlayerView.tsx`**

Em `src/components/screens/ChallengePlayerView.tsx`, adicione `useEffect` ao import do React (linha 3):

```typescript
import { useEffect, useState } from 'react';
```

Adicione `onProgressChange` à interface de props (logo após `onSubmitDevolutiva`):

```typescript
interface ChallengePlayerViewProps {
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount?: number;
  onBack?: () => void;
  onCompleteDay: () => void;
  onSubmitDevolutiva: (input: DevolutivaInput) => void;
  onProgressChange?: (visibleCount: number) => void;
}
```

Adicione `onProgressChange` à desestruturação de props da função e capture `visibleCount` do hook:

```typescript
export function ChallengePlayerView({
  day,
  dayTitle,
  initialVisibleCount = 0,
  onBack,
  onCompleteDay,
  onSubmitDevolutiva,
  onProgressChange,
}: ChallengePlayerViewProps) {
  const { visibleMessages, isTyping, isComplete, visibleCount } = useMessageSequence(
    day.messages,
    initialVisibleCount
  );

  useEffect(() => {
    onProgressChange?.(visibleCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount]);
```

O resto do componente (JSX, `journalType`/`journalText`, `saveTextDevolutiva`) fica exatamente como está — só essas quatro mudanças pontuais.

- [ ] **Step 2: Criar `src/components/screens/ChallengePlayerClient.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { ChallengePlayerView } from '@/components/screens/ChallengePlayerView';
import type { ChallengeDay, DevolutivaInput } from '@/types/challenge';

interface ChallengePlayerClientProps {
  trackId: string;
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount: number;
}

export function ChallengePlayerClient({
  trackId,
  day,
  dayTitle,
  initialVisibleCount,
}: ChallengePlayerClientProps) {
  const router = useRouter();

  async function handleCompleteDay() {
    await fetch('/api/challenge/complete-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber }),
    });
    router.push('/desafio');
  }

  async function handleSubmitDevolutiva(input: DevolutivaInput) {
    await fetch('/api/challenge/devolutiva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  }

  function handleProgressChange(visibleCount: number) {
    void fetch('/api/challenge/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber, ordem: visibleCount }),
    });
  }

  return (
    <ChallengePlayerView
      day={day}
      dayTitle={dayTitle}
      initialVisibleCount={initialVisibleCount}
      onBack={() => router.push('/desafio')}
      onCompleteDay={handleCompleteDay}
      onSubmitDevolutiva={handleSubmitDevolutiva}
      onProgressChange={handleProgressChange}
    />
  );
}
```

- [ ] **Step 3: Criar `src/components/screens/ChallengeTimelineClient.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { ChallengeTimelineView } from '@/components/screens/ChallengeTimelineView';
import type { ChallengeProgress, ChallengeTrack } from '@/types/challenge';

interface DayMeta {
  dayNumber: number;
  title: string;
}

interface ChallengeTimelineClientProps {
  track: ChallengeTrack;
  days: DayMeta[];
  progress: ChallengeProgress;
}

export function ChallengeTimelineClient({ track, days, progress }: ChallengeTimelineClientProps) {
  const router = useRouter();

  return (
    <ChallengeTimelineView
      track={track}
      days={days}
      progress={progress}
      onSelectDay={(dayNumber) => router.push(`/desafio/${dayNumber}`)}
      onBack={() => router.push('/dashboard')}
    />
  );
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro em nenhum arquivo do repositório (reporte QUALQUER erro, mesmo fora desta task).

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/ChallengePlayerView.tsx src/components/screens/ChallengePlayerClient.tsx src/components/screens/ChallengeTimelineClient.tsx
git commit -m "feat: add onProgressChange to ChallengePlayerView and client wrappers for timeline/player"
```

---

### Task 6: Páginas `/desafio` e `/desafio/[dia]`

**Files:**
- Create: `src/app/desafio/page.tsx`
- Create: `src/app/desafio/[dia]/page.tsx`
- Modify: `src/app/dashboard/page.tsx` (o link `desafioHref` já aponta pra `/desafio` quando `temDesafio` é true — nenhuma mudança de código necessária aqui, só confirmando que a rota vai existir de verdade agora)

**Interfaces:**
- Consumes: `requireSessionUser` (`@/lib/auth`), `hasActiveEntitlement` (`@/lib/entitlements`), `isDayCompleted`/`isDayUnlocked` (`@/lib/challenge-gating`), `ChallengeTimelineClient`/`ChallengePlayerClient` (Task 5).
- Produces: rotas navegáveis `/desafio` e `/desafio/:dia` — fecha o pedido da Fase 5.

- [ ] **Step 1: Criar `src/app/desafio/page.tsx`**

```typescript
import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { ChallengeTimelineClient } from '@/components/screens/ChallengeTimelineClient';
import type { ChallengeProgress as ChallengeProgressVM, DayCompletion } from '@/types/challenge';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

export default async function DesafioPage() {
  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) {
    redirect('/dashboard');
  }

  const entitlement = await db.entitlement.findFirst({
    where: { userId: user.id, type: 'CHALLENGE', status: 'ACTIVE' },
    orderBy: { grantedAt: 'desc' },
  });
  const trackLevel = (entitlement?.metadata as { track?: NivelGlobal } | null)?.track;
  if (!trackLevel) {
    redirect('/dashboard');
  }

  const track = await db.challengeTrack.findUniqueOrThrow({
    where: { level: trackLevel },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });

  const progressRow = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });

  const dayCompletions = (progressRow.dayCompletions as Record<string, DayCompletion>) ?? {};
  const progressVM: ChallengeProgressVM = {
    trackLevel: track.level,
    currentDay: progressRow.currentDay,
    dayCompletions: Object.fromEntries(
      Object.entries(dayCompletions).map(([day, completion]) => [Number(day), completion])
    ),
  };

  return (
    <ChallengeTimelineClient
      track={{
        level: track.level,
        codename: track.codename,
        title: track.title,
        defaultCooldownHours: track.defaultCooldownHours,
      }}
      days={track.days.map((d) => ({ dayNumber: d.dayNumber, title: d.title }))}
      progress={progressVM}
    />
  );
}
```

- [ ] **Step 2: Criar `src/app/desafio/[dia]/page.tsx`**

```typescript
import { redirect, notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { isDayCompleted, isDayUnlocked } from '@/lib/challenge-gating';
import { ChallengePlayerClient } from '@/components/screens/ChallengePlayerClient';
import type { ChallengeProgress as ChallengeProgressVM, DayCompletion } from '@/types/challenge';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

interface DesafioDiaPageProps {
  params: Promise<{ dia: string }>;
}

export default async function DesafioDiaPage({ params }: DesafioDiaPageProps) {
  const { dia } = await params;
  const dayNumber = Number(dia);

  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) redirect('/dashboard');

  const entitlement = await db.entitlement.findFirst({
    where: { userId: user.id, type: 'CHALLENGE', status: 'ACTIVE' },
    orderBy: { grantedAt: 'desc' },
  });
  const trackLevel = (entitlement?.metadata as { track?: NivelGlobal } | null)?.track;
  if (!trackLevel) redirect('/dashboard');

  const track = await db.challengeTrack.findUniqueOrThrow({ where: { level: trackLevel } });
  const day = await db.challengeDay.findUnique({
    where: { trackId_dayNumber: { trackId: track.id, dayNumber } },
    include: { messages: { orderBy: { ordem: 'asc' } } },
  });
  if (!day) notFound();

  const progressRow = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });

  const dayCompletions = (progressRow.dayCompletions as Record<string, DayCompletion>) ?? {};
  const progressVM: ChallengeProgressVM = {
    trackLevel: track.level,
    currentDay: progressRow.currentDay,
    dayCompletions: Object.fromEntries(
      Object.entries(dayCompletions).map(([d, c]) => [Number(d), c])
    ),
  };

  const accessible =
    isDayCompleted(dayNumber, progressVM) ||
    isDayUnlocked(dayNumber, progressVM, { defaultCooldownHours: track.defaultCooldownHours });
  if (!accessible) redirect('/desafio');

  const lastSeenOrdem = (progressRow.lastSeenOrdem as Record<string, number>) ?? {};
  const initialVisibleCount = lastSeenOrdem[String(dayNumber)] ?? 0;

  return (
    <ChallengePlayerClient
      trackId={track.id}
      day={{
        dayNumber: day.dayNumber,
        isOnboarding: day.isOnboarding,
        messages: day.messages.map((m) => ({
          ordem: m.ordem,
          tipo: m.tipo,
          texto: m.texto ?? undefined,
          mediaKey: m.mediaKey ?? undefined,
          delayMs: m.delayMs,
        })),
      }}
      dayTitle={day.title}
      initialVisibleCount={initialVisibleCount}
    />
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`

Expected: nenhum erro em nenhum arquivo do repositório (reporte QUALQUER erro, mesmo fora desta task). Não inicie o servidor de dev — a verificação ao vivo é a Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/app/desafio
git commit -m "feat: wire /desafio timeline and /desafio/[dia] player pages"
```

---

### Task 7 (controller — não delegar a subagente): Verificação manual do desafio completo

- [ ] Rodar `npm run dev`
- [ ] Logar como a usuária demo (Carolina, `/login`) — ela só tem `Entitlement REPORT`, sem `CHALLENGE`. Acessar `/desafio` diretamente e confirmar redirect pra `/dashboard`.
- [ ] Criar uma usuária de teste nova via quiz (`/welcome` → `/captura` → 41 perguntas) e, no checkout, usar **duas** simulações: uma pro produto `acesso-relatorio` (Fase 4) e outra pro `desafio-7-dias` — via `POST /api/checkout/simulate` diretamente (não tem botão pro desafio na UI ainda, isso é seed de conteúdo, não funil de compra dele — fora do escopo desta fase).
- [ ] Confirmar que essa usuária, ao acessar `/desafio`, vê a timeline real com 8 dias (Dia 0 + Dias 1-7), Dia 0 e Dia 1 acessíveis, os demais bloqueados
- [ ] Clicar no Dia 0 → confirmar que o player mostra as mensagens reais do roteiro (mesmo com mídia quebrada) e o botão "Concluí o dia" aparece ao final
- [ ] Clicar em "Concluí o dia" → confirmar redirect pra `/desafio` e que o Dia 0 aparece como concluído
- [ ] Verificar no banco: `docker compose exec postgres psql -U fertilidade -d fertilidade -c "SELECT \"dayCompletions\", \"lastSeenOrdem\" FROM \"ChallengeProgress\" WHERE \"userId\" = (SELECT id FROM \"User\" WHERE email = '<email-do-teste>');"` — confirmar que `dayCompletions` tem a entrada do dia 0 e `lastSeenOrdem` tem o índice da última mensagem vista
- [ ] Limpar os dados de teste criados (User/Assessment/Order/Entitlement/ChallengeProgress/Session/Devolutiva do e-mail de teste)
- [ ] Parar o servidor de dev

---

## Ao final desta fase

O desafio de 7 dias está funcionalmente completo — roteiro real, gating, progresso persistido, conclusão de dia, devolutiva opcional. Falta só a mídia real (bloqueada até o R2 existir) e um jeito de comprar o desafio pela UI (a `ChallengeOfferView` ainda não está roteada — fica pra quando fizer sentido, não é bloqueio pro vídeo).
