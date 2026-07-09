# Desafio 7 dias — checklist interativa (substitui imagens de rotina) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as 26 mensagens `IMAGEM` do desafio (cards estáticos com lista de rotina/tarefas presa num PNG) por um novo tipo `CHECKLIST` — título + itens tocáveis, com o progresso de marcação salvo no banco por usuária/dia/passo.

**Architecture:** Novo `tipo` de `ChallengeMessage` (`CHECKLIST`) com um campo `checklistItems: Json` (array de strings). Progresso de marcação reaproveita o padrão já usado por `lastSeenOrdem`/`dayCompletions` em `ChallengeProgress` — um novo campo `checklistProgress: Json`, chave `"<dayNumber>:<ordem>"` → array de índices marcados. UI: `ChallengeMessageBubble` ganha um branch novo pra `CHECKLIST`, reaproveitando o cartão/tipografia já usados pelos outros tipos.

**Tech Stack:** Next.js 16 (App Router), React (Client Components), Prisma/PostgreSQL, Tailwind v4. Sem runner de testes — lógica de persistência validada com um script `tsx` temporário contra o banco real; UI validada ao vivo via `npm run dev`.

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-09-desafio-checklist-interativa-design.md`.
- Escopo: as 26 mensagens `IMAGEM` que seguem o padrão "card com lista de rotina" (8 dias × 3 trilhas, com dia 1/6/7 tendo mais de uma imagem em algumas trilhas) — confirmado 1:1 contra o conteúdo real de cada uma antes de escrever este plano.
- Checklist marcada/desmarcada **não trava nada** — não afeta gating, conclusão do dia ou devolutiva (mesmo espírito de `docs/04-motor-do-desafio.md`).
- `seeds/midia-manifesto.csv` **não é alterado** — continua sendo o histórico de migração Drive→R2; as imagens originais continuam existindo no bucket, só deixam de ser referenciadas pelo app. Decisão explícita, não esquecimento.
- Achado durante a transcrição: `desafio/alta/dia1/4.png` tem a mesma `mediaSourceDriveId` de `desafio/baixa/dia1/4.png` (`1jP54FgSXKcmxXCIZs1Xcc2ZEW6z1xxAi`) — é a mesma imagem, com a marca "Fertilidade Baixa" em vez de "Alta". Confirmado com o usuário: usar o texto como está por enquanto (idêntico ao da trilha Baixa); registrado como pendência de conteúdo pra pedir a versão correta à especialista depois — **não é bug de implementação, não precisa de fix de código**.
- Depois de qualquer task que envolva Prisma, rodar `npx tsc --noEmit` no repo inteiro.
- Domínio/UI em português, identificadores de código em português/inglês conforme já usado no arquivo que você está editando.

---

### Task 1: Backend — schema, migration, tipos, service, API

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_checklist/migration.sql` (gerado pelo Prisma)
- Modify: `src/types/challenge.ts`
- Modify: `src/lib/challenge-service.ts`
- Create: `src/app/api/challenge/checklist/route.ts`
- Test: `verify-checklist.tmp.ts` (raiz do repo, temporário — apagar antes de commitar)

**Interfaces:**
- Produces: `ChallengeMessageType` inclui `'CHECKLIST'` (`src/types/challenge.ts`); `ChallengeMessage.checklistItems?: string[]`; `updateChecklistProgress(userId: string, trackId: string, dayNumber: number, ordem: number, checkedIndices: number[]): Promise<void>` (`src/lib/challenge-service.ts`) — consumido pela Task 2.

- [ ] **Step 1: Editar `prisma/schema.prisma`**

Substituir (o enum `MessageType` e o model `ChallengeMessage`):
```prisma
enum MessageType {
  TEXTO
  AUDIO
  IMAGEM
  VIDEO
}

model ChallengeMessage {
  id       String       @id @default(cuid())
  dayId    String
  day      ChallengeDay @relation(fields: [dayId], references: [id])
  ordem    Int
  tipo     MessageType
  texto    String?
  mediaKey String?
  delayMs  Int
}
```
por:
```prisma
enum MessageType {
  TEXTO
  AUDIO
  IMAGEM
  VIDEO
  CHECKLIST
}

model ChallengeMessage {
  id             String       @id @default(cuid())
  dayId          String
  day            ChallengeDay @relation(fields: [dayId], references: [id])
  ordem          Int
  tipo           MessageType
  texto          String?
  mediaKey       String?
  checklistItems Json?
  delayMs        Int
}
```

E o model `ChallengeProgress`:
```prisma
model ChallengeProgress {
  id             String         @id @default(cuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id])
  trackId        String
  track          ChallengeTrack @relation(fields: [trackId], references: [id])
  currentDay     Int            @default(0)
  dayCompletions Json           @default("{}")
  lastSeenOrdem  Json           @default("{}")

  @@unique([userId, trackId])
}
```
por:
```prisma
model ChallengeProgress {
  id                String         @id @default(cuid())
  userId            String
  user              User           @relation(fields: [userId], references: [id])
  trackId           String
  track             ChallengeTrack @relation(fields: [trackId], references: [id])
  currentDay        Int            @default(0)
  dayCompletions    Json           @default("{}")
  lastSeenOrdem     Json           @default("{}")
  checklistProgress Json           @default("{}")

  @@unique([userId, trackId])
}
```

- [ ] **Step 2: Gerar e aplicar a migration**

Run: `npx prisma migrate dev --name add_checklist`
Expected: migration criada em `prisma/migrations/` e aplicada no banco local sem avisos de perda de dado (só adiciona colunas, ambas com valor default/nullable). Prisma Client regenerado.

- [ ] **Step 3: Editar `src/types/challenge.ts`**

Substituir:
```ts
export type ChallengeMessageType = 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'VIDEO';

export interface ChallengeMessage {
  ordem: number;
  tipo: ChallengeMessageType;
  texto?: string;
  /** Caminho no R2 (ex.: "desafio/baixa/dia1/7.mp3"). Ausente para TEXTO puro. */
  mediaKey?: string;
  /** Delay em ms antes de revelar esta mensagem (ritmo estilo WhatsApp). */
  delayMs: number;
}
```
por:
```ts
export type ChallengeMessageType = 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'VIDEO' | 'CHECKLIST';

export interface ChallengeMessage {
  ordem: number;
  tipo: ChallengeMessageType;
  texto?: string;
  /** Caminho no R2 (ex.: "desafio/baixa/dia1/7.mp3"). Ausente para TEXTO puro. */
  mediaKey?: string;
  /** Itens da checklist — só presente quando tipo = CHECKLIST. `texto` é usado como título. */
  checklistItems?: string[];
  /** Delay em ms antes de revelar esta mensagem (ritmo estilo WhatsApp). */
  delayMs: number;
}
```

(Não precisa tocar em mais nada nesse arquivo — `DevolutivaInput` já está correto.)

- [ ] **Step 4: Editar `src/lib/challenge-service.ts`**

Adicionar ao final do arquivo (depois de `submitDevolutiva`):
```ts

export async function updateChecklistProgress(
  userId: string,
  trackId: string,
  dayNumber: number,
  ordem: number,
  checkedIndices: number[]
): Promise<void> {
  const progress = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId, trackId } },
  });

  const checklistProgress = (progress.checklistProgress as Record<string, number[]>) ?? {};
  checklistProgress[`${dayNumber}:${ordem}`] = checkedIndices;

  await db.challengeProgress.update({
    where: { userId_trackId: { userId, trackId } },
    data: { checklistProgress: checklistProgress as unknown as object },
  });
}
```

- [ ] **Step 5: Criar `src/app/api/challenge/checklist/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { updateChecklistProgress } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    trackId?: string;
    dayNumber?: number;
    ordem?: number;
    checkedIndices?: number[];
  };
  if (
    !body.trackId ||
    body.dayNumber === undefined ||
    body.ordem === undefined ||
    !Array.isArray(body.checkedIndices)
  ) {
    return NextResponse.json(
      { error: 'trackId, dayNumber, ordem and checkedIndices are required' },
      { status: 400 }
    );
  }

  await updateChecklistProgress(user.id, body.trackId, body.dayNumber, body.ordem, body.checkedIndices);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Escrever e rodar o script de verificação temporário**

Criar `verify-checklist.tmp.ts` na raiz do repo:
```ts
import { db } from './src/lib/db';
import { updateChecklistProgress } from './src/lib/challenge-service';

async function main() {
  const email = `verify-checklist-${Date.now()}@example.com`;
  const user = await db.user.create({ data: { email, nome: 'Verify Checklist' } });
  const track = await db.challengeTrack.findFirstOrThrow();

  await db.challengeProgress.create({
    data: { userId: user.id, trackId: track.id, currentDay: 1 },
  });

  await updateChecklistProgress(user.id, track.id, 3, 2, [0, 2]);

  const progress = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });
  const checklistProgress = progress.checklistProgress as Record<string, number[]>;
  if (JSON.stringify(checklistProgress['3:2']) !== JSON.stringify([0, 2])) {
    throw new Error(`esperava [0,2] em "3:2", achou ${JSON.stringify(checklistProgress)}`);
  }
  console.log('OK: checklistProgress gravado e lido corretamente:', checklistProgress);

  // Sobrescrever com um novo array (simula desmarcar um item)
  await updateChecklistProgress(user.id, track.id, 3, 2, [0]);
  const progress2 = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });
  const checklistProgress2 = progress2.checklistProgress as Record<string, number[]>;
  if (JSON.stringify(checklistProgress2['3:2']) !== JSON.stringify([0])) {
    throw new Error(`esperava [0] em "3:2" após atualização, achou ${JSON.stringify(checklistProgress2)}`);
  }
  console.log('OK: atualização sobrescreve o array corretamente:', checklistProgress2);

  await db.challengeProgress.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log('OK: limpeza concluída');
}

main()
  .catch((e) => {
    console.error('FALHOU:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

Run: `node --env-file=.env node_modules/tsx/dist/cli.mjs verify-checklist.tmp.ts`
Expected: as 3 linhas `OK:` impressas, sem erro.

- [ ] **Step 8: Apagar o script temporário**

```bash
rm verify-checklist.tmp.ts
```

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/types/challenge.ts src/lib/challenge-service.ts src/app/api/challenge/checklist/route.ts
git commit -m "feat: add CHECKLIST message type and persisted checklist progress"
```

---

### Task 2: UI da checklist + wiring completo

**Files:**
- Modify: `src/components/ui/ChallengeMessageBubble.tsx`
- Modify: `src/components/screens/ChallengePlayerView.tsx`
- Modify: `src/components/screens/ChallengePlayerClient.tsx`
- Modify: `src/app/desafio/[dia]/page.tsx`
- Test: `seed-test-checklist.tmp.ts` (raiz do repo, temporário — apagar antes de commitar)

**Interfaces:**
- Consumes: `updateChecklistProgress` (Task 1, `@/lib/challenge-service`), `ChallengeMessage.checklistItems` (Task 1, `@/types/challenge`).
- Produces: `ChallengeMessageBubble` aceita `initialCheckedIndices?: number[]` e `onChecklistChange?: (checkedIndices: number[]) => void` (usados só quando `message.tipo === 'CHECKLIST'`) — nenhum outro consumidor existente passa essas props, então continuam funcionando sem mudança.

- [ ] **Step 1: Editar `src/components/ui/ChallengeMessageBubble.tsx`**

Adicionar `Check` ao import de ícones:
```tsx
import { Pause, Play } from 'lucide-react';
```
por:
```tsx
import { Check, Pause, Play } from 'lucide-react';
```

Trocar a assinatura do componente principal — de:
```tsx
export function ChallengeMessageBubble({ message }: { message: ChallengeMessage }) {
```
por:
```tsx
interface ChallengeMessageBubbleProps {
  message: ChallengeMessage;
  /** Índices já marcados quando a mensagem é CHECKLIST (retomada). */
  initialCheckedIndices?: number[];
  /** Disparado a cada toque num item, com o array atualizado de índices marcados. */
  onChecklistChange?: (checkedIndices: number[]) => void;
}

export function ChallengeMessageBubble({
  message,
  initialCheckedIndices = [],
  onChecklistChange,
}: ChallengeMessageBubbleProps) {
```

Adicionar o branch de `CHECKLIST` logo após o branch de `TEXTO` (antes do `if (message.tipo === 'IMAGEM')`):
```tsx
  if (message.tipo === 'CHECKLIST') {
    return (
      <ChecklistContent
        title={message.texto ?? ''}
        items={message.checklistItems ?? []}
        initialCheckedIndices={initialCheckedIndices}
        onChange={onChecklistChange}
      />
    );
  }
```

Adicionar o componente `ChecklistContent` no final do arquivo (depois de `AudioContent`):
```tsx

function ChecklistContent({
  title,
  items,
  initialCheckedIndices,
  onChange,
}: {
  title: string;
  items: string[];
  initialCheckedIndices: number[];
  onChange?: (checkedIndices: number[]) => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set(initialCheckedIndices));

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      onChange?.([...next].sort((a, b) => a - b));
      return next;
    });
  }

  return (
    <div className="animate-fade-in space-y-4">
      <p className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)] text-center leading-snug">
        {title}
      </p>
      <div className="bg-white rounded-xl border border-[var(--color-border-soft)] divide-y divide-[var(--color-border-soft)] overflow-hidden">
        {items.map((item, index) => {
          const isChecked = checked.has(index);
          return (
            <button
              key={index}
              onClick={() => toggle(index)}
              className="w-full flex items-start gap-3 p-3.5 text-left"
            >
              <span
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isChecked
                    ? 'bg-[var(--color-brand-sage)] border-[var(--color-brand-sage)]'
                    : 'border-[var(--color-border-soft)]'
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
              </span>
              <span
                className={`text-xs leading-relaxed ${
                  isChecked
                    ? 'text-[var(--color-brand-brown)]/40 line-through'
                    : 'text-[var(--color-brand-brown)]'
                }`}
              >
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Editar `src/components/screens/ChallengePlayerView.tsx`**

Adicionar duas props novas à interface — de:
```tsx
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
por:
```tsx
interface ChallengePlayerViewProps {
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount?: number;
  /** Progresso de checklist já salvo, chave "<dayNumber>:<ordem>" -> índices marcados. */
  initialChecklistProgress?: Record<string, number[]>;
  onBack?: () => void;
  onCompleteDay: () => void;
  onSubmitDevolutiva: (input: DevolutivaInput) => void;
  onProgressChange?: (visibleCount: number) => void;
  onChecklistChange?: (ordem: number, checkedIndices: number[]) => void;
}
```

Adicionar `initialChecklistProgress = {}` e `onChecklistChange` à desestruturação — de:
```tsx
export function ChallengePlayerView({
  day,
  dayTitle,
  initialVisibleCount = 0,
  onBack,
  onCompleteDay,
  onSubmitDevolutiva,
  onProgressChange,
}: ChallengePlayerViewProps) {
```
por:
```tsx
export function ChallengePlayerView({
  day,
  dayTitle,
  initialVisibleCount = 0,
  initialChecklistProgress = {},
  onBack,
  onCompleteDay,
  onSubmitDevolutiva,
  onProgressChange,
  onChecklistChange,
}: ChallengePlayerViewProps) {
```

Passar as props novas pra `ChallengeMessageBubble` — de:
```tsx
      <div className="flex-grow p-5 pb-32">
        <ChallengeMessageBubble key={currentMessage.ordem} message={currentMessage} />
      </div>
```
por:
```tsx
      <div className="flex-grow p-5 pb-32">
        <ChallengeMessageBubble
          key={currentMessage.ordem}
          message={currentMessage}
          initialCheckedIndices={initialChecklistProgress[`${day.dayNumber}:${currentMessage.ordem}`] ?? []}
          onChecklistChange={(checkedIndices) => onChecklistChange?.(currentMessage.ordem, checkedIndices)}
        />
      </div>
```

- [ ] **Step 3: Editar `src/components/screens/ChallengePlayerClient.tsx`**

Substituir o arquivo inteiro (só adiciona a prop `initialChecklistProgress`, o handler `handleChecklistChange`, e repassa os dois pro `ChallengePlayerView` — o resto fica igual):
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { ChallengePlayerView } from '@/components/screens/ChallengePlayerView';
import type { ChallengeDay, DevolutivaInput } from '@/types/challenge';

interface ChallengePlayerClientProps {
  trackId: string;
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount: number;
  initialChecklistProgress?: Record<string, number[]>;
}

export function ChallengePlayerClient({
  trackId,
  day,
  dayTitle,
  initialVisibleCount,
  initialChecklistProgress,
}: ChallengePlayerClientProps) {
  const router = useRouter();

  async function handleCompleteDay() {
    await fetch('/api/challenge/complete-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber }),
    });
    router.push(`/desafio/${day.dayNumber}/concluido`);
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

  function handleChecklistChange(ordem: number, checkedIndices: number[]) {
    void fetch('/api/challenge/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber, ordem, checkedIndices }),
    });
  }

  return (
    <ChallengePlayerView
      day={day}
      dayTitle={dayTitle}
      initialVisibleCount={initialVisibleCount}
      initialChecklistProgress={initialChecklistProgress}
      onBack={() => router.push('/desafio')}
      onCompleteDay={handleCompleteDay}
      onSubmitDevolutiva={handleSubmitDevolutiva}
      onProgressChange={handleProgressChange}
      onChecklistChange={handleChecklistChange}
    />
  );
}
```

- [ ] **Step 4: Editar `src/app/desafio/[dia]/page.tsx`**

Adicionar a leitura do `checklistProgress` — depois da linha:
```tsx
  const lastSeenOrdem = (progressRow.lastSeenOrdem as Record<string, number>) ?? {};
  const initialVisibleCount = lastSeenOrdem[String(dayNumber)] ?? 0;
```
adicionar:
```tsx
  const checklistProgress = (progressRow.checklistProgress as Record<string, number[]>) ?? {};
```

E atualizar o mapeamento de mensagens + a chamada de `ChallengePlayerClient` — de:
```tsx
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
```
por:
```tsx
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
          checklistItems: (m.checklistItems as string[] | null) ?? undefined,
          delayMs: m.delayMs,
        })),
      }}
      dayTitle={day.title}
      initialVisibleCount={initialVisibleCount}
      initialChecklistProgress={checklistProgress}
    />
  );
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Verificação ao vivo com uma checklist de teste**

Como os seeds ainda não têm nenhuma mensagem `CHECKLIST` real (isso é a Task 3), crie uma temporariamente pra validar o mecanismo inteiro antes da transcrição de conteúdo.

Criar `seed-test-checklist.tmp.ts` na raiz do repo:
```ts
import { db } from './src/lib/db';

async function main() {
  const track = await db.challengeTrack.findFirstOrThrow();
  const day = await db.challengeDay.findFirstOrThrow({ where: { trackId: track.id, dayNumber: 1 } });

  const created = await db.challengeMessage.create({
    data: {
      dayId: day.id,
      ordem: 999,
      tipo: 'CHECKLIST',
      texto: 'Checklist de teste (Task 2)',
      checklistItems: ['Item um', 'Item dois', 'Item três'],
      delayMs: 0,
    },
  });
  console.log('Mensagem de teste criada:', created.id, '- dia', day.dayNumber, 'trilha', track.level);
  console.log('Rode `npm run dev`, logue como a usuária demo, e abra /desafio/1 pra ver o passo extra no fim.');
}

main().finally(() => db.$disconnect());
```

Run: `node --env-file=.env node_modules/tsx/dist/cli.mjs seed-test-checklist.tmp.ts`

Run: `npm run dev`, logar como `carolinapalitot20@gmail.com`, navegar até `/desafio/1` e avançar pelos passos até chegar no passo extra "Checklist de teste (Task 2)".

Expected:
- O passo mostra o título centralizado + 3 itens com checkbox.
- Tocar um item marca (fundo sálvia, ícone de check, texto riscado); tocar de novo desmarca.
- Sair da tela (`/desafio`) e voltar pro mesmo dia — os itens marcados continuam marcados (persistência confirmada).

Depois de confirmar, apagar a mensagem de teste do banco (não pode sobrar). Criar `cleanup-test-checklist.tmp.ts`:
```ts
import { db } from './src/lib/db';

async function main() {
  const deleted = await db.challengeMessage.deleteMany({ where: { ordem: 999, tipo: 'CHECKLIST' } });
  console.log(`Apagadas ${deleted.count} mensagens de teste.`);
}

main().finally(() => db.$disconnect());
```
Run: `node --env-file=.env node_modules/tsx/dist/cli.mjs cleanup-test-checklist.tmp.ts`

- [ ] **Step 7: Apagar os scripts temporários**

```bash
rm seed-test-checklist.tmp.ts cleanup-test-checklist.tmp.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/ChallengeMessageBubble.tsx src/components/screens/ChallengePlayerView.tsx src/components/screens/ChallengePlayerClient.tsx src/app/desafio/[dia]/page.tsx
git commit -m "feat: render interactive checklist step with persisted progress"
```

---

### Task 3: Transcrição de conteúdo — 26 imagens viram CHECKLIST

**Files:**
- Modify: `seeds/desafio-track-baixa.json`
- Modify: `seeds/desafio-track-moderada.json`
- Modify: `seeds/desafio-track-alta.json`
- Modify: `prisma/seed.ts`
- Test: `scripts/convert-checklist-content.tmp.ts` (raiz do repo — na verdade em `scripts/`, temporário, apagar antes de commitar)

**Interfaces:** nenhuma (dado, não código).

- [ ] **Step 1: Editar `prisma/seed.ts` pra incluir `checklistItems` no mapeamento de mensagens**

`seedChallengeTracks` mapeia os campos de `ChallengeMessage` um a um (não usa spread), então o campo novo precisa ser adicionado explicitamente. Substituir:
```ts
          messages: {
            create: day.messages.map((m) => ({
              ordem: m.ordem,
              tipo: m.tipo,
              texto: m.texto,
              mediaKey: m.mediaKey,
              delayMs: m.delayMs,
            })),
          },
```
por:
```ts
          messages: {
            create: day.messages.map((m) => ({
              ordem: m.ordem,
              tipo: m.tipo,
              texto: m.texto,
              mediaKey: m.mediaKey,
              checklistItems: m.checklistItems,
              delayMs: m.delayMs,
            })),
          },
```

E a interface `DesafioSourceMessage` no mesmo arquivo — substituir:
```ts
interface DesafioSourceMessage {
  ordem: number;
  tipo: 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'VIDEO';
  delayMs: number;
  texto?: string;
  mediaKey?: string;
}
```
por:
```ts
interface DesafioSourceMessage {
  ordem: number;
  tipo: 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'VIDEO' | 'CHECKLIST';
  delayMs: number;
  texto?: string;
  mediaKey?: string;
  checklistItems?: string[];
}
```

- [ ] **Step 2: Criar `scripts/convert-checklist-content.tmp.ts`**

```ts
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

interface ChecklistEntry {
  mediaKey: string;
  texto: string;
  checklistItems: string[];
}

const CHECKLISTS: ChecklistEntry[] = [
  // ===== BAIXA =====
  {
    mediaKey: 'desafio/baixa/dia1/4.png',
    texto: 'Acalmar o sistema nervoso por 7 dias, ao acordar:',
    checklistItems: [
      'Atenção a Mastigação: Mastigue 30 vezes antes de engolir',
      'Baixar as luzes cedo, evitar celular e computador.',
      'Dormir antes das 11 horas',
      'Praticar meditação e atos de fé e espiritualidade.',
      'Evitar comer após o jantar',
      'Crie o hábito de escalda pés com óleos essênciais: jeranio, laranja doce, lavanda e ou alecrim.',
      'Uso: 2 gotas diluídas para massagem na lombar e parte inferior do abdome.',
    ],
  },
  {
    mediaKey: 'desafio/baixa/dia1/5.png',
    texto: 'Acalmar o sistema nervoso por 7 dias, ao acordar: (continuação)',
    checklistItems: [
      'Ritual da manhã: Shot calmante (sugestão: limão, cúrcuma, mel e água morna ou própolis com limão).',
      'Evite o mel se estiver com perfil glicêmico alterado.',
      'Use o raspador de língua',
      'Ingesta de água (300 a 500ml)',
      'Tarefa: 10 minutos de respiração consciente e alongamento',
      'Evite café por 90 minutos após acordar',
      'Atividade Física, pelo menos 3 vezes por semana.',
    ],
  },
  {
    mediaKey: 'desafio/baixa/dia2/3.png',
    texto: 'Desafio contínuo: prática diária de suporte ao ciclo menstrual — inicie seu diário do ciclo:',
    checklistItems: [
      'Duração do sono',
      'Energia ao acordar',
      'Tipo de muco',
      'Humor e libido',
      'Sintomas físicos (dor, inchaço, cólica)',
    ],
  },
  {
    mediaKey: 'desafio/baixa/dia3/3.png',
    texto: 'Monte um cardápio simples com base em:',
    checklistItems: [
      '1 alimento anti-inflamatório por refeição (ex: abacate, gengibre, sardinha, couve)',
      'Evite ultraprocessados e cafeína em excesso por 48h',
      'Consuma chá de camomila, alecrim ou casca de abacaxi',
    ],
  },
  {
    mediaKey: 'desafio/baixa/dia4/3.png',
    texto: 'Limpeza ambiental e sensorial',
    checklistItems: [
      'Tire 1 cosmético ou produto de limpeza comum da rotina',
      'Use aromaterapia (lavanda, laranja doce ou hortelã)',
      'Elimine ruídos visuais do ambiente (ex: celular, TV ao fundo)',
    ],
  },
  {
    mediaKey: 'desafio/baixa/dia5/3.png',
    texto: 'Desafio: cuidar do fígado é liberar a ovulação',
    checklistItems: [
      'Ritual: Meditação com foco no útero e visualização de um ninho fértil',
      'Reforçar o Yin Chá e Acrescente goji berry',
      'Alimento: Tofu, peixes, azeite, gergelim',
      'Alimentos amargos no jantar (ex: agrião, rúcula, couve)',
      'Alimento-chave: Frutas vermelhas + oleaginosas',
    ],
  },
  {
    mediaKey: 'desafio/baixa/dia6/4.png',
    texto: 'Desafio: respiração + afirmação + presença',
    checklistItems: [
      'Escolha uma afirmação (ex: "Eu mereço gerar vida", "Estou em reconstrução e me honro por isso")',
      'Inspire por 5 segundos, expire por 8 (repita 5x)',
      'Repita sua afirmação em voz baixa, de olhos fechados, com as mãos sobre o ventre',
    ],
  },
  {
    mediaKey: 'desafio/baixa/dia7/4.png',
    texto: 'Desafio: carta de acolhimento e rendição',
    checklistItems: [
      'Escreva para si mesma reconhecendo seu esforço, mesmo quando os resultados não aparecem.',
      'Declare três coisas que você vai permitir: descansar, confiar, continuar',
      'Termine com: "Eu não desisto de mim. Eu me recebo em amor."',
    ],
  },
  // ===== MODERADA =====
  {
    mediaKey: 'desafio/moderada/dia1/4.png',
    texto: 'Acalmar o sistema nervoso por 7 dias, ao acordar:',
    checklistItems: [
      'Ritual da manhã: Shot calmante (sugestão: limão, cúrcuma, mel e água morna ou própolis com limão).',
      'Evite o mel se estiver com perfil glicêmico alterado.',
      'Use o raspador de língua',
      'Ingesta de água (300 a 500ml)',
      'Tarefa: 10 minutos de respiração consciente e alongamento',
      'Evite café por 90 minutos após acordar',
      'Atividade Física, pelo menos 3 vezes por semana.',
      'Atenção a Mastigação: Mastigue 30 vezes antes de engolir',
    ],
  },
  {
    mediaKey: 'desafio/moderada/dia1/5.png',
    texto: 'Acalmar o sistema nervoso por 7 dias, ao acordar: (continuação)',
    checklistItems: [
      'Baixar as luzes cedo, evitar celular e computador.',
      'Dormir antes das 11 horas',
      'Praticar meditação e atos de fé e espiritualidade.',
      'Evitar comer após o jantar',
      'Crie o hábito de escalda pés com óleos essênciais: jeranio, laranja doce, lavanda e ou alecrim. Uso: 2 gotas diluídas para massagem na lombar e parte inferior do abdome.',
      'Evite excesso de carne vermelha',
      'Anote ao longo do dia: picos de energia e cansaço, horário das suas vontades alimentares, sinais do intestino/pele/muco/temperatura e emoção predominante do dia',
    ],
  },
  {
    mediaKey: 'desafio/moderada/dia2/3.png',
    texto: 'Durante os próximos 5 dias, comece sua manhã com:',
    checklistItems: ['2 ovos no café da manhã', 'Ciclo das sementes', 'Evite café'],
  },
  {
    mediaKey: 'desafio/moderada/dia3/3.png',
    texto: 'Monte um cardápio simples com base em:',
    checklistItems: [
      '1 alimento anti-inflamatório por refeição (ex: abacate, gengibre, sardinha, couve)',
      'Evite: ultraprocessados e cafeína em excesso por 48h',
      'Consuma chá de camomila, alecrim ou casca de abacaxi',
    ],
  },
  {
    mediaKey: 'desafio/moderada/dia4/3.png',
    texto: 'Limpeza ambiental e sensorial',
    checklistItems: [
      'Tire 1 cosmético ou produto de limpeza comum da rotina',
      'Use aromaterapia (lavanda, laranja doce ou hortelã)',
      'Elimine ruídos visuais do ambiente (ex: celular, TV ao fundo)',
    ],
  },
  {
    mediaKey: 'desafio/moderada/dia5/3.png',
    texto: 'Mini detox fígado-intestino',
    checklistItems: [
      'Comece o dia com suco de limão + beterraba ou hortelã',
      'Inclua 2 porções de vegetais amargos (couve, rúcula, agrião)',
      'Evite laticínios por 24h',
    ],
  },
  {
    mediaKey: 'desafio/moderada/dia6/4.png',
    texto: 'Desacelere para ovular',
    checklistItems: [
      'Estabeleça 3 pausas conscientes no seu dia (5 minutos cada)',
      'Coloque uma música instrumental suave enquanto almoça',
      'Diga para si mesma 1 frase de confiança em voz alta',
      'Não esqueça a atividade física',
    ],
  },
  {
    mediaKey: 'desafio/moderada/dia7/4.png',
    texto: 'Carta raiz de entrega e abertura',
    checklistItems: [
      'Escreva uma carta para si mesma do futuro, dizendo: "Valeu a pena confiar."',
      'Declare o que você quer gerar: uma vida, uma paz, um ciclo novo.',
      'Ore, respire, entregue.',
    ],
  },
  // ===== ALTA =====
  {
    // Mesma driveId de desafio/baixa/dia1/4.png (imagem errada subida na trilha Alta,
    // com a marca "Fertilidade Baixa" em vez de "Alta") — confirmado com o usuário
    // usar o texto como está por enquanto. Pendência de conteúdo, não de código.
    mediaKey: 'desafio/alta/dia1/4.png',
    texto: 'Acalmar o sistema nervoso por 7 dias, ao acordar:',
    checklistItems: [
      'Atenção a Mastigação: Mastigue 30 vezes antes de engolir',
      'Baixar as luzes cedo, evitar celular e computador.',
      'Dormir antes das 11 horas',
      'Praticar meditação e atos de fé e espiritualidade.',
      'Evitar comer após o jantar',
      'Crie o hábito de escalda pés com óleos essênciais: jeranio, laranja doce, lavanda e ou alecrim.',
      'Uso: 2 gotas diluídas para massagem na lombar e parte inferior do abdome.',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia1/5.png',
    texto: 'Acalmar o sistema nervoso por 7 dias, ao acordar: (continuação)',
    checklistItems: [
      'Baixar as luzes cedo, evitar celular e computador.',
      'Dormir antes das 11 horas',
      'Praticar meditação e atos de fé e espiritualidade.',
      'Evitar comer após o jantar',
      'Crie o hábito de escalda pés com óleos essênciais: jeranio, laranja doce, lavanda e ou alecrim. Uso: 2 gotas diluídas para massagem na lombar e parte inferior do abdome.',
      'Evite excesso de carne vermelha',
      'Chá do dia: Camomila com folhas de amora (calmante e regulador hormonal)',
      'Acrescente porção de gorduras boas (abacate, sementes, azeite)',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia2/3.png',
    texto: 'Desafio contínuo: prática diária de suporte ao ciclo menstrual — inicie seu diário do ciclo:',
    checklistItems: [
      'Duração do sono',
      'Energia ao acordar',
      'Tipo de muco',
      'Humor e libido',
      'Sintomas físicos (dor, inchaço, cólica)',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia3/3.png',
    texto: 'Contínuo: organize sua alimentação com base em 3 pilares:',
    checklistItems: [
      '2x/dia alimentos ricos em colina (ovos caipiras, fígado, couve)',
      'Valorize a semente de gergelim e castanha do pará (valorizando cálcio e selênio)',
      'Reduza ao mínimo: açúcar, industrializados, frituras',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia4/3.png',
    texto: 'Contínuo: faça uma faxina de fertilidade e detox nos produtos de limpeza beleza',
    checklistItems: [
      'Substitua desodorante ou cosmético com parabenos, alumínio e outros disruptores endócrinos',
      'Troque as panelas de alumínio, se possível, por panela de inox ou cerâmica.',
      'Evite uso de plástico para alimentos quentes ou úmidos',
      'Inclua 1 momento diário de silêncio (sem celular/tela)',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia5/3.png',
    texto: 'Contínuo: prática diária de suporte ao fígado e intestino',
    checklistItems: [
      'Caminhada após refeição',
      'Chá noturno (camomila ou alecrim)',
      'Fibra + vegetal + semente por dia',
      'Massagem abdominal leve',
      'Missões: reduzir telas à noite, sentar com presença para comer, atenção à mastigação, acrescentar limão antes do almoço ou na salada',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia6/4.png',
    texto: 'Ritual de presença e integração (10 minutos/dia)',
    checklistItems: [
      'Escolha uma frase de afirmação pra repetir ao longo da prática (sugestões: "Meu corpo está em harmonia com meu desejo de gerar.", "Eu acolho a vida com leveza e confiança.", "Sou receptiva ao novo que quer florescer em mim.")',
      'Sente-se confortavelmente e respire profundamente por 3 a 5 minutos.',
      'Com um óleo vegetal ou creme natural, aplique uma massagem suave no abdômen inferior.',
      'Feche a prática com uma respiração profunda e coloque as mãos em repouso sobre o ventre.',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia6/7.png',
    texto: 'Missões complementares do dia',
    checklistItems: [
      'Escreva sua afirmação preferida em um papel e cole no espelho ou perto da cama.',
      'Durante o dia, leve as mãos ao ventre por 1 minuto e respire conscientemente.',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia7/4.png',
    texto: 'Jornada de descanso ativo na promessa',
    checklistItems: [
      'Leia o Salmo 37:5: "Entrega o teu caminho ao Senhor; confia nele, e o mais ele fará."',
      'Escolha um lugar tranquilo da casa, sem distrações, e escreva em um papel as 3 principais coisas que você está tentando controlar sozinha (ex: sua ansiedade, o tempo do positivo, a resposta do seu corpo).',
    ],
  },
  {
    mediaKey: 'desafio/alta/dia7/7.png',
    texto: 'Entrega em oração',
    checklistItems: [
      'Ore em voz baixa ou escrevendo, dizendo: "Senhor, eu entrego. Porque Tu és Deus, e eu sou tua filha. Eu não preciso carregar sozinha o que foi feito para ser colocado em Tuas mãos."',
      'Guarde esse papel dentro da sua Bíblia ou diário.',
      'E volte a ele toda vez que tentar retomar o controle.',
    ],
  },
];

function convert(fileName: string): void {
  const filePath = path.join(process.cwd(), fileName);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  let count = 0;

  for (const day of data.days) {
    for (const m of day.messages) {
      if (m.tipo === 'IMAGEM') {
        const entry = CHECKLISTS.find((c) => c.mediaKey === m.mediaKey);
        if (!entry) {
          throw new Error(`Sem checklist definida pra ${m.mediaKey} (${fileName})`);
        }
        m.tipo = 'CHECKLIST';
        m.texto = entry.texto;
        m.checklistItems = entry.checklistItems;
        delete m.mediaKey;
        delete m.mediaSourceDriveId;
        count += 1;
      }
    }
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`${fileName}: ${count} IMAGEM -> CHECKLIST`);
}

convert('seeds/desafio-track-baixa.json');
convert('seeds/desafio-track-moderada.json');
convert('seeds/desafio-track-alta.json');

console.log('Concluído.');
```

- [ ] **Step 3: Rodar o script**

Run: `npx tsx scripts/convert-checklist-content.tmp.ts`
Expected:
```
seeds/desafio-track-baixa.json: 8 IMAGEM -> CHECKLIST
seeds/desafio-track-moderada.json: 8 IMAGEM -> CHECKLIST
seeds/desafio-track-alta.json: 10 IMAGEM -> CHECKLIST
Concluído.
```

- [ ] **Step 4: Conferir que não sobrou nenhum IMAGEM do padrão antigo**

Run: `grep -c '"tipo": "IMAGEM"' seeds/desafio-track-baixa.json seeds/desafio-track-moderada.json seeds/desafio-track-alta.json`
Expected: `0` pros 3 arquivos (todas as `IMAGEM` que existiam eram as 26 desse padrão — não há nenhuma outra imagem fora desse conjunto nos seeds atuais).

- [ ] **Step 5: Apagar o script temporário**

```bash
rm scripts/convert-checklist-content.tmp.ts
```

- [ ] **Step 6: Reseed**

Run: `npm run db:seed`
Expected: saída normal de sempre (13 pilares, 41 perguntas, 3 trilhas, usuária demo) — sem erro, agora que o Step 1 já adicionou `checklistItems` ao mapeamento de `prisma/seed.ts`.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add seeds/desafio-track-baixa.json seeds/desafio-track-moderada.json seeds/desafio-track-alta.json prisma/seed.ts
git commit -m "content: convert routine-checklist images to structured CHECKLIST messages"
```

---

### Task 4: Verificação ao vivo com banco real (controller, não subagente)

**Files:** nenhum (só verificação).

**Interfaces:** nenhuma.

> Mesma ressalva das fases anteriores: rodar servidor de dev e testar no navegador
> é tarefa do controller, com o usuário presente — subagentes em background não
> conseguem fazer isso nesta máquina.

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`

- [ ] **Step 2: Testar com a usuária demo**

- Logar como `carolinapalitot20@gmail.com`.
- Abrir um dia com checklist real (ex.: `/desafio/3`, que tem `IMAGEM`→`CHECKLIST` na posição 3) e navegar até o passo da checklist.
- Confirmar: título grande + lista de itens tocáveis aparece (não mais a imagem).
- Marcar 2 itens, sair pra `/desafio` e voltar — confirmar que continuam marcados.
- Testar em pelo menos um dia com 2 checklists seguidas de trilhas diferentes (ex.: `/desafio/1`, que tem duas — ordem 4 e 5) pra confirmar que marcar uma não interfere na outra.

- [ ] **Step 3: Resetar o estado de progresso da Carolina**

Run: `npm run db:seed`

- [ ] **Step 4: Reportar ao usuário**

Resumir o que foi testado e pedir confirmação antes de considerar a branch pronta
pra push/deploy — em especial pedir pra especialista revisar o texto de
`desafio/alta/dia1/4.png` (pendência de conteúdo registrada nas Global Constraints).
