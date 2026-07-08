# Fase 6 — Wiring das Telas Restantes + Seed Fictício Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os últimos 3 gaps reais de wiring (relatório completo, oferta do desafio, tela de dia concluído) e reescrever o seed da usuária demo pra ser uma showcase real (nível Moderada, desafio ativo, dias 1-3 concluídos, dia 4 liberado) — deixando o app pronto pra gravar o vídeo de demonstração fim a fim sem precisar simular nada manualmente.

**Architecture:** A maior parte das 11 telas do protótipo original já foi portada e ligada a dados reais nas Fases 2, 3 e 5 (welcome, quiz, captura, dashboard, checkout, timeline do desafio, player do desafio). Restam 3 gaps concretos, todos componentes já existentes em `src/components/screens/` (só usados em `/preview/*` até agora): `ReportView` (relatório completo, 13 pilares), `ChallengeOfferView` (oferta do desafio) e `ChallengeCompleteView` (celebração ao concluir um dia). Cada um ganha uma rota real (Server Component) — e os dois com `onClick`/callbacks (`ReportView`, `ChallengeCompleteView`) ganham um wrapper Client Component fino, mesmo padrão já usado em `ChallengePlayerClient`/`ChallengeTimelineClient` na Fase 5.

## Contexto levantado nesta rodada (não re-derivar, já confirmado)

1. **`/relatorio` não existe como rota real.** `src/app/dashboard/page.tsx` já aponta `relatorioHref="/relatorio"`, mas essa rota nunca foi criada — hoje é um link morto (404). Só `/resultado` existe, e é a tela-teaser pré-pagamento (nível + 2 pontos de atenção), não o relatório completo.
2. **`ChallengeOfferView` e `ChallengeCompleteView` existem prontos** (visual, props definidas) em `src/components/screens/`, usados só em `/preview/challenge-offer` e `/preview/challenge-complete`. Nunca foram ligados a uma rota real.
3. **`ChallengeOfferView` é Server Component** (sem `'use client'`, só `<a href>`) — pode ser renderizado direto de uma page sem wrapper. **`ChallengeCompleteView` é Client Component** (tem `onBackToTimeline: () => void`) — precisa de wrapper, como `ReportView` (também Client Component, `onBack`/`onUpsellClick`).
4. **Hoje, ao concluir um dia, `ChallengePlayerClient.handleCompleteDay` navega direto pra `/desafio`** (`src/components/screens/ChallengePlayerClient.tsx:28`), pulando a tela de celebração inteiramente.
5. **`DashboardView` já tem um prop `progressoDesafio?: { diaAtual: number }`** (`src/components/screens/DashboardView.tsx:15`) que nunca é populado por `src/app/dashboard/page.tsx` — hoje sempre cai no fallback "Começar agora", mesmo pra quem já está no meio da trilha. É só a *page* que precisa passar o dado; o componente já sabe renderizar.
6. **`/desafio` redireciona pra `/dashboard` quando falta o `Entitlement CHALLENGE`** (`src/app/desafio/page.tsx:15-16`) — vira `/desafio/oferta` nesta fase, um destino mais útil (upsell direto, não a home).
7. **Receita de respostas verificada pra gerar nível Moderada de verdade:** pra cada pergunta, ordenar as opções por `rawScore` crescente e escolher o índice `Math.floor(options.length * 0.5)` (a "mediana por baixo"). Testado contra o banco real nesta sessão: produz `resultadoFinal = 68.07`, `nivelGlobal = MODERADA` — confortavelmente dentro da faixa 60-80, não é valor de fronteira. **Use exatamente essa fórmula** — outras variantes testadas (percentil 0.6 a 0.7) também caem em MODERADA mas com menos margem; percentil ≥0.75 vira ALTA.
8. **`defaultCooldownHours` da trilha Moderada é 20h** (`seeds/desafio-track-moderada.json`). Pra semear dias 0-3 concluídos com o dia 4 já liberado, os `completedAt` precisam ser escalonados com pelo menos 20h de folga entre o dia 3 e "agora".
9. **`ChallengeTrack` precisa existir no banco antes do `ChallengeProgress` da usuária demo ser criado** — `main()` hoje chama `seedDemoUserAndCatalog()` antes de `seedChallengeTracks()` (`prisma/seed.ts:283-286`). A ordem precisa inverter.
10. **`computePillarScores` soma os `rawScore` de todas as respostas do mesmo pilar primeiro, e só multiplica pelo peso no final** (`src/lib/scoring-answers.ts:17-21`) — não multiplique peso por resposta individual, o resultado fica errado.

## Global Constraints

- Server Component por padrão; `'use client'` só onde há estado/interação real (convenção do projeto, `CLAUDE.md`).
- Nada de lógica de negócio solta em componentes — a montagem de `AssessmentResult` (pilares + diagnóstico/recomendação) é função pura testável em `src/lib/`.
- Fixtures de preview em `src/app/preview/*/fixture.ts` nunca mudam nesta fase — as rotas novas são paralelas, não substituem as previews.
- Commits: **nunca** incluir trailer `Co-Authored-By: Claude` ou qualquer menção de co-autoria de IA.
- Mudanças em componentes já existentes (`DashboardView.tsx`, `ChallengePlayerClient.tsx`) devem ser **aditivas e mínimas** — mesmo padrão de disciplina já usado na Fase 5 ao tocar `ChallengePlayerView.tsx`.

---

### Task 1: `buildAssessmentResult` — montagem pura do relatório completo

**Files:**
- Create: `src/lib/report-assembly.ts`
- Test: `src/lib/report-assembly.test.ts`

**Interfaces:**
- Consumes: `PillarKey`, `PillarLevel`, `NivelGlobal`, `AssessmentResult`, `PillarResult` (de `@/types/assessment`, já existem); `ScoreRuleInput` (de `@/lib/scoring`, já existe).
- Produces: `buildAssessmentResult(...)` — usado pela Task 2 (`/relatorio`).

- [ ] **Step 1: Escrever o teste**

```typescript
// src/lib/report-assembly.test.ts
import { buildAssessmentResult } from './report-assembly';
import type { ScoreRuleInput } from './scoring';
import type { PillarKey } from '@/types/assessment';

const rules: ScoreRuleInput[] = [
  { pillar: 'sono', peso: 2, maxDoPilar: 20 },
  { pillar: 'estresse', peso: 3, maxDoPilar: 30 },
];

const pillarMessages = [
  { pillar: 'sono' as PillarKey, level: 'Alto' as const, diagnostico: 'Sono ótimo', recomendacao: 'Mantenha' },
  { pillar: 'sono' as PillarKey, level: 'Moderado' as const, diagnostico: 'Sono ok', recomendacao: 'Ajuste' },
  { pillar: 'sono' as PillarKey, level: 'Baixo' as const, diagnostico: 'Sono ruim', recomendacao: 'Priorize' },
  { pillar: 'estresse' as PillarKey, level: 'Alto' as const, diagnostico: 'Estresse alto controlado', recomendacao: 'Respire' },
  { pillar: 'estresse' as PillarKey, level: 'Moderado' as const, diagnostico: 'Estresse moderado', recomendacao: 'Pratique' },
  { pillar: 'estresse' as PillarKey, level: 'Baixo' as const, diagnostico: 'Estresse baixo controlado', recomendacao: 'Continue' },
];

const pillarLabels: Record<PillarKey, string> = {
  fatores_infertilidade: 'Fatores', saude_hormonal: 'Saúde Hormonal', ciclo: 'Ciclo',
  sono: 'Sono', imunidade: 'Imunidade', atividade_fisica: 'Atividade Física',
  alimentacao: 'Alimentação', saude_intestinal: 'Saúde Intestinal', figado: 'Fígado',
  estresse: 'Estresse', tireoide: 'Tireoide', toxinas: 'Toxinas', historico: 'Histórico',
};

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL: ${msg}\n  actual:   ${a}\n  expected: ${e}`);
  }
}

// sono: score 18/20 = 0.9 -> Alto; estresse: score 15/30 = 0.5 -> Baixo
const pillarScores: Record<PillarKey, number> = { sono: 18, estresse: 15 } as Record<PillarKey, number>;

const result = buildAssessmentResult(
  { scoreTotal: 33, resultadoFinal: 68.07, nivelGlobal: 'MODERADA' },
  pillarScores,
  rules,
  pillarMessages,
  pillarLabels
);

assertEqual(result.scoreTotal, 33, 'scoreTotal passa direto');
assertEqual(result.resultadoFinal, 68.07, 'resultadoFinal passa direto');
assertEqual(result.nivelGlobal, 'MODERADA', 'nivelGlobal passa direto');
assertEqual(result.pillars.length, 2, 'um PillarResult por rule');

const sono = result.pillars.find((p) => p.key === 'sono')!;
assertEqual(sono.level, 'Alto', 'sono classifica Alto (0.9 >= 0.8)');
assertEqual(sono.diagnostico, 'Sono ótimo', 'sono pega o diagnostico certo pro nível Alto');
assertEqual(sono.label, 'Sono', 'sono usa o label correto');

const estresse = result.pillars.find((p) => p.key === 'estresse')!;
assertEqual(estresse.level, 'Baixo', 'estresse classifica Baixo (0.5 < 0.6)');
assertEqual(estresse.diagnostico, 'Estresse baixo controlado', 'estresse pega o diagnostico certo pro nível Baixo');

console.log('report-assembly.test.ts: all assertions passed');
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx tsx src/lib/report-assembly.test.ts`
Expected: falha com `Cannot find module './report-assembly'` (o módulo ainda não existe).

- [ ] **Step 3: Implementar**

```typescript
// src/lib/report-assembly.ts
import type { AssessmentResult, PillarKey, PillarLevel, PillarResult } from '@/types/assessment';
import type { ScoreRuleInput } from './scoring';

interface PillarMessageInput {
  pillar: PillarKey;
  level: PillarLevel;
  diagnostico: string;
  recomendacao: string;
}

function pillarLevel(score: number, max: number): PillarLevel {
  const ratio = score / max;
  if (ratio >= 0.8) return 'Alto';
  if (ratio >= 0.6) return 'Moderado';
  return 'Baixo';
}

/**
 * Monta o AssessmentResult completo (13 pilares com diagnóstico e
 * recomendação reais) a partir do resultado já calculado por
 * computeAssessment + as pillarMessages cadastradas no banco.
 */
export function buildAssessmentResult(
  computation: { scoreTotal: number; resultadoFinal: number; nivelGlobal: AssessmentResult['nivelGlobal'] },
  pillarScores: Record<PillarKey, number>,
  rules: ScoreRuleInput[],
  pillarMessages: PillarMessageInput[],
  pillarLabels: Record<PillarKey, string>
): AssessmentResult {
  const messageByKey = new Map<string, PillarMessageInput>();
  for (const m of pillarMessages) {
    messageByKey.set(`${m.pillar}:${m.level}`, m);
  }

  const pillars: PillarResult[] = rules.map((rule) => {
    const level = pillarLevel(pillarScores[rule.pillar] ?? 0, rule.maxDoPilar);
    const message = messageByKey.get(`${rule.pillar}:${level}`);
    if (!message) {
      throw new Error(`Faltando PillarMessage para ${rule.pillar}/${level} — rode npm run db:seed`);
    }
    return {
      key: rule.pillar,
      label: pillarLabels[rule.pillar],
      level,
      diagnostico: message.diagnostico,
      recomendacao: message.recomendacao,
    };
  });

  return {
    scoreTotal: computation.scoreTotal,
    resultadoFinal: computation.resultadoFinal,
    nivelGlobal: computation.nivelGlobal,
    pillars,
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx tsx src/lib/report-assembly.test.ts`
Expected: `report-assembly.test.ts: all assertions passed`

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: nenhum erro em nenhum arquivo do repositório.

- [ ] **Step 6: Commit**

```bash
git add src/lib/report-assembly.ts src/lib/report-assembly.test.ts
git commit -m "feat: add buildAssessmentResult pure function for the full report screen"
```

---

### Task 2: Rota `/relatorio` (relatório completo, gated por REPORT)

**Files:**
- Create: `src/app/relatorio/page.tsx`
- Create: `src/components/screens/ReportClient.tsx`

**Interfaces:**
- Consumes: `buildAssessmentResult` (Task 1); `requireSessionUser` (`@/lib/auth`, já existe); `hasActiveEntitlement` (`@/lib/entitlements`, já existe); `db` (`@/lib/db`); `ReportView` (`@/components/screens/ReportView`, já existe, `'use client'`, props `{ result: AssessmentResult; onBack?: () => void; onUpsellClick?: () => void }`); `PILLAR_LABEL` (`@/types/assessment`, já existe).
- Produces: rota `/relatorio` — referenciada por `src/app/dashboard/page.tsx` (Task 5) e pelo botão "Ver relatório completo" que o usuário vai acessar depois do checkout.

- [ ] **Step 1: Criar o wrapper client**

```typescript
// src/components/screens/ReportClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ReportView } from '@/components/screens/ReportView';
import type { AssessmentResult } from '@/types/assessment';

interface ReportClientProps {
  result: AssessmentResult;
}

export function ReportClient({ result }: ReportClientProps) {
  const router = useRouter();

  return (
    <ReportView
      result={result}
      onBack={() => router.push('/dashboard')}
      onUpsellClick={() => router.push('/desafio/oferta')}
    />
  );
}
```

- [ ] **Step 2: Criar a page**

```typescript
// src/app/relatorio/page.tsx
import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { computeAssessment } from '@/lib/scoring';
import { buildAssessmentResult } from '@/lib/report-assembly';
import { ReportClient } from '@/components/screens/ReportClient';
import { PILLAR_LABEL, type PillarKey } from '@/types/assessment';

export const dynamic = 'force-dynamic';

export default async function RelatorioPage() {
  const user = await requireSessionUser();

  const hasReport = await hasActiveEntitlement(user.id, 'REPORT');
  if (!hasReport) {
    redirect('/dashboard');
  }

  const assessment = await db.assessment.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!assessment) {
    redirect('/dashboard');
  }

  const rules = await db.scoreRule.findMany();
  const pillarMessages = await db.pillarMessage.findMany();
  const ruleInputs = rules.map((r) => ({
    pillar: r.pillar as PillarKey,
    peso: r.peso,
    maxDoPilar: r.maxDoPilar,
  }));
  const pillarScores = assessment.pillarScores as Record<PillarKey, number>;
  const computation = computeAssessment(pillarScores, ruleInputs, rules[0].scoreDenominator);

  const result = buildAssessmentResult(
    computation,
    pillarScores,
    ruleInputs,
    pillarMessages.map((m) => ({
      pillar: m.pillar as PillarKey,
      level: m.level,
      diagnostico: m.diagnostico,
      recomendacao: m.recomendacao,
    })),
    PILLAR_LABEL
  );

  return <ReportClient result={result} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: nenhum erro em nenhum arquivo do repositório.

- [ ] **Step 4: Commit**

```bash
git add src/app/relatorio/page.tsx src/components/screens/ReportClient.tsx
git commit -m "feat: wire /relatorio route with real data, gated by REPORT entitlement"
```

---

### Task 3: Rota `/desafio/oferta` + rewiring de `/desafio` e `/dashboard`

**Files:**
- Create: `src/app/desafio/oferta/page.tsx`
- Modify: `src/app/desafio/page.tsx:15-16` (redirect de `/dashboard` pra `/desafio/oferta`)
- Modify: `src/app/dashboard/page.tsx` (desafioHref aponta pra `/desafio/oferta`; popula `progressoDesafio`)

**Interfaces:**
- Consumes: `ChallengeOfferView` (`@/components/screens/ChallengeOfferView`, já existe, Server Component puro, props `{ checkoutUrl: string; nivelGlobal?: NivelGlobal; primeiroNome?: string }`); `hasActiveEntitlement`, `requireSessionUser`, `db`.
- Produces: rota `/desafio/oferta`, referenciada por `/desafio` e `/dashboard`.

- [ ] **Step 1: Criar a page da oferta**

```typescript
// src/app/desafio/oferta/page.tsx
import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { ChallengeOfferView } from '@/components/screens/ChallengeOfferView';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

export default async function DesafioOfertaPage() {
  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (hasChallenge) {
    redirect('/desafio');
  }

  const [product, assessment] = await Promise.all([
    db.product.findUnique({ where: { slug: 'desafio-7-dias' } }),
    db.assessment.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
  ]);

  if (!product) {
    throw new Error('Product desafio-7-dias not found — run `npm run db:seed`');
  }

  return (
    <ChallengeOfferView
      checkoutUrl={product.checkoutUrl}
      nivelGlobal={(assessment?.nivelGlobal as NivelGlobal | undefined) ?? undefined}
      primeiroNome={user.nome?.split(' ')[0] ?? undefined}
    />
  );
}
```

- [ ] **Step 2: Redirecionar `/desafio` pra oferta em vez de dashboard**

In `src/app/desafio/page.tsx`, find:

```typescript
  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) {
    redirect('/dashboard');
  }
```

Replace with:

```typescript
  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) {
    redirect('/desafio/oferta');
  }
```

Leave the second `redirect('/dashboard')` (the one guarding `!trackLevel`, a few lines below) untouched — esse é um caso de dado inconsistente (entitlement sem metadata.track), não de falta de compra, e não faz sentido mandar pra tela de oferta.

- [ ] **Step 3: Popular `desafioHref` e `progressoDesafio` no dashboard**

Read `src/app/dashboard/page.tsx` in full first. Find:

```typescript
  const entitlements = await db.entitlement.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
  });
  const challengeEntitlement = entitlements.find((e) => e.type === 'CHALLENGE');
  const challengeProduct = await db.product.findUnique({ where: { slug: 'desafio-7-dias' } });

  return (
    <div>
      <DashboardView
        primeiroNome={user.nome?.split(' ')[0] ?? 'Você'}
        nivelGlobal={assessment.nivelGlobal as NivelGlobal}
        resultadoFinal={assessment.resultadoFinal}
        relatorioHref="/relatorio"
        desafioHref={challengeEntitlement ? '/desafio' : (challengeProduct?.checkoutUrl ?? '#')}
        temDesafio={Boolean(challengeEntitlement)}
      />
      <LogoutButton />
    </div>
  );
```

Replace with:

```typescript
  const entitlements = await db.entitlement.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
  });
  const challengeEntitlement = entitlements.find((e) => e.type === 'CHALLENGE');

  let progressoDesafio: { diaAtual: number } | undefined;
  if (challengeEntitlement) {
    const trackLevel = (challengeEntitlement.metadata as { track?: NivelGlobal } | null)?.track;
    if (trackLevel) {
      const track = await db.challengeTrack.findUnique({ where: { level: trackLevel } });
      if (track) {
        const progress = await db.challengeProgress.findUnique({
          where: { userId_trackId: { userId: user.id, trackId: track.id } },
        });
        if (progress) {
          progressoDesafio = { diaAtual: progress.currentDay };
        }
      }
    }
  }

  return (
    <div>
      <DashboardView
        primeiroNome={user.nome?.split(' ')[0] ?? 'Você'}
        nivelGlobal={assessment.nivelGlobal as NivelGlobal}
        resultadoFinal={assessment.resultadoFinal}
        relatorioHref="/relatorio"
        desafioHref={challengeEntitlement ? '/desafio' : '/desafio/oferta'}
        temDesafio={Boolean(challengeEntitlement)}
        progressoDesafio={progressoDesafio}
      />
      <LogoutButton />
    </div>
  );
```

Note: `challengeProduct` is no longer used (was only there to build the old external `checkoutUrl` fallback) — remove its declaration entirely, don't leave it as dead code.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: nenhum erro em nenhum arquivo do repositório.

- [ ] **Step 5: Commit**

```bash
git add src/app/desafio/oferta/page.tsx src/app/desafio/page.tsx src/app/dashboard/page.tsx
git commit -m "feat: wire /desafio/oferta route; dashboard shows real challenge progress"
```

---

### Task 4: Rota `/desafio/[dia]/concluido` (celebração ao concluir um dia)

**Files:**
- Create: `src/app/desafio/[dia]/concluido/page.tsx`
- Create: `src/components/screens/ChallengeCompleteClient.tsx`
- Modify: `src/components/screens/ChallengePlayerClient.tsx:28`

**Interfaces:**
- Consumes: `ChallengeCompleteView` (`@/components/screens/ChallengeCompleteView`, já existe, `'use client'`, props `{ dayNumber: number; totalDays: number; nivelGlobal: NivelGlobal; hoursUntilNextDay: number; isLastDay: boolean; onBackToTimeline: () => void }`); `hoursUntilUnlock` (`@/lib/challenge-gating`, já existe); `requireSessionUser`, `hasActiveEntitlement`, `db`.
- Produces: rota `/desafio/[dia]/concluido`, referenciada por `ChallengePlayerClient.handleCompleteDay`.

- [ ] **Step 1: Criar o wrapper client**

```typescript
// src/components/screens/ChallengeCompleteClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ChallengeCompleteView } from '@/components/screens/ChallengeCompleteView';
import type { NivelGlobal } from '@/types/assessment';

interface ChallengeCompleteClientProps {
  dayNumber: number;
  totalDays: number;
  nivelGlobal: NivelGlobal;
  hoursUntilNextDay: number;
  isLastDay: boolean;
}

export function ChallengeCompleteClient(props: ChallengeCompleteClientProps) {
  const router = useRouter();

  return (
    <ChallengeCompleteView
      {...props}
      onBackToTimeline={() => router.push('/desafio')}
    />
  );
}
```

- [ ] **Step 2: Criar a page**

```typescript
// src/app/desafio/[dia]/concluido/page.tsx
import { redirect, notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { hoursUntilUnlock } from '@/lib/challenge-gating';
import { ChallengeCompleteClient } from '@/components/screens/ChallengeCompleteClient';
import type { ChallengeProgress as ChallengeProgressVM, DayCompletion } from '@/types/challenge';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

const TOTAL_DAYS = 7;

interface ConcluidoPageProps {
  params: Promise<{ dia: string }>;
}

export default async function DesafioConcluidoPage({ params }: ConcluidoPageProps) {
  const { dia } = await params;
  const dayNumber = Number(dia);
  if (!Number.isInteger(dayNumber)) notFound();

  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) redirect('/desafio/oferta');

  const entitlement = await db.entitlement.findFirst({
    where: { userId: user.id, type: 'CHALLENGE', status: 'ACTIVE' },
    orderBy: { grantedAt: 'desc' },
  });
  const trackLevel = (entitlement?.metadata as { track?: NivelGlobal } | null)?.track;
  if (!trackLevel) redirect('/dashboard');

  const track = await db.challengeTrack.findUniqueOrThrow({ where: { level: trackLevel } });
  const progressRow = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });

  const dayCompletions =
    (progressRow.dayCompletions as unknown as Record<string, DayCompletion>) ?? {};
  const progressVM: ChallengeProgressVM = {
    trackLevel: track.level,
    currentDay: progressRow.currentDay,
    dayCompletions: Object.fromEntries(
      Object.entries(dayCompletions).map(([d, c]) => [Number(d), c])
    ),
  };

  const isLastDay = dayNumber >= TOTAL_DAYS;
  const hours = isLastDay
    ? 0
    : Math.ceil(hoursUntilUnlock(dayNumber + 1, progressVM, track));

  return (
    <ChallengeCompleteClient
      dayNumber={dayNumber}
      totalDays={TOTAL_DAYS}
      nivelGlobal={track.level}
      hoursUntilNextDay={hours}
      isLastDay={isLastDay}
    />
  );
}
```

- [ ] **Step 3: Redirecionar pra tela de celebração ao concluir o dia**

In `src/components/screens/ChallengePlayerClient.tsx`, find:

```typescript
  async function handleCompleteDay() {
    await fetch('/api/challenge/complete-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber }),
    });
    router.push('/desafio');
  }
```

Replace with:

```typescript
  async function handleCompleteDay() {
    await fetch('/api/challenge/complete-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber }),
    });
    router.push(`/desafio/${day.dayNumber}/concluido`);
  }
```

This is the only line that changes in this file — do not touch anything else in it.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: nenhum erro em nenhum arquivo do repositório.

- [ ] **Step 5: Commit**

```bash
git add src/app/desafio/\[dia\]/concluido/page.tsx src/components/screens/ChallengeCompleteClient.tsx src/components/screens/ChallengePlayerClient.tsx
git commit -m "feat: wire challenge-day-completion celebration screen"
```

---

### Task 5: Seed — usuária showcase (nível Moderada, desafio ativo, dias 1-3 concluídos)

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `createAssessment` (já existe, `@/lib/assessment-service`); `computePillarScores` (`@/lib/scoring-answers`, já existe — soma raw scores por pilar primeiro, multiplica pelo peso depois, ver Contexto item 10).
- Produces: usuária demo com `Entitlement` REPORT+CHALLENGE ativos e `ChallengeProgress` real — consumida pela Task 7 (verificação manual) e por quem for gravar o vídeo de demonstração.

- [ ] **Step 1: Reordenar `main()` — trilhas antes da usuária demo**

In `prisma/seed.ts`, find:

```typescript
async function main() {
  await seedScoreRules();
  await seedQuestions();
  await seedPillarMessages();
  await seedProducts();
  await seedDemoUserAndCatalog();
  await seedChallengeTracks();
}
```

Replace with:

```typescript
async function main() {
  await seedScoreRules();
  await seedQuestions();
  await seedPillarMessages();
  await seedProducts();
  await seedChallengeTracks();
  await seedDemoUserAndCatalog();
}
```

- [ ] **Step 2: Trocar a seleção de respostas por uma que gera nível Moderada de verdade**

In `prisma/seed.ts`, inside `seedDemoUserAndCatalog()`, find:

```typescript
  const questions = await db.question.findMany({ include: { options: true } });
  const answers = questions.map((q) => {
    const sorted = [...q.options].sort((a, b) => b.rawScore - a.rawScore);
    const middle = sorted[Math.floor(sorted.length / 2)];
    return { questionId: q.id, optionId: middle.id };
  });
```

Replace with:

```typescript
  const questions = await db.question.findMany({ include: { options: true } });
  // Ordena por rawScore crescente e pega a "mediana por baixo" (index
  // floor(length * 0.5)) — verificado contra o banco real: produz
  // resultadoFinal ~68 (MODERADA), com folga confortável da fronteira em 60.
  const answers = questions.map((q) => {
    const sorted = [...q.options].sort((a, b) => a.rawScore - b.rawScore);
    const median = sorted[Math.floor(sorted.length * 0.5)];
    return { questionId: q.id, optionId: median.id };
  });
```

- [ ] **Step 3: Adicionar Entitlement CHALLENGE + ChallengeProgress após a criação do REPORT**

In `prisma/seed.ts`, inside `seedDemoUserAndCatalog()`, find:

```typescript
  const reportProduct = await db.product.findUniqueOrThrow({ where: { slug: 'acesso-relatorio' } });
  await db.entitlement.create({
    data: { userId: user.id, productId: reportProduct.id, type: 'REPORT', status: 'ACTIVE' },
  });

  console.log(
    `Demo user: ${user.email} (assessment ${result.assessmentId}, nivel ${result.nivelGlobal}, resultadoFinal ${result.resultadoFinal})`
  );
}
```

Replace with:

```typescript
  const reportProduct = await db.product.findUniqueOrThrow({ where: { slug: 'acesso-relatorio' } });
  await db.entitlement.create({
    data: { userId: user.id, productId: reportProduct.id, type: 'REPORT', status: 'ACTIVE' },
  });

  const challengeProduct = await db.product.findUniqueOrThrow({ where: { slug: 'desafio-7-dias' } });
  await db.entitlement.create({
    data: {
      userId: user.id,
      productId: challengeProduct.id,
      type: 'CHALLENGE',
      status: 'ACTIVE',
      metadata: { track: result.nivelGlobal } as unknown as object,
    },
  });

  const track = await db.challengeTrack.findUniqueOrThrow({ where: { level: result.nivelGlobal } });

  // Dias 0-3 concluídos com timestamps escalonados (folga de sobra sobre o
  // cooldown de 20h da trilha), dia 4 liberado. Usuária pronta pra demo sem
  // precisar simular o fluxo do zero.
  const now = Date.now();
  const HOUR_MS = 3600_000;
  const dayCompletions = {
    0: { completedAt: new Date(now - 96 * HOUR_MS).toISOString() },
    1: { completedAt: new Date(now - 72 * HOUR_MS).toISOString() },
    2: { completedAt: new Date(now - 48 * HOUR_MS).toISOString() },
    3: { completedAt: new Date(now - 24 * HOUR_MS).toISOString() },
  };

  await db.challengeProgress.upsert({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
    update: { currentDay: 4, dayCompletions: dayCompletions as unknown as object },
    create: {
      userId: user.id,
      trackId: track.id,
      currentDay: 4,
      dayCompletions: dayCompletions as unknown as object,
    },
  });

  console.log(
    `Demo user: ${user.email} (assessment ${result.assessmentId}, nivel ${result.nivelGlobal}, resultadoFinal ${result.resultadoFinal}, desafio dia 4/7 liberado)`
  );
}
```

- [ ] **Step 4: Rodar o seed e conferir o nível**

Run: `npm run db:seed`

Expected: a linha `Demo user: carolinapalitot20@gmail.com (assessment ..., nivel MODERADA, resultadoFinal 68.07, desafio dia 4/7 liberado)` — **nivel precisa ser MODERADA**. Se sair diferente, pare e não prossiga — algo no cálculo real diverge do que foi verificado nesta sessão contra o mesmo banco; investigue antes de continuar (não ajuste o percentil às cegas).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: nenhum erro em nenhum arquivo do repositório.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed showcase demo user with MODERADA level and active 7-day challenge"
```

---

### Task 6 (controller — não delegar a subagente): Verificação manual completa

Esta task não é implementação — é a verificação ao vivo de todo o wiring novo, rodada pelo controller com o servidor de dev, mesmo padrão já usado nas Fases 3, 4, 5 e 5b (subagentes em background não conseguem permissão interativa pra rodar servidor de dev nesta máquina).

- [ ] Checar se a porta 3000 está livre antes de começar (perguntar ao usuário se estiver ocupada)
- [ ] Rodar `npm run dev`
- [ ] Logar como a usuária demo (Carolina, `/login`) e confirmar em `/dashboard`:
  - Nível exibido é **Moderada** (não Baixa)
  - Card do relatório aponta pra `/relatorio` e abre de verdade (13 pilares, sem placeholder)
  - Card do desafio mostra **"Dia 4 de 7 em andamento"** com a barra de progresso preenchida (não "Começar agora")
- [ ] Acessar `/desafio` como Carolina e confirmar: dias 0-3 aparecem concluídos, dia 4 liberado, dias 5-7 bloqueados
- [ ] Concluir o dia 4 (ou outro dia liberado) e confirmar: aparece a tela `ChallengeCompleteView` (não pula direto pra timeline), com o texto de encorajamento do dia certo e a barra de progresso correta; clicar em "Voltar à jornada" volta pra `/desafio`
- [ ] Criar uma usuária de teste nova via quiz (sem comprar nada) e confirmar:
  - Acessar `/desafio` diretamente redireciona pra `/desafio/oferta` (não mais pra `/dashboard`)
  - `/desafio/oferta` mostra a oferta genérica (sem trilha destacada, já que ainda não tem assessment com REPORT pago) ou personalizada se já tiver feito o quiz — conferir qual dos dois casos bate com o estado real da usuária de teste
  - No dashboard dessa usuária (se ela tiver assessment mas não CHALLENGE), o card do desafio aponta pra `/desafio/oferta`, não mais pro link cru do Kiwify
- [ ] Simular a compra do desafio pra essa usuária de teste (`POST /api/checkout/simulate`) e confirmar que `/desafio/oferta` agora redireciona pra `/desafio` (já tem a trilha)
- [ ] Testar o caso de borda `/desafio/999/concluido` (dia inexistente) e confirmar 404
- [ ] Limpar os dados da usuária de teste criada nesta verificação
- [ ] Rodar `npm run lint` e `npm run build` — confirmar que ambos passam limpos
- [ ] Parar o servidor de dev

---

## Ao final desta fase

Todas as 11 telas do funil original têm rota real com dados do banco — nenhuma delas depende mais só de fixture. A usuária demo (Carolina) está pronta pra qualquer gravação de vídeo: nível Moderada, relatório completo acessível, desafio ativo com progresso real (dia 4 de 7 liberado), sem precisar simular nada na hora.
