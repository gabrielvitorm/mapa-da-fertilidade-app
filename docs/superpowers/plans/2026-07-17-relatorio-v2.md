# Relatório v2: radar, prioridades e exportação em PDF - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/relatorio` em um relatório de alto valor percebido com radar, priorização, agrupamento por peso e exportação em PDF via impressão do navegador, sem mexer em motor de score, schema Prisma ou entitlements.

**Architecture:** O server continua responsável por buscar dados e montar `AssessmentResult`. O client passa a orquestrar uma composição modular: score global, radar, prioridades, grupos com barra de score e plano de ação. A impressão reutiliza os mesmos dados em uma rota estática `/relatorio/imprimir`, sem server-side PDF e sem duplicar lógica de query.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Recharts 3.x, SVG/CSS puro para indicadores leves, Prisma já existente.

---

## File Map

- `src/types/assessment.ts`: contrato `PillarResult` e labels curtos do radar.
- `src/lib/report-assembly.ts`: preencher os novos campos numéricos em `PillarResult`.
- `src/lib/report-assembly.test.ts`: validar propagação dos novos campos.
- `src/app/preview/relatorio/fixture.ts`: fixture compatível com o novo contrato.
- `src/lib/report-priority.ts`: função pura `rankPillars`.
- `src/lib/report-priority.test.ts`: teste unitário do ranking.
- `src/lib/report-theme.ts`: tokens de cor compartilhados entre charts e impressão.
- `src/components/ui/ScoreRing.tsx`: faixa global com marcadores e legenda.
- `src/components/ui/PillarScoreBar.tsx`: barra compacta por pilar.
- `src/components/charts/PillarRadarChart.tsx`: radar dos 13 pilares.
- `src/components/screens/PrioritySummary.tsx`: blocos de prioridades e fortalezas.
- `src/components/screens/ActionPlan.tsx`: plano de ação sequencial.
- `src/components/screens/ReportView.tsx`: composição principal da tela.
- `src/components/screens/ReportClient.tsx`: rota client existente, com botão de impressão.
- `src/components/screens/ReportPrintView.tsx`: layout A4 estático da rota de impressão.
- `src/lib/report-data.ts`: extração da busca de dados compartilhada.
- `src/app/relatorio/page.tsx`: usa `report-data.ts`.
- `src/app/relatorio/imprimir/page.tsx`: versão A4.
- `src/app/relatorio/imprimir/print.module.css`: regras de impressão.
- `src/app/preview/relatorio/page.tsx`: preview atualizado.

---

### Task 1: Propagar contrato numérico em `PillarResult`

**Files:**
- Modify: `src/types/assessment.ts`
- Modify: `src/lib/report-assembly.ts`
- Modify: `src/lib/report-assembly.test.ts`
- Modify: `src/app/preview/relatorio/fixture.ts`

**Interfaces:**
- Produces: `PillarResult.score`, `PillarResult.max`, `PillarResult.ratio`, `PillarResult.peso`.
- Consumes: `assessment.pillarScores`, `ScoreRuleInput`, `PILLAR_LABEL`.

- [ ] **Step 1: Editar `src/types/assessment.ts`**

Substituir a interface atual:

```ts
export interface PillarResult {
  key: PillarKey;
  /** Rótulo amigável em PT-BR para exibição (ex.: "Saúde Hormonal"). */
  label: string;
  level: PillarLevel;
  diagnostico: string;
  recomendacao: string;
  /** Conteúdo liberado só após pagamento (entitlement REPORT). */
  locked?: boolean;
}
```

por:

```ts
export interface PillarResult {
  key: PillarKey;
  /** Rótulo amigável em PT-BR para exibição (ex.: "Saúde Hormonal"). */
  label: string;
  level: PillarLevel;
  diagnostico: string;
  recomendacao: string;
  /** Conteúdo liberado só após pagamento (entitlement REPORT). */
  locked?: boolean;
  score: number;
  max: number;
  ratio: number;
  peso: 1 | 2 | 3;
}
```

Adicionar também os rótulos curtos usados no radar:

```ts
export const PILLAR_SHORT_LABEL: Record<PillarKey, string> = {
  fatores_infertilidade: 'Fatores',
  saude_hormonal: 'Hormonal',
  ciclo: 'Ciclo',
  sono: 'Sono',
  imunidade: 'Imunidade',
  atividade_fisica: 'Atividade',
  alimentacao: 'Alimentação',
  saude_intestinal: 'Intestino',
  figado: 'Fígado',
  estresse: 'Estresse',
  tireoide: 'Tireoide',
  toxinas: 'Toxinas',
  historico: 'Histórico',
};
```

- [ ] **Step 2: Editar `src/lib/report-assembly.ts`**

Substituir o bloco que monta `pillars`:

```ts
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
```

por:

```ts
  const pillars: PillarResult[] = rules.map((rule) => {
    const score = pillarScores[rule.pillar] ?? 0;
    const max = rule.maxDoPilar;
    const ratio = Math.max(0, Math.min(1, score / max));
    const level = pillarLevel(score, max);
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
      score,
      max,
      ratio,
      peso: rule.peso,
    };
  });
```

- [ ] **Step 3: Atualizar `src/lib/report-assembly.test.ts`**

Adicionar asserts para os novos campos no pilar `sono`:

```ts
assertEqual(sono.score, 18, 'sono expõe score bruto');
assertEqual(sono.max, 20, 'sono expõe max do pilar');
assertEqual(sono.ratio, 0.9, 'sono expõe ratio normalizado');
assertEqual(sono.peso, 2, 'sono expõe peso da regra');
```

Adicionar asserts equivalentes para `estresse`:

```ts
assertEqual(estresse.score, 15, 'estresse expõe score bruto');
assertEqual(estresse.max, 30, 'estresse expõe max do pilar');
assertEqual(estresse.ratio, 0.5, 'estresse expõe ratio normalizado');
assertEqual(estresse.peso, 3, 'estresse expõe peso da regra');
```

- [ ] **Step 4: Atualizar `src/app/preview/relatorio/fixture.ts`**

Incluir `score`, `max`, `ratio` e `peso` em todos os 13 pilares. Use valores coerentes com os níveis já presentes. Exemplo:

```ts
{
  key: 'sono',
  label: PILLAR_LABEL.sono,
  level: 'Alto',
  diagnostico: 'Sincronia circadiana excelente, com média de 7h45 de sono profundo.',
  recomendacao: 'Mantenha a janela de sono atual. Continue evitando telas 1h antes de deitar.',
  score: 18,
  max: 20,
  ratio: 0.9,
  peso: 2,
}
```

Repetir o padrão para os demais pilares mantendo consistência com o score de cada nível.

- [ ] **Step 5: Rodar a validação**

Run:

```powershell
npx tsc --noEmit
npx tsx src/lib/report-assembly.test.ts
```

Expected:

- TypeScript sem erros.
- `report-assembly.test.ts: all assertions passed`.

---

### Task 2: Criar ranking e tema compartilhado do relatório

**Files:**
- Create: `src/lib/report-priority.ts`
- Create: `src/lib/report-priority.test.ts`
- Create: `src/lib/report-theme.ts`

**Interfaces:**
- Produces: `rankPillars(...)`.
- Consumes: `PillarResult`, cores de marca centralizadas.

- [ ] **Step 1: Criar `src/lib/report-priority.ts`**

```ts
import type { PillarResult } from '@/types/assessment';

export function rankPillars(pillars: PillarResult[]) {
  const available = pillars.filter((pillar) => !pillar.locked);

  const priorities = [...available]
    .sort((a, b) => {
      const scoreA = (1 - a.ratio) * a.peso;
      const scoreB = (1 - b.ratio) * b.peso;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.peso !== a.peso) return b.peso - a.peso;
      return a.ratio - b.ratio;
    })
    .slice(0, 3);

  const strengths = [...available]
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      if (b.peso !== a.peso) return b.peso - a.peso;
      return a.score - b.score;
    })
    .slice(0, 3);

  const actionItems = [...available]
    .filter((pillar) => pillar.level !== 'Alto')
    .sort((a, b) => {
      const scoreA = (1 - a.ratio) * a.peso;
      const scoreB = (1 - b.ratio) * b.peso;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.peso !== a.peso) return b.peso - a.peso;
      return a.ratio - b.ratio;
    })
    .slice(0, 5);

  return { priorities, strengths, actionItems };
}
```

- [ ] **Step 2: Criar `src/lib/report-priority.test.ts`**

```ts
import { rankPillars } from './report-priority';
import type { PillarResult } from '@/types/assessment';

function pillar(input: Partial<PillarResult> & Pick<PillarResult, 'key' | 'ratio' | 'peso' | 'level' | 'score' | 'max' | 'label' | 'diagnostico' | 'recomendacao'>): PillarResult {
  return {
    locked: false,
    ...input,
  };
}

const result = rankPillars([
  pillar({ key: 'fatores_infertilidade', label: 'Fatores', level: 'Baixo', ratio: 0.3, peso: 3, score: 9, max: 30, diagnostico: 'd', recomendacao: 'r' }),
  pillar({ key: 'toxinas', label: 'Toxinas', level: 'Baixo', ratio: 0.3, peso: 1, score: 3, max: 10, diagnostico: 'd', recomendacao: 'r' }),
  pillar({ key: 'sono', label: 'Sono', level: 'Alto', ratio: 0.9, peso: 2, score: 18, max: 20, diagnostico: 'd', recomendacao: 'r' }),
  pillar({ key: 'estresse', label: 'Estresse', level: 'Moderado', ratio: 0.5, peso: 3, score: 15, max: 30, diagnostico: 'd', recomendacao: 'r' }),
]);

if (result.priorities[0]?.key !== 'fatores_infertilidade') {
  throw new Error('prioridade deve favorecer o pilar de peso 3 com ratio baixo');
}

if (result.strengths[0]?.key !== 'sono') {
  throw new Error('fortaleza deve favorecer o maior ratio');
}

if (result.actionItems[0]?.level === 'Alto') {
  throw new Error('plano de ação não deve incluir pilares altos');
}

console.log('report-priority.test.ts: all assertions passed');
```

- [ ] **Step 3: Criar `src/lib/report-theme.ts`**

```ts
export const REPORT_THEME = {
  terracota: '#C2795F',
  sage: '#8DA290',
  gold: '#C9A24B',
  brown: '#2E2620',
  cream: 'var(--color-surface-cream)',
  borderSoft: 'var(--color-border-soft)',
} as const;
```

- [ ] **Step 4: Rodar a validação**

Run:

```powershell
npx tsc --noEmit
npx tsx src/lib/report-priority.test.ts
```

Expected:

- TypeScript sem erros.
- `report-priority.test.ts: all assertions passed`.

---

### Task 3: Evoluir `ScoreRing` com faixas e legenda

**Files:**
- Modify: `src/components/ui/ScoreRing.tsx`

**Interfaces:**
- Consumes: `showThresholds?: boolean`.

- [ ] **Step 1: Atualizar o componente**

Substituir a implementação atual:

```tsx
export function ScoreRing({ score }: { score: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative w-28 h-28 flex items-center justify-center bg-[var(--color-surface-cream)] rounded-full border border-[var(--color-border-soft)]">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
        <circle ... />
        <circle ... />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl font-extrabold text-[var(--color-brand-terracota)]">
          {Math.round(clamped)}
        </span>
        <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Score</span>
      </div>
    </div>
  );
}
```

por uma versão com:

```tsx
export function ScoreRing({ score, showThresholds = true }: { score: number; showThresholds?: boolean }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28 flex items-center justify-center bg-[var(--color-surface-cream)] rounded-full border border-[var(--color-border-soft)]">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
          <circle ... />
          <circle ... />
          {showThresholds && (
            <>
              <line ... /> {/* tick 60 */}
              <line ... /> {/* tick 80 */}
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-3xl font-extrabold text-[var(--color-brand-terracota)]">
            {Math.round(clamped)}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Score</span>
        </div>
      </div>

      {showThresholds && (
        <div className="flex items-center justify-center gap-2 text-[10px] leading-none flex-wrap text-[var(--color-brand-brown)]/70">
          <span>Semente (&lt;60)</span>
          <span>·</span>
          <span>Raízes (60–80)</span>
          <span>·</span>
          <span>Floração (&gt;80)</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Garantir compatibilidade com usos existentes**

Atualizar chamadas em `DashboardView` e `ReportView` apenas se a nova estrutura visual exigir ajuste de layout, sem mudar assinatura obrigatória.

- [ ] **Step 3: Type-check**

Run:

```powershell
npx tsc --noEmit
```

Expected: sem erros.

---

### Task 4: Criar radar dos pilares com Recharts

**Files:**
- Create: `src/components/charts/PillarRadarChart.tsx`
- Modify: `src/components/screens/ReportView.tsx`
- Modify: `src/app/preview/relatorio/page.tsx`

**Interfaces:**
- Consumes: `PILLAR_SHORT_LABEL`, `REPORT_THEME`, `PillarResult[]`.

- [ ] **Step 1: Criar `src/components/charts/PillarRadarChart.tsx`**

```tsx
'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { REPORT_THEME } from '@/lib/report-theme';
import { PILLAR_SHORT_LABEL, type PillarResult } from '@/types/assessment';

type RadarItem = {
  key: PillarResult['key'];
  label: string;
  value: number;
};

export function PillarRadarChart({ pillars }: { pillars: PillarResult[] }) {
  const data: RadarItem[] = pillars.map((pillar) => ({
    key: pillar.key,
    label: PILLAR_SHORT_LABEL[pillar.key],
    value: Math.round(pillar.ratio * 100),
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="78%" data={data}>
          <PolarGrid stroke={REPORT_THEME.borderSoft} />
          <PolarAngleAxis dataKey="label" tick={{ fill: REPORT_THEME.brown, fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke={REPORT_THEME.terracota}
            fill={REPORT_THEME.sage}
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Reorganizar `src/components/screens/ReportView.tsx`**

Substituir o bloco único de accordions por composição das novas seções:

```tsx
<ScoreRing score={result.resultadoFinal} />
<PillarRadarChart pillars={result.pillars} />
<PrioritySummary pillars={result.pillars} />
<ActionPlan pillars={result.pillars} />
```

Manter o header e o upsell no fim. O accordion continua existindo, mas com header enriquecido e agrupamento por peso. A renderização dos grupos fica inline em `ReportView`, sem novo componente separado.

- [ ] **Step 3: Atualizar `src/app/preview/relatorio/page.tsx`**

Garantir que o preview renderize a `ReportView` nova sem dependências de sessão.

- [ ] **Step 4: Type-check**

Run:

```powershell
npx tsc --noEmit
```

Expected: sem erros.

---

### Task 5: Prioridades, grupo por peso e plano de ação

**Files:**
- Create: `src/components/screens/PrioritySummary.tsx`
- Create: `src/components/screens/ActionPlan.tsx`
- Create: `src/components/ui/PillarScoreBar.tsx`
- Modify: `src/components/screens/ReportView.tsx`

**Interfaces:**
- Consumes: `rankPillars`.

- [ ] **Step 1: Criar `src/components/ui/PillarScoreBar.tsx`**

```tsx
import { REPORT_THEME } from '@/lib/report-theme';
import type { PillarResult } from '@/types/assessment';

const LEVEL_COLOR: Record<PillarResult['level'], string> = {
  Alto: REPORT_THEME.sage,
  Moderado: REPORT_THEME.gold,
  Baixo: REPORT_THEME.terracota,
};

export function PillarScoreBar({ pillar }: { pillar: PillarResult }) {
  const width = Math.round(pillar.ratio * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] text-[var(--color-brand-brown)]/70">
        <span>{pillar.score} de {pillar.max} pts</span>
        <span>{pillar.level}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-border-soft)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: LEVEL_COLOR[pillar.level] }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar `src/components/screens/PrioritySummary.tsx`**

```tsx
import { Flame, Sparkles, type LucideIcon } from 'lucide-react';
import { PillarLevelBadge } from '@/components/ui/PillarLevelBadge';
import { rankPillars } from '@/lib/report-priority';
import type { PillarResult } from '@/types/assessment';

const ICONS: Record<PillarResult['key'], LucideIcon> = {
  fatores_infertilidade: Sparkles,
  saude_hormonal: Flame,
  ciclo: Flame,
  sono: Sparkles,
  imunidade: Sparkles,
  atividade_fisica: Sparkles,
  alimentacao: Sparkles,
  saude_intestinal: Sparkles,
  figado: Sparkles,
  estresse: Flame,
  tireoide: Sparkles,
  toxinas: Flame,
  historico: Sparkles,
};

export function PrioritySummary({ pillars }: { pillars: PillarResult[] }) {
  const { priorities, strengths } = rankPillars(pillars);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4">
          <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] mb-3">Prioridades</h3>
          <div className="space-y-3">
            {priorities.map((pillar) => {
              const Icon = ICONS[pillar.key];
              return (
                <div key={pillar.key} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[var(--color-brand-terracota)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-brand-brown)] truncate">{pillar.label}</p>
                      <PillarLevelBadge level={pillar.level} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4">
          <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] mb-3">Fortalezas</h3>
          <div className="space-y-3">
            {strengths.map((pillar) => {
              const Icon = ICONS[pillar.key];
              return (
                <div key={pillar.key} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[var(--color-brand-sage)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-brand-brown)] truncate">{pillar.label}</p>
                      <PillarLevelBadge level={pillar.level} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Criar `src/components/screens/ActionPlan.tsx`**

```tsx
import type { PillarResult } from '@/types/assessment';
import { rankPillars } from '@/lib/report-priority';

export function ActionPlan({ pillars }: { pillars: PillarResult[] }) {
  const { actionItems } = rankPillars(pillars);

  if (actionItems.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4">
        <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] mb-2">Plano de Ação</h3>
        <p className="text-sm text-[var(--color-brand-brown)]/75">
          Você está com todos os pilares em nível alto. O foco agora é manter consistência e proteger os ganhos.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4">
      <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] mb-3">Plano de Ação</h3>
      <ol className="space-y-3">
        {actionItems.map((pillar, index) => (
          <li key={pillar.key} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--color-brand-terracota)] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-brand-brown)]">{pillar.label}</p>
              <p className="text-sm text-[var(--color-brand-brown)]/75">{pillar.recomendacao}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Ajustar o accordion de pilares em `ReportView`**

Agrupar os pilares por `peso` real e renderizar cada card com `PillarScoreBar` sempre visível no header.

Estrutura base esperada:

```tsx
<PillarScoreBar pillar={pillar} />
```

usar no header do card, antes da área expandível.

- [ ] **Step 5: Rodar validação**

Run:

```powershell
npx tsc --noEmit
```

Expected: sem erros.

---

### Task 6: Extrair dados compartilhados e criar rota de impressão

**Files:**
- Create: `src/lib/report-data.ts`
- Modify: `src/app/relatorio/page.tsx`
- Create: `src/app/relatorio/imprimir/page.tsx`
- Create: `src/app/relatorio/imprimir/print.module.css`
- Create: `src/components/screens/ReportPrintView.tsx`
- Modify: `src/components/screens/ReportClient.tsx`

**Interfaces:**
- Produces: `loadReportData(userId)`.
- Consumes: mesma busca por usuário, assessment, rules e messages.

- [ ] **Step 1: Criar `src/lib/report-data.ts`**

```ts
import { db } from '@/lib/db';
import { computeAssessment } from '@/lib/scoring';
import { buildAssessmentResult } from '@/lib/report-assembly';
import { PILLAR_LABEL, type PillarKey } from '@/types/assessment';

export async function loadReportData(userId: string) {
  const assessment = await db.assessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!assessment) {
    return null;
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

  return buildAssessmentResult(
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
}
```

- [ ] **Step 2: Simplificar `src/app/relatorio/page.tsx`**

Trocar a montagem inline por `loadReportData(user.id)` e manter os guards de sessão e entitlement.

- [ ] **Step 3: Criar `src/app/relatorio/imprimir/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { loadReportData } from '@/lib/report-data';
import { ReportPrintView } from '@/components/screens/ReportPrintView';

export default async function ReportPrintPage() {
  const user = await requireSessionUser();
  const hasReport = await hasActiveEntitlement(user.id, 'REPORT');
  if (!hasReport) {
    redirect('/dashboard');
  }

  const result = await loadReportData(user.id);
  if (!result) {
    redirect('/dashboard');
  }

  return <ReportPrintView result={result} />;
}
```

- [ ] **Step 4: Criar `src/components/screens/ReportPrintView.tsx`**

```tsx
import type { AssessmentResult } from '@/types/assessment';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { PillarRadarChart } from '@/components/charts/PillarRadarChart';
import { PrioritySummary } from '@/components/screens/PrioritySummary';
import { ActionPlan } from '@/components/screens/ActionPlan';
import { PillarScoreBar } from '@/components/ui/PillarScoreBar';

export function ReportPrintView({ result }: { result: AssessmentResult }) {
  return (
    <div className="printRoot">
      <section className="avoidBreak">
        <ScoreRing score={result.resultadoFinal} showThresholds />
      </section>
      <section className="avoidBreak">
        <PillarRadarChart pillars={result.pillars} />
      </section>
      <section className="avoidBreak">
        <PrioritySummary pillars={result.pillars} />
      </section>
      <section className="avoidBreak space-y-3">
        {result.pillars.map((pillar) => (
          <div key={pillar.key} className="bg-white rounded-xl border border-[var(--color-border-soft)] p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm text-[var(--color-brand-brown)]">{pillar.label}</h3>
            </div>
            <PillarScoreBar pillar={pillar} />
            <p className="mt-2 text-sm text-[var(--color-brand-brown)]/80">{pillar.diagnostico}</p>
            <p className="mt-1 text-sm text-[var(--color-brand-brown)]/80">{pillar.recomendacao}</p>
          </div>
        ))}
      </section>
      <section className="avoidBreak">
        <ActionPlan pillars={result.pillars} />
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Criar `src/app/relatorio/imprimir/print.module.css`**

```css
@page {
  size: A4;
  margin: 14mm;
}

@media print {
  .printRoot {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .avoidBreak {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
```

- [ ] **Step 6: Ajustar `ReportClient` para navegação de impressão**

Adicionar ação para abrir `/relatorio/imprimir` em nova aba ou navegação direta, conforme o padrão visual da tela.

- [ ] **Step 7: Rodar validação**

Run:

```powershell
npx tsc --noEmit
```

Expected: sem erros.

---

### Task 7: Atualizar preview e validar a página completa

**Files:**
- Modify: `src/app/preview/relatorio/page.tsx`
- Modify: `src/app/preview/relatorio/fixture.ts`
- Modify: `src/components/screens/ReportView.tsx`

**Interfaces:**
- Consumes: layout novo, fixture atualizado, rota de impressão.

- [ ] **Step 1: Confirmar que o preview usa o relatório novo**

Garantir que `src/app/preview/relatorio/page.tsx` continue simples, apenas renderizando `ReportView` com o fixture.

- [ ] **Step 2: Validar a ordem e o conteúdo**

Verificar visualmente:

- score global com faixas;
- radar com 13 pilares;
- prioridades e fortalezas;
- grupos por peso;
- plano de ação;
- upsell no fim;
- botão de impressão.

- [ ] **Step 3: Rodar validação final do bloco**

Run:

```powershell
npx tsc --noEmit
npx tsx src/lib/report-assembly.test.ts
npx tsx src/lib/report-priority.test.ts
```

Expected:

- TypeScript sem erros.
- Os dois testes unitários passam.

- [ ] **Step 4: Commit**

```bash
git add src/types/assessment.ts src/lib/report-assembly.ts src/lib/report-assembly.test.ts src/app/preview/relatorio/fixture.ts src/lib/report-priority.ts src/lib/report-priority.test.ts src/lib/report-theme.ts src/components/ui/ScoreRing.tsx src/components/charts/PillarRadarChart.tsx src/components/screens/PrioritySummary.tsx src/components/screens/ActionPlan.tsx src/components/ui/PillarScoreBar.tsx src/lib/report-data.ts src/app/relatorio/page.tsx src/app/relatorio/imprimir/page.tsx src/app/relatorio/imprimir/print.module.css src/components/screens/ReportPrintView.tsx src/components/screens/ReportClient.tsx src/components/screens/ReportView.tsx src/app/preview/relatorio/page.tsx
git commit -m "feat: add report v2 radar priorities and print view"
```

---

## Implementation Notes

- Não criar abstrações genéricas além do necessário.
- Não mover o teaser bloqueado para esta execução.
- Não usar score bruto no radar.
- Não hardcodar grupos por lista se o peso real do banco já existir.
- Se o radar ficar poluído em mobile, ajustar labels curtas antes de mexer em layout maior.

## Residual Risks

- O maior risco é a legibilidade do radar em telas muito estreitas.
- A impressão precisa ser verificada no navegador alvo antes de considerar finalizada.
- A composição de prioridades depende da qualidade dos novos campos numéricos em `PillarResult`.
