# Desafio 7 dias — formato de aula (stepper) + devolutiva só texto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o player do desafio (chat estilo WhatsApp com delay automático e "digitando…") por um formato de aula em passos (stepper), navegado ativamente pela usuária, e simplificar a devolutiva de fim de dia para aceitar só texto.

**Architecture:** Lógica de navegação do stepper vive como funções puras testáveis em `src/lib/challenge-stepper.ts`, envolvidas por um hook fino `useChallengeStepper`. `ChallengeMessageBubble` perde o estilo de bolha de chat (avatar, balão) e vira o conteúdo de um "cartão" mostrado um por vez. `ChallengePlayerView` troca a lista acumulada de mensagens + indicador de digitação por um passo por vez com navegação Voltar/Próximo. Devolutiva simplifica o schema Prisma (`Devolutiva.texto` no lugar de `tipo`/`conteudo`/`mediaUrl`) e a API/serviço correspondentes.

**Tech Stack:** Next.js 16 (App Router), React (Client Components), Prisma/PostgreSQL, Tailwind v4. Sem runner de testes (jest/vitest ausentes) — lógica pura validada com scripts `tsx` (`node:assert/strict`), UI validada ao vivo via `npm run dev` (`/preview/desafio` sem banco, depois com a usuária demo).

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md` — qualquer dúvida de comportamento, essa é a fonte da verdade.
- Cada `ChallengeMessage` continua sendo 1 passo — nenhuma mudança nos seeds (`seeds/desafio-track-*.json`) ou no modelo `ChallengeMessage`.
- `delayMs` **permanece** no schema e nos seeds, só para de ser lido pela UI nova (decisão explícita da spec — não remover).
- Stepper: pode voltar/avançar livremente entre passos já vistos; só revela um passo novo por vez (nunca pula pra um passo nunca visto).
- Devolutiva nunca trava a conclusão do dia — ações independentes (regra já existente em `docs/04-motor-do-desafio.md`, não muda).
- Devolutiva vira só texto: campo `texto` obrigatório (sem texto não existe devolutiva).
- Domínio/UI em português, identificadores de código em inglês/português conforme já usado no arquivo (siga o padrão do arquivo que está editando).
- Sem lógica de negócio solta em componentes — lógica pura em `/lib`, testável (convenção do `CLAUDE.md`).
- Depois de qualquer task que envolva Prisma, rodar `npx tsc --noEmit` no repo inteiro, não só no arquivo novo (lição registrada no histórico do projeto: `tsx` não faz type-check completo).

---

### Task 1: Lógica pura do stepper + testes

**Files:**
- Create: `src/lib/challenge-stepper.ts`
- Create: `src/lib/challenge-stepper.test.ts`

**Interfaces:**
- Produces: `StepperState { currentIndex: number; maxVisitedIndex: number }`, `initStepperState(initialIndex: number, totalSteps: number): StepperState`, `goNext(state: StepperState, totalSteps: number): StepperState`, `goPrevious(state: StepperState): StepperState`, `canGoNext(state: StepperState, totalSteps: number): boolean`, `canGoBack(state: StepperState): boolean`, `isLastStep(state: StepperState, totalSteps: number): boolean` — consumidos pela Task 4 (`useChallengeStepper`).

- [ ] **Step 1: Escrever `src/lib/challenge-stepper.ts`**

```ts
/**
 * Navegação do stepper do desafio (docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md):
 * um `ChallengeMessage` por vez, controlada pela usuária. Pode voltar e
 * avançar livremente entre passos já vistos; só revela um passo novo por
 * vez (nunca pula pra um passo nunca visto).
 *
 * `maxVisitedIndex` é o ponto mais avançado já alcançado na sessão — é o
 * que deve ser persistido pra retomada (não `currentIndex`, que pode
 * diminuir se a usuária voltar antes de sair da tela).
 */
export interface StepperState {
  currentIndex: number;
  maxVisitedIndex: number;
}

export function initStepperState(initialIndex: number, totalSteps: number): StepperState {
  const upperBound = Math.max(0, totalSteps - 1);
  const clamped = Math.min(Math.max(0, initialIndex), upperBound);
  return { currentIndex: clamped, maxVisitedIndex: clamped };
}

export function goNext(state: StepperState, totalSteps: number): StepperState {
  if (state.currentIndex >= totalSteps - 1) return state;
  const currentIndex = state.currentIndex + 1;
  return { currentIndex, maxVisitedIndex: Math.max(state.maxVisitedIndex, currentIndex) };
}

export function goPrevious(state: StepperState): StepperState {
  if (state.currentIndex <= 0) return state;
  return { ...state, currentIndex: state.currentIndex - 1 };
}

export function canGoNext(state: StepperState, totalSteps: number): boolean {
  return state.currentIndex < totalSteps - 1;
}

export function canGoBack(state: StepperState): boolean {
  return state.currentIndex > 0;
}

export function isLastStep(state: StepperState, totalSteps: number): boolean {
  return state.currentIndex === totalSteps - 1;
}
```

- [ ] **Step 2: Escrever `src/lib/challenge-stepper.test.ts`**

```ts
import assert from 'node:assert/strict';
import {
  initStepperState,
  goNext,
  goPrevious,
  canGoNext,
  canGoBack,
  isLastStep,
} from './challenge-stepper';

const TOTAL = 5;

// Estado inicial: começa no índice 0 quando não há progresso salvo
{
  const state = initStepperState(0, TOTAL);
  assert.equal(state.currentIndex, 0);
  assert.equal(state.maxVisitedIndex, 0);
  assert.equal(canGoBack(state), false);
  assert.equal(canGoNext(state, TOTAL), true);
  assert.equal(isLastStep(state, TOTAL), false);
}

// initialIndex além do total de passos é limitado ao último passo válido
{
  const state = initStepperState(99, TOTAL);
  assert.equal(state.currentIndex, TOTAL - 1);
  assert.equal(state.maxVisitedIndex, TOTAL - 1);
}

// goNext avança 1 passo e atualiza maxVisitedIndex
{
  let state = initStepperState(0, TOTAL);
  state = goNext(state, TOTAL);
  assert.equal(state.currentIndex, 1);
  assert.equal(state.maxVisitedIndex, 1);
}

// goNext no último passo não avança além do total
{
  let state = initStepperState(TOTAL - 1, TOTAL);
  state = goNext(state, TOTAL);
  assert.equal(state.currentIndex, TOTAL - 1);
  assert.equal(isLastStep(state, TOTAL), true);
}

// goPrevious volta 1 passo sem alterar maxVisitedIndex (progresso não se perde)
{
  let state = initStepperState(0, TOTAL);
  state = goNext(state, TOTAL);
  state = goNext(state, TOTAL);
  assert.equal(state.currentIndex, 2);
  state = goPrevious(state);
  assert.equal(state.currentIndex, 1);
  assert.equal(state.maxVisitedIndex, 2);
}

// goPrevious no primeiro passo não desce abaixo de 0
{
  let state = initStepperState(0, TOTAL);
  state = goPrevious(state);
  assert.equal(state.currentIndex, 0);
  assert.equal(canGoBack(state), false);
}

// Depois de voltar, dá pra avançar de novo até o ponto mais avançado
{
  let state = initStepperState(0, TOTAL);
  state = goNext(state, TOTAL); // idx 1
  state = goNext(state, TOTAL); // idx 2
  state = goPrevious(state); // idx 1
  state = goNext(state, TOTAL); // idx 2 de novo
  assert.equal(state.currentIndex, 2);
  assert.equal(state.maxVisitedIndex, 2);
}

console.log('challenge-stepper: todos os testes passaram');
```

- [ ] **Step 3: Rodar o teste**

Run: `npx tsx src/lib/challenge-stepper.test.ts`
Expected: `challenge-stepper: todos os testes passaram` impresso, sem erro.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros novos (os dois arquivos criados não têm dependências de outros arquivos do projeto).

- [ ] **Step 5: Commit**

```bash
git add src/lib/challenge-stepper.ts src/lib/challenge-stepper.test.ts
git commit -m "feat: add pure challenge stepper navigation logic"
```

---

### Task 2: Devolutiva só texto — schema, migration, service, API

**Files:**
- Modify: `prisma/schema.prisma:228-243`
- Create: `prisma/migrations/<timestamp>_simplify_devolutiva/migration.sql` (gerado pelo Prisma)
- Modify: `src/types/challenge.ts:43-50`
- Modify: `src/lib/challenge-service.ts`
- Modify: `src/app/api/challenge/devolutiva/route.ts`
- Modify: `src/components/screens/ChallengePlayerView.tsx` (só a seção de devolutiva — imports, state, `saveTextDevolutiva`, footer JSX de devolutiva; o resto do arquivo — header, lista de mensagens, `TypingIndicator` — não muda nesta task, isso é Task 4)
- Test: `verify-devolutiva.tmp.ts` (raiz do repo, temporário — apagar antes de commitar)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `DevolutivaInput { dayNumber: number; texto: string }` (`src/types/challenge.ts`), `submitDevolutiva(input: { userId: string; dayNumber: number; texto: string }): Promise<void>` (`src/lib/challenge-service.ts`) — consumidos por `ChallengePlayerClient.tsx` (já genérico, sem mudança) e pela Task 4.

- [ ] **Step 1: Editar `prisma/schema.prisma`**

Substituir (linhas 228-243):
```prisma
enum DevolutivaTipo {
  TEXTO
  AUDIO
  FOTO
}

model Devolutiva {
  id        String         @id @default(cuid())
  userId    String
  user      User           @relation(fields: [userId], references: [id])
  dayNumber Int
  tipo      DevolutivaTipo
  conteudo  String?
  mediaUrl  String?
  createdAt DateTime       @default(now())
}
```
por:
```prisma
model Devolutiva {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  dayNumber Int
  texto     String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Gerar e aplicar a migration**

Run: `npx prisma migrate dev --name simplify_devolutiva`
Expected: Prisma avisa que a coluna `tipo`/`conteudo`/`mediaUrl` será removida (perda de dados aceitável — só há dados de teste); migration criada em `prisma/migrations/` e aplicada no banco local; Prisma Client regenerado.

- [ ] **Step 3: Editar `src/types/challenge.ts`**

Substituir (linhas 43-50):
```ts
export type DevolutivaTipo = 'TEXTO' | 'AUDIO' | 'FOTO';

export interface DevolutivaInput {
  dayNumber: number;
  tipo: DevolutivaTipo;
  conteudo?: string; // texto livre
  mediaUrl?: string; // áudio/foto enviados
}
```
por:
```ts
export interface DevolutivaInput {
  dayNumber: number;
  texto: string;
}
```

- [ ] **Step 4: Editar `src/lib/challenge-service.ts`**

Remover a linha 2 (`import type { DevolutivaTipo } from '@prisma/client';`).

Substituir o bloco final do arquivo (interface `SubmitDevolutivaInput` + função `submitDevolutiva`):
```ts
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
por:
```ts
export interface SubmitDevolutivaInput {
  userId: string;
  dayNumber: number;
  texto: string;
}

export async function submitDevolutiva(input: SubmitDevolutivaInput): Promise<void> {
  await db.devolutiva.create({
    data: {
      userId: input.userId,
      dayNumber: input.dayNumber,
      texto: input.texto,
    },
  });
}
```

- [ ] **Step 5: Editar `src/app/api/challenge/devolutiva/route.ts`**

Substituir o arquivo inteiro por:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { submitDevolutiva } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { dayNumber?: number; texto?: string };
  if (body.dayNumber === undefined || !body.texto?.trim()) {
    return NextResponse.json({ error: 'dayNumber and texto are required' }, { status: 400 });
  }

  await submitDevolutiva({ userId: user.id, dayNumber: body.dayNumber, texto: body.texto });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Editar a seção de devolutiva em `src/components/screens/ChallengePlayerView.tsx`**

Substituir a linha de import dos ícones (linha 5-7):
```tsx
import {
  ArrowLeft, CheckCircle, CheckSquare, Sparkles, Volume2,
} from 'lucide-react';
```
por:
```tsx
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
```

Substituir o import de tipos (linha 10):
```tsx
import type { ChallengeDay, DevolutivaInput, DevolutivaTipo } from '@/types/challenge';
```
por:
```tsx
import type { ChallengeDay, DevolutivaInput } from '@/types/challenge';
```

Substituir o state e a função de salvar (linhas 53-61):
```tsx
  const [journalType, setJournalType] = useState<DevolutivaTipo | 'none'>('none');
  const [journalText, setJournalText] = useState('');

  function saveTextDevolutiva() {
    if (!journalText.trim()) return;
    onSubmitDevolutiva({ dayNumber: day.dayNumber, tipo: 'TEXTO', conteudo: journalText });
    setJournalType('none');
    setJournalText('');
  }
```
por:
```tsx
  const [devolutivaOpen, setDevolutivaOpen] = useState(false);
  const [devolutivaText, setDevolutivaText] = useState('');

  function saveDevolutiva() {
    if (!devolutivaText.trim()) return;
    onSubmitDevolutiva({ dayNumber: day.dayNumber, texto: devolutivaText });
    setDevolutivaOpen(false);
    setDevolutivaText('');
  }
```

Substituir o bloco do footer de devolutiva (linhas 103-156, de `{isComplete && (` — o `<footer>` inteiro — até o `)}` que o fecha; **não** mexer no bloco anterior de `{isComplete && (` das linhas 90-100, que é o botão "Concluí o dia de hoje" dentro da área rolável — isso fica pra Task 4) por:
```tsx
      {isComplete && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-soft)]/80 px-6 pt-4 pb-8 flex flex-col gap-3 shadow-sm z-30 justify-end">
          <button
            onClick={() => setDevolutivaOpen((o) => !o)}
            className="text-[10px] font-bold text-center text-[var(--color-brand-brown)]/50 uppercase tracking-widest leading-none"
          >
            Como foi o seu desafio hoje? (opcional)
          </button>

          {devolutivaOpen && (
            <div className="bg-[var(--color-surface-cream)] rounded-xl p-3 border border-[var(--color-border-soft)] space-y-2.5 animate-fade-in">
              <textarea
                placeholder="Compartilhe como você se sentiu hoje... Algum desconforto?"
                className="w-full text-xs p-2.5 rounded-lg border-none bg-white resize-none h-14 placeholder:text-[var(--color-brand-brown)]/45"
                value={devolutivaText}
                onChange={(e) => setDevolutivaText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDevolutivaOpen(false)}
                  className="px-3 py-1 text-[10px] font-bold uppercase text-[var(--color-brand-brown)]/60"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDevolutiva}
                  disabled={!devolutivaText.trim()}
                  className="px-4 py-1.5 bg-[var(--color-brand-sage)] hover:opacity-90 text-white rounded text-[10px] uppercase font-bold disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </footer>
      )}
```

Remover a função `DevolutivaButton` inteira (definição no final do arquivo, logo após `TypingIndicator`) — não é mais usada.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros. Se aparecer erro em `ChallengePlayerView.tsx` fora da seção de devolutiva, é sinal de que sobrou alguma referência a `journalType`/`journalText`/`DevolutivaButton` — revisar o Step 6.

- [ ] **Step 8: Escrever e rodar o script de verificação temporário**

Criar `verify-devolutiva.tmp.ts` na raiz do repo:
```ts
import { db } from './src/lib/db';
import { submitDevolutiva } from './src/lib/challenge-service';

async function main() {
  const email = `verify-devolutiva-${Date.now()}@example.com`;
  const user = await db.user.create({ data: { email, nome: 'Verify Devolutiva' } });

  await submitDevolutiva({ userId: user.id, dayNumber: 1, texto: 'Me senti bem hoje, mais leve.' });

  const rows = await db.devolutiva.findMany({ where: { userId: user.id } });
  if (rows.length !== 1) throw new Error(`esperava 1 devolutiva, achou ${rows.length}`);
  if (rows[0].texto !== 'Me senti bem hoje, mais leve.') throw new Error('texto não bateu');
  if (rows[0].dayNumber !== 1) throw new Error('dayNumber não bateu');
  console.log('OK: devolutiva gravada e lida corretamente:', rows[0]);

  await db.devolutiva.deleteMany({ where: { userId: user.id } });
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

Run: `node --env-file=.env node_modules/tsx/dist/cli.mjs verify-devolutiva.tmp.ts`
Expected: `OK: devolutiva gravada e lida corretamente: {...}` seguido de `OK: limpeza concluída`, sem erro.

- [ ] **Step 9: Apagar o script temporário**

```bash
rm verify-devolutiva.tmp.ts
```

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/types/challenge.ts src/lib/challenge-service.ts src/app/api/challenge/devolutiva/route.ts src/components/screens/ChallengePlayerView.tsx
git commit -m "feat: simplify devolutiva to text-only (drop AUDIO/FOTO)"
```

---

### Task 3: `ChallengeMessageBubble` sem estilo de chat

**Files:**
- Modify: `src/components/ui/ChallengeMessageBubble.tsx` (arquivo inteiro)

**Interfaces:**
- Consumes: `ChallengeMessage` (`@/types/challenge`), `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` (env).
- Produces: `ChallengeMessageBubble({ message: ChallengeMessage })` — mesma assinatura de antes (props e nome do componente não mudam), só o JSX interno. Consumido por `ChallengePlayerView.tsx` (Task 4 já usa a versão nova).

- [ ] **Step 1: Substituir o arquivo inteiro**

```tsx
'use client';

import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { ChallengeMessage } from '@/types/challenge';

/** Resolve a key do R2 para uma URL pública. Ajustar a base no .env real. */
function mediaUrl(mediaKey?: string) {
  if (!mediaKey) return undefined;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? '';
  return `${base}/${mediaKey}`;
}

/**
 * Conteúdo de um passo do desafio — renderiza pelo `tipo` da mensagem.
 * Sem avatar/bolha de chat: é o corpo de um cartão de aula, mostrado um
 * passo por vez pelo stepper
 * (docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md).
 */
export function ChallengeMessageBubble({ message }: { message: ChallengeMessage }) {
  if (message.tipo === 'TEXTO') {
    return (
      <div className="animate-fade-in">
        <p className="text-sm text-[var(--color-brand-brown)] leading-relaxed whitespace-pre-line">
          {message.texto}
        </p>
      </div>
    );
  }

  if (message.tipo === 'IMAGEM') {
    return (
      <div className="animate-fade-in space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(message.mediaKey)}
          alt={message.texto ?? 'Imagem do desafio'}
          className="w-full aspect-video object-cover rounded-xl border border-[var(--color-border-soft)]"
        />
        {message.texto && (
          <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/80 font-medium">
            {message.texto}
          </p>
        )}
      </div>
    );
  }

  if (message.tipo === 'AUDIO') {
    return <AudioContent message={message} />;
  }

  // VIDEO — usado para a "ASSISTA A AULA N" e o vídeo de boas-vindas.
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--color-border-soft)] shadow-xs animate-fade-in">
      <video
        src={mediaUrl(message.mediaKey)}
        controls
        className="w-full h-full object-cover bg-black"
      />
      {message.texto && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded border border-[var(--color-border-soft)] text-[9px] font-bold text-[var(--color-brand-terracota)] uppercase tracking-wider">
          {message.texto}
        </div>
      )}
    </div>
  );
}

function AudioContent({ message }: { message: ChallengeMessage }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="animate-fade-in space-y-3">
      <p className="text-xs font-bold text-[var(--color-brand-terracota)] tracking-tight">
        Mensagem de áudio
      </p>
      <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-[var(--color-border-soft)]">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-11 h-11 rounded-lg bg-[var(--color-brand-terracota)] text-white flex items-center justify-center active:scale-95 transition-all outline-none shrink-0"
          aria-label={playing ? 'Pausar áudio' : 'Tocar áudio'}
        >
          {playing ? (
            <Pause className="w-4.5 h-4.5 text-white fill-white" />
          ) : (
            <Play className="w-4.5 h-4.5 text-white fill-white translate-x-0.5" />
          )}
        </button>
        <div className="flex-grow h-1 bg-[var(--color-border-soft)] rounded overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--color-brand-sage)] rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <audio
        src={mediaUrl(message.mediaKey)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        className="hidden"
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros (assinatura do componente não mudou, `ChallengePlayerView.tsx` da Task 2 continua compilando contra ela sem alteração).

- [ ] **Step 3: Verificação visual rápida**

Run: `npm run dev`, abrir `http://localhost:3000/preview/desafio`.
Expected: mensagens do Dia 1 (Moderada) aparecem sem avatar/balão de chat — texto como parágrafo simples, imagem/vídeo/áudio em destaque. Ainda aparecem em lista indo uma abaixo da outra com "digitando…" entre elas — isso é esperado, a Task 4 troca esse comportamento.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ChallengeMessageBubble.tsx
git commit -m "style: drop chat-bubble/avatar styling from challenge message content"
```

---

### Task 4: Stepper na `ChallengePlayerView` (hook + navegação)

**Files:**
- Create: `src/lib/useChallengeStepper.ts`
- Delete: `src/lib/useMessageSequence.ts`
- Modify: `src/components/screens/ChallengePlayerView.tsx` (arquivo inteiro)

**Interfaces:**
- Consumes: `initStepperState`, `goNext`, `goPrevious`, `canGoNext`, `canGoBack`, `isLastStep` (Task 1, `@/lib/challenge-stepper`); `ChallengeMessageBubble` (Task 3, `@/components/ui/ChallengeMessageBubble`); devolutiva state/JSX (Task 2, já presente no arquivo).
- Produces: `useChallengeStepper(totalSteps: number, initialIndex?: number): { currentIndex: number; maxVisitedIndex: number; next(): void; previous(): void; canGoNext: boolean; canGoBack: boolean; isLastStep: boolean }`.

- [ ] **Step 1: Escrever `src/lib/useChallengeStepper.ts`**

```ts
'use client';

import { useState } from 'react';
import {
  initStepperState,
  goNext,
  goPrevious,
  canGoNext as computeCanGoNext,
  canGoBack as computeCanGoBack,
  isLastStep as computeIsLastStep,
} from './challenge-stepper';

/**
 * Navegação do stepper do desafio: um passo (ChallengeMessage) por vez,
 * controlada pela usuária (Voltar/Próximo), sem delay automático. Lógica
 * pura em `challenge-stepper.ts` — este hook só liga ela ao React state.
 */
export function useChallengeStepper(totalSteps: number, initialIndex = 0) {
  const [state, setState] = useState(() => initStepperState(initialIndex, totalSteps));

  return {
    currentIndex: state.currentIndex,
    maxVisitedIndex: state.maxVisitedIndex,
    next: () => setState((s) => goNext(s, totalSteps)),
    previous: () => setState((s) => goPrevious(s)),
    canGoNext: computeCanGoNext(state, totalSteps),
    canGoBack: computeCanGoBack(state),
    isLastStep: computeIsLastStep(state, totalSteps),
  };
}
```

- [ ] **Step 2: Apagar `src/lib/useMessageSequence.ts`**

```bash
git rm src/lib/useMessageSequence.ts
```

- [ ] **Step 3: Substituir `src/components/screens/ChallengePlayerView.tsx` inteiro**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { ChallengeMessageBubble } from '@/components/ui/ChallengeMessageBubble';
import { useChallengeStepper } from '@/lib/useChallengeStepper';
import type { ChallengeDay, DevolutivaInput } from '@/types/challenge';

/**
 * Tela do dia do desafio — formato de aula em passos (stepper), um
 * `ChallengeMessage` por vez, navegação controlada pela usuária
 * (Voltar/Próximo). Ver
 * docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md.
 *
 * `initialVisibleCount` é o índice do passo em que a usuária parou da
 * última vez (persistido via `lastSeenOrdem` no backend). O nome do prop
 * ficou o mesmo por compatibilidade com quem já o consome
 * (`ChallengePlayerClient`, `/desafio/[dia]/page.tsx`), mas agora é um
 * índice de passo, não uma contagem de mensagens reveladas por delay.
 *
 * A devolutiva é sempre opcional e desacoplada da conclusão do dia —
 * "Concluí o dia" nunca fica bloqueado esperando a devolutiva.
 */

interface ChallengePlayerViewProps {
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount?: number;
  onBack?: () => void;
  onCompleteDay: () => void;
  onSubmitDevolutiva: (input: DevolutivaInput) => void;
  onProgressChange?: (visibleCount: number) => void;
}

export function ChallengePlayerView({
  day,
  dayTitle,
  initialVisibleCount = 0,
  onBack,
  onCompleteDay,
  onSubmitDevolutiva,
  onProgressChange,
}: ChallengePlayerViewProps) {
  const totalSteps = day.messages.length;
  const { currentIndex, maxVisitedIndex, next, previous, canGoNext, canGoBack, isLastStep } =
    useChallengeStepper(totalSteps, initialVisibleCount);

  useEffect(() => {
    onProgressChange?.(maxVisitedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxVisitedIndex]);

  const [devolutivaOpen, setDevolutivaOpen] = useState(false);
  const [devolutivaText, setDevolutivaText] = useState('');

  function saveDevolutiva() {
    if (!devolutivaText.trim()) return;
    onSubmitDevolutiva({ dayNumber: day.dayNumber, texto: devolutivaText });
    setDevolutivaOpen(false);
    setDevolutivaText('');
  }

  const currentMessage = day.messages[currentIndex];

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-surface-cream)] min-h-screen">
      <header className="bg-white px-5 pt-5 pb-4 sticky top-0 z-40 border-b border-[var(--color-border-soft)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Voltar à jornada"
              className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-brand-terracota)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-serif italic text-sm font-bold text-[var(--color-brand-terracota)]">
              {dayTitle}
            </h1>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] text-[var(--color-brand-brown)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 fill-[var(--color-brand-terracota)]/10 text-[var(--color-brand-terracota)]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-1 bg-[var(--color-border-soft)] rounded overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-terracota)] rounded transition-all"
              style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-[var(--color-brand-brown)]/45 uppercase tracking-widest">
            Passo {currentIndex + 1} de {totalSteps}
          </p>
        </div>
      </header>

      <div className="flex-grow p-5 pb-32 flex items-center">
        <div className="w-full">
          <ChallengeMessageBubble key={currentMessage.ordem} message={currentMessage} />
        </div>
      </div>

      {!isLastStep && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-soft)]/80 px-6 pt-4 pb-8 shadow-sm z-30">
          <div className="flex gap-3">
            <button
              onClick={previous}
              disabled={!canGoBack}
              className="flex-1 py-3.5 border border-[var(--color-border-soft)] text-[var(--color-brand-brown)]/70 font-bold rounded-lg text-xs uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <button
              onClick={next}
              disabled={!canGoNext}
              className="flex-1 py-3.5 bg-[var(--color-brand-terracota)] text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:opacity-90 flex items-center justify-center gap-1.5"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      )}

      {isLastStep && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-soft)]/80 px-6 pt-4 pb-8 flex flex-col gap-3 shadow-sm z-30 justify-end">
          <button
            onClick={onCompleteDay}
            className="w-full py-4 bg-[var(--color-brand-terracota)] text-white hover:opacity-90 font-bold rounded-lg text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4 fill-white text-[var(--color-brand-terracota)]" />
            <span>Concluí o dia de hoje</span>
          </button>

          <button
            onClick={() => setDevolutivaOpen((o) => !o)}
            className="text-[10px] font-bold text-center text-[var(--color-brand-brown)]/50 uppercase tracking-widest leading-none"
          >
            Como foi o seu desafio hoje? (opcional)
          </button>

          {devolutivaOpen && (
            <div className="bg-[var(--color-surface-cream)] rounded-xl p-3 border border-[var(--color-border-soft)] space-y-2.5 animate-fade-in">
              <textarea
                placeholder="Compartilhe como você se sentiu hoje... Algum desconforto?"
                className="w-full text-xs p-2.5 rounded-lg border-none bg-white resize-none h-14 placeholder:text-[var(--color-brand-brown)]/45"
                value={devolutivaText}
                onChange={(e) => setDevolutivaText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDevolutivaOpen(false)}
                  className="px-3 py-1 text-[10px] font-bold uppercase text-[var(--color-brand-brown)]/60"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDevolutiva}
                  disabled={!devolutivaText.trim()}
                  className="px-4 py-1.5 bg-[var(--color-brand-sage)] hover:opacity-90 text-white rounded text-[10px] uppercase font-bold disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Verificação visual ao vivo**

Run: `npm run dev`, abrir `http://localhost:3000/preview/desafio`.
Expected:
- Aparece 1 passo por vez, com barra de progresso + "Passo X de N" no topo.
- Botão Voltar desabilitado no passo 1; habilita a partir do passo 2.
- Botão Próximo avança 1 passo por clique; sem delay automático, sem "digitando…" (esse indicador não existe mais no arquivo).
- Ao chegar no último passo, o rodapé troca para "Concluí o dia de hoje" + "Como foi o seu desafio hoje? (opcional)".
- Clicar na pergunta abre o campo de texto; "Salvar" só habilita com texto preenchido; no preview isso só loga no console (`onSubmitDevolutiva` do preview é um `console.log`).
- Voltar alguns passos e avançar de novo funciona sem travar.

- [ ] **Step 6: Commit**

```bash
git add src/lib/useChallengeStepper.ts src/components/screens/ChallengePlayerView.tsx
git commit -m "feat: replace WhatsApp-style delay reveal with stepper navigation"
```

---

### Task 5: Atualizar docs

**Files:**
- Modify: `docs/01-dominio-e-modelo.md:64-70`
- Modify: `docs/04-motor-do-desafio.md`

**Interfaces:**
- Nenhuma (documentação).

- [ ] **Step 1: Editar `docs/01-dominio-e-modelo.md`**

Substituir (linhas 64-70):
```
### Devolutiva
A resposta opcional da usuária a um dia. **Existe sempre; é opcional preencher.**
- `id`, `userId`, `dayNumber`
- `tipo` — `TEXTO` | `AUDIO` | `FOTO`
- `conteudo` (texto) ou `mediaUrl`
- `createdAt`
- Não trava o avanço. A expert pode visualizar depois.
```
por:
```
### Devolutiva
A resposta opcional da usuária a um dia, sempre em texto livre. **Existe
sempre; é opcional preencher.**
- `id`, `userId`, `dayNumber`
- `texto`
- `createdAt`
- Não trava o avanço. A expert pode visualizar depois.
```

- [ ] **Step 2: Editar `docs/04-motor-do-desafio.md` — introdução**

Substituir (linhas 3-9):
```
## O que o desafio é

Um **roteiro de mensagens sequenciadas tipo WhatsApp**, segmentado por nível de
fertilidade. A planilha original tem o formato
`Dia | Ordem | TipoAcao | Conteudo_Texto | Conteudo_Link_Midia | Delay_ms` —
cada linha é uma mensagem que aparece na ordem, com um delay que recria o ritmo
de "digitando..." do WhatsApp.
```
por:
```
## O que o desafio é

Um **roteiro de conteúdo em formato de aula**, segmentado por nível de
fertilidade, navegado em passos (um `ChallengeMessage` por vez, com botões
Voltar/Próximo). A planilha original tem o formato
`Dia | Ordem | TipoAcao | Conteudo_Texto | Conteudo_Link_Midia | Delay_ms` —
cada linha vira um passo, na ordem. O `Delay_ms` era usado pra simular o
ritmo "digitando..." do WhatsApp da versão anterior (chat automático); a UI
atual não lê mais esse campo — ele continua no schema e nos seeds só por
não valer o retrabalho de remover de conteúdo já validado pela expert (ver
`docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md`).
```

- [ ] **Step 3: Editar `docs/04-motor-do-desafio.md` — seção de reprodução**

Substituir (linhas 42-54, cabeçalho `## Reprodução estilo WhatsApp` até o fim da seção):
```
## Reprodução estilo WhatsApp

No app, o dia "toca" as mensagens em sequência: mostra a mensagem da `ordem` N,
espera `delayMs`, mostra a N+1. Texto aparece como balão; áudio como player;
imagem inline. Recomendações:

- Persistir até onde a usuária já "assistiu" no dia (índice da última `ordem`
  vista) pra ela poder sair e voltar sem reiniciar.
- O delay é cosmético: na volta, já mostre o que ela passou sem esperar de novo.
- A mensagem "ASSISTA A AULA N" de cada dia é `tipo = VIDEO`, com o título como
  legenda e `mediaKey` apontando para `videos/aulaN.mp4`. O Dia 0 abre com o
  vídeo de boas-vindas (`videos/boas-vindas.mp4`). As 7 aulas + boas-vindas são
  **compartilhadas entre as 3 trilhas** (mesmos vídeos) — ver `seeds/aulas-manifesto.csv`.
```
por:
```
## Reprodução em formato de aula (stepper)

No app, o dia mostra um passo (`ChallengeMessage`) por vez — texto como
parágrafo, áudio/imagem/vídeo em destaque — navegado por botões
Voltar/Próximo controlados pela usuária (sem delay automático). Pode voltar
e avançar livremente entre passos já vistos; só revela um passo novo por
vez. Detalhes de implementação:
`docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md`.

- Persiste até onde a usuária já avançou no dia (`lastSeenOrdem`, o índice
  do passo mais avançado alcançado) pra ela poder sair e voltar sem
  reiniciar do zero.
- A mensagem "ASSISTA A AULA N" de cada dia é `tipo = VIDEO`, com o título
  como legenda e `mediaKey` apontando para `videos/aulaN.mp4`. O Dia 0 abre
  com o vídeo de boas-vindas (`videos/boas-vindas.mp4`). As 7 aulas + boas-
  vindas são **compartilhadas entre as 3 trilhas** (mesmos vídeos) — ver
  `seeds/aulas-manifesto.csv`.
```

- [ ] **Step 4: Editar `docs/04-motor-do-desafio.md` — seção de devolutiva**

Substituir (linhas 78-93):
```
## Devolutiva (obrigatório ter, opcional usar)

A funcionalidade **existe sempre**; preencher é **opcional** e **não trava** o
avanço.

```
Devolutiva
  id, userId, dayNumber, tipo (TEXTO|AUDIO|FOTO), conteudo?|mediaUrl?, createdAt
```

- Em cada dia há um espaço "Como foi seu desafio hoje?" onde a usuária pode
  (sem obrigação) mandar texto/áudio/foto.
- Concluir o dia e enviar devolutiva são **ações independentes**: dá pra
  concluir sem devolutiva, e a devolutiva não é um checkbox de avanço.
- A expert visualiza as devolutivas depois (tela de acompanhamento — fora do MVP
  se quiser, mas o dado já fica gravado).
```
por:
```
## Devolutiva (obrigatório ter, opcional usar)

A funcionalidade **existe sempre**; preencher é **opcional** e **não trava** o
avanço. Só texto — não há opção de áudio/foto.

```
Devolutiva
  id, userId, dayNumber, texto, createdAt
```

- Em cada dia há um espaço "Como foi seu desafio hoje?" onde a usuária pode
  (sem obrigação) escrever um texto livre.
- Concluir o dia e enviar devolutiva são **ações independentes**: dá pra
  concluir sem devolutiva, e a devolutiva não é um checkbox de avanço.
- A expert visualiza as devolutivas depois (tela de acompanhamento — fora do MVP
  se quiser, mas o dado já fica gravado).
```

- [ ] **Step 5: Commit**

```bash
git add docs/01-dominio-e-modelo.md docs/04-motor-do-desafio.md
git commit -m "docs: update challenge docs for stepper format and text-only devolutiva"
```

---

### Task 6: Verificação ao vivo com banco real (controller, não subagente)

**Files:** nenhum (só verificação).

**Interfaces:** nenhuma.

> Rodar servidor de dev e testar no navegador exige permissão interativa —
> subagentes em background não conseguem fazer isso nesta máquina. Esta task
> é do controller, com o usuário presente (mesmo padrão já usado nas fases
> anteriores do projeto).

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`

- [ ] **Step 2: Testar com a usuária demo (Carolina — nível MODERADA, dia 4/7 liberado)**

- Logar como `carolinapalitot20@gmail.com` (login demo).
- Abrir `/desafio/4` (ou o dia liberado no momento).
- Confirmar: stepper funciona (Voltar/Próximo), progresso "Passo X de N" bate
  com o total de mensagens do dia, mídia carrega (vídeo/áudio/imagem).
- Sair no meio (ex.: passo 3 de 8) e voltar pra `/desafio/4` — confirma que
  retoma no passo certo (usa `maxVisitedIndex` persistido).
- Ir até o fim, escrever uma devolutiva de teste, clicar Salvar — conferir
  no banco (`SELECT * FROM "Devolutiva" ORDER BY "createdAt" DESC LIMIT 1;`)
  que gravou com o `texto` certo.
- Clicar "Concluí o dia de hoje" — confirma que redireciona pra
  `/desafio/4/concluido` normalmente (comportamento não mudou).

- [ ] **Step 3: Resetar o estado de progresso da Carolina**

Run: `npm run db:seed`
(mesma prática já usada nas fases anteriores — restaura o snapshot canônico
"dia 4/7 liberado" depois de testar ao vivo.)

- [ ] **Step 4: Reportar ao usuário**

Resumir o que foi testado e pedir confirmação de que o comportamento está
como esperado antes de considerar a branch pronta pra merge/deploy.
