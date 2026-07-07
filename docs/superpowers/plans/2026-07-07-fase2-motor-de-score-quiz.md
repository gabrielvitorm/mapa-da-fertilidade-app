# Fase 2 — Motor de Score + Quiz Nativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motor de score real (fiel ao Typebot original) calculando o assessment a partir das respostas do quiz, e o funil nativo completo e navegável: Welcome → Captura → Quiz (41 perguntas reais) → Resultado (teaser) → Checkout (venda do relatório).

**Architecture:** Funções puras e testáveis em `src/lib/` (scoring + agregação de respostas) consumidas por um serviço de aplicação (`assessment-service.ts`) que é a única coisa que toca o banco para criar um Assessment. Rotas de API para os dois caminhos de ingestão (nativo e Typebot). Páginas do funil como Server Components buscando dados direto via Prisma (padrão já usado no restante do app), com um único Client Component (`QuizFlow`) pra gerenciar o estado de navegação das perguntas.

**Tech Stack:** Next.js 16 App Router (Server Components + Route Handlers), Prisma 6.19.3 (Fase 1), TypeScript, `node:assert` para testes de função pura (sem runner formal, convenção já estabelecida no repo).

## Global Constraints

- Fórmulas de score fiéis ao `docs/02-motor-de-score.md` e à extração real do Typebot em `prisma/seed-data/quiz-source.json` — não alterar pesos/máximos/denominador sem nova decisão explícita.
- `SCORE_DENOMINATOR = 285` — não derivar da soma dos máximos (que é 291).
- Ordem do funil nativo (decidida nesta fase, substitui a ordem original do design spec): **Welcome → Captura → Quiz → Resultado (teaser) → Checkout**. Nome é capturado ANTES do quiz.
- O CTA do `ResultTeaserView` deve apontar para a rota interna `/checkout?assessmentId=...`, não direto para a URL externa do Kiwify — só o `CheckoutReportView` tem o link externo real.
- Todas as 41 perguntas, pesos, máximos e as 39 mensagens de diagnóstico/recomendação vêm de `prisma/seed-data/quiz-source.json` — não inventar conteúdo novo, não usar placeholders.
- Commits: **nunca** incluir trailer `Co-Authored-By: Claude` ou qualquer menção de co-autoria de IA.
- Server Component por padrão; `'use client'` só onde há estado/interação real (a própria página do quiz precisa de um client component para navegação entre perguntas).
- Toda escrita no banco relacionada a Assessment passa por `src/lib/assessment-service.ts` — nenhuma rota ou página cria um `Assessment` diretamente via `db.assessment.create`.

---

### Task 1: `src/lib/scoring.ts` — função pura de cálculo do assessment

**Files:**
- Create: `src/lib/scoring.ts`
- Create: `src/lib/scoring.test.ts`

**Interfaces:**
- Consumes: `PillarKey`, `PillarLevel`, `NivelGlobal` de `@/types/assessment` (já existem).
- Produces: `computeAssessment(pillarScores, rules, scoreDenominator): AssessmentComputation` — usado por `assessment-service.ts` (Task 5).

- [ ] **Step 1: Escrever o teste (RED)**

```typescript
// src/lib/scoring.test.ts
import assert from 'node:assert/strict';
import { computeAssessment, type ScoreRuleInput } from './scoring';

const RULES: ScoreRuleInput[] = [
  { pillar: 'fatores_infertilidade', peso: 3, maxDoPilar: 72 },
  { pillar: 'saude_hormonal', peso: 3, maxDoPilar: 36 },
  { pillar: 'ciclo', peso: 3, maxDoPilar: 27 },
  { pillar: 'sono', peso: 2, maxDoPilar: 24 },
  { pillar: 'imunidade', peso: 2, maxDoPilar: 24 },
  { pillar: 'atividade_fisica', peso: 2, maxDoPilar: 18 },
  { pillar: 'alimentacao', peso: 2, maxDoPilar: 18 },
  { pillar: 'saude_intestinal', peso: 2, maxDoPilar: 18 },
  { pillar: 'figado', peso: 2, maxDoPilar: 18 },
  { pillar: 'estresse', peso: 2, maxDoPilar: 18 },
  { pillar: 'tireoide', peso: 2, maxDoPilar: 9 },
  { pillar: 'toxinas', peso: 1, maxDoPilar: 6 },
  { pillar: 'historico', peso: 1, maxDoPilar: 3 },
];
const SCORE_DENOMINATOR = 285;

function zeroScores(overrides: Partial<Record<string, number>> = {}) {
  const base: Record<string, number> = {};
  for (const r of RULES) base[r.pillar] = overrides[r.pillar] ?? 0;
  return base as Record<ScoreRuleInput['pillar'], number>;
}

// Score 0 -> BAIXA, todos os pilares Baixo
{
  const result = computeAssessment(zeroScores(), RULES, SCORE_DENOMINATOR);
  assert.equal(result.scoreTotal, 0);
  assert.equal(result.resultadoFinal, 0);
  assert.equal(result.nivelGlobal, 'BAIXA');
  assert.equal(result.pontosAtencao.length, 13);
  assert.ok(result.pontosAtencao.every((p) => p.level === 'Baixo'));
}

// Score máximo (soma dos maxDoPilar = 291) -> resultadoFinal > 100, ALTA, todos Alto
{
  const maxed = zeroScores();
  for (const r of RULES) maxed[r.pillar] = r.maxDoPilar;
  const result = computeAssessment(maxed, RULES, SCORE_DENOMINATOR);
  assert.equal(result.scoreTotal, 291);
  assert.equal(result.resultadoFinal, Number(((291 / 285) * 100).toFixed(2)));
  assert.equal(result.nivelGlobal, 'ALTA');
  assert.ok(result.pontosAtencao.every((p) => p.level === 'Alto'));
}

// Fronteira: resultadoFinal exatamente 80 -> MODERADA (regra é "> 80" para ALTA)
{
  // scoreTotal necessário para resultadoFinal = 80: (scoreTotal/285)*100 = 80 -> scoreTotal = 228
  const scores = zeroScores({ fatores_infertilidade: 228 });
  const rulesUmPilar: ScoreRuleInput[] = [{ pillar: 'fatores_infertilidade', peso: 3, maxDoPilar: 72 }];
  const scoresUmPilar = { fatores_infertilidade: 228 } as Record<'fatores_infertilidade', number>;
  const result = computeAssessment(scoresUmPilar as any, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(result.resultadoFinal, 80);
  assert.equal(result.nivelGlobal, 'MODERADA');
}

// Fronteira: resultadoFinal exatamente 60 -> MODERADA
{
  const rulesUmPilar: ScoreRuleInput[] = [{ pillar: 'fatores_infertilidade', peso: 3, maxDoPilar: 72 }];
  const scoresUmPilar = { fatores_infertilidade: 171 } as Record<'fatores_infertilidade', number>; // (171/285)*100 = 60
  const result = computeAssessment(scoresUmPilar as any, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(result.resultadoFinal, 60);
  assert.equal(result.nivelGlobal, 'MODERADA');
}

// Nível por pilar: corte 0.8 (Alto) e 0.6 (Moderado) exatos
{
  const rulesUmPilar: ScoreRuleInput[] = [{ pillar: 'sono', peso: 1, maxDoPilar: 100 }];
  const alto = computeAssessment({ sono: 80 } as any, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(alto.pontosAtencao[0].level, 'Alto');
  const moderado = computeAssessment({ sono: 60 } as any, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(moderado.pontosAtencao[0].level, 'Moderado');
  const baixo = computeAssessment({ sono: 59 } as any, rulesUmPilar, SCORE_DENOMINATOR);
  assert.equal(baixo.pontosAtencao[0].level, 'Baixo');
}

console.log('scoring.test.ts: all assertions passed');
```

- [ ] **Step 2: Rodar o teste e confirmar que falha (arquivo scoring.ts ainda não existe)**

Run: `npx tsx src/lib/scoring.test.ts`

Expected: erro de módulo não encontrado (`Cannot find module './scoring'`) ou similar — confirma que o teste está de fato testando algo que ainda não existe.

- [ ] **Step 3: Implementar `src/lib/scoring.ts`**

```typescript
import type { NivelGlobal, PillarKey, PillarLevel } from '@/types/assessment';

export interface ScoreRuleInput {
  pillar: PillarKey;
  peso: number;
  maxDoPilar: number;
}

export interface PontoAtencao {
  pillar: PillarKey;
  level: PillarLevel;
}

export interface AssessmentComputation {
  scoreTotal: number;
  resultadoFinal: number;
  nivelGlobal: NivelGlobal;
  pontosAtencao: PontoAtencao[];
}

function pillarLevel(score: number, max: number): PillarLevel {
  const ratio = score / max;
  if (ratio >= 0.8) return 'Alto';
  if (ratio >= 0.6) return 'Moderado';
  return 'Baixo';
}

function globalLevel(resultadoFinal: number): NivelGlobal {
  if (resultadoFinal > 80) return 'ALTA';
  if (resultadoFinal >= 60) return 'MODERADA';
  return 'BAIXA';
}

export function computeAssessment(
  pillarScores: Record<PillarKey, number>,
  rules: ScoreRuleInput[],
  scoreDenominator: number
): AssessmentComputation {
  const scoreTotal = rules.reduce((sum, r) => sum + (pillarScores[r.pillar] ?? 0), 0);
  const resultadoFinalBruto = (scoreTotal / scoreDenominator) * 100;
  const nivelGlobal = globalLevel(resultadoFinalBruto);
  const resultadoFinal = Number(resultadoFinalBruto.toFixed(2));
  const pontosAtencao: PontoAtencao[] = rules.map((r) => ({
    pillar: r.pillar,
    level: pillarLevel(pillarScores[r.pillar] ?? 0, r.maxDoPilar),
  }));

  return { scoreTotal, resultadoFinal, nivelGlobal, pontosAtencao };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa (GREEN)**

Run: `npx tsx src/lib/scoring.test.ts`

Expected: `scoring.test.ts: all assertions passed` e código de saída 0. Confirme com `echo $?` (deve imprimir `0`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: add pure scoring engine (computeAssessment)"
```

---

### Task 2: `src/lib/scoring-answers.ts` — agregação de respostas em pillarScores

**Files:**
- Create: `src/lib/scoring-answers.ts`
- Create: `src/lib/scoring-answers.test.ts`

**Interfaces:**
- Consumes: `PillarKey` de `@/types/assessment`.
- Produces: `computePillarScores(answeredOptions, weights): Record<PillarKey, number>` — usado por `assessment-service.ts` (Task 5).

- [ ] **Step 1: Escrever o teste (RED)**

```typescript
// src/lib/scoring-answers.test.ts
import assert from 'node:assert/strict';
import { computePillarScores, type AnsweredOption } from './scoring-answers';

const WEIGHTS = {
  fatores_infertilidade: 3, saude_hormonal: 3, ciclo: 3, sono: 2, imunidade: 2,
  atividade_fisica: 2, alimentacao: 2, saude_intestinal: 2, figado: 2, estresse: 2,
  tireoide: 2, toxinas: 1, historico: 1,
} as const;

// Duas respostas no mesmo pilar somam antes de multiplicar pelo peso
{
  const answers: AnsweredOption[] = [
    { pillar: 'sono', rawScore: 3 },
    { pillar: 'sono', rawScore: 2 },
  ];
  const result = computePillarScores(answers, WEIGHTS as any);
  assert.equal(result.sono, (3 + 2) * 2); // peso sono = 2
}

// Pilar sem nenhuma resposta fica em 0, não undefined
{
  const result = computePillarScores([], WEIGHTS as any);
  assert.equal(result.historico, 0);
  assert.equal(Object.keys(result).length, 13);
}

// rawScore 0 (ex.: opção "não sei") não contribui, mas pilar continua presente
{
  const answers: AnsweredOption[] = [{ pillar: 'saude_hormonal', rawScore: 0 }];
  const result = computePillarScores(answers, WEIGHTS as any);
  assert.equal(result.saude_hormonal, 0);
}

console.log('scoring-answers.test.ts: all assertions passed');
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx tsx src/lib/scoring-answers.test.ts`

Expected: `Cannot find module './scoring-answers'` ou erro equivalente.

- [ ] **Step 3: Implementar `src/lib/scoring-answers.ts`**

```typescript
import type { PillarKey } from '@/types/assessment';

export interface AnsweredOption {
  pillar: PillarKey;
  rawScore: number;
}

export function computePillarScores(
  answeredOptions: AnsweredOption[],
  weights: Record<PillarKey, number>
): Record<PillarKey, number> {
  const rawSums: Partial<Record<PillarKey, number>> = {};
  for (const { pillar, rawScore } of answeredOptions) {
    rawSums[pillar] = (rawSums[pillar] ?? 0) + rawScore;
  }

  const result = {} as Record<PillarKey, number>;
  for (const pillar of Object.keys(weights) as PillarKey[]) {
    result[pillar] = (rawSums[pillar] ?? 0) * weights[pillar];
  }
  return result;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx tsx src/lib/scoring-answers.test.ts`

Expected: `scoring-answers.test.ts: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring-answers.ts src/lib/scoring-answers.test.ts
git commit -m "feat: add answer aggregation into pillar scores"
```

---

### Task 3: Migration — adicionar `pillarOrdem` ao model `Question`

**Files:**
- Modify: `prisma/schema.prisma`
- Create (gerado pelo Prisma): `prisma/migrations/<timestamp>_add_question_pillar_ordem/migration.sql`

**Interfaces:**
- Produces: `Question.pillarOrdem: Int` — necessário porque `Question.pillar` é uma `String` livre (não um enum ordenado), e o quiz precisa ser servido na ordem correta dos 13 pilares (a mesma ordem do Typebot original: fatores_infertilidade=1 ... historico=13, ver `prisma/seed-data/quiz-source.json`). Usado por Task 4 (seed) e Task 8 (página do quiz).

- [ ] **Step 1: Adicionar o campo ao schema**

Em `prisma/schema.prisma`, no model `Question`, adicione `pillarOrdem` logo após `pillar`:

```prisma
model Question {
  id           String           @id @default(cuid())
  pillar       String
  pillarOrdem  Int
  ordem        Int
  texto        String
  options      QuestionOption[]
}
```

- [ ] **Step 2: Gerar e aplicar a migration**

Run: `npx prisma migrate dev --name add_question_pillar_ordem`

Expected: saída terminando em `Your database is now in sync with your schema.` — como a tabela `Question` ainda está vazia (nenhum seed rodou ainda), o Prisma não deve pedir um valor default/pergunta interativa.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add pillarOrdem to Question for deterministic quiz ordering"
```

---

### Task 4: `prisma/seed.ts` — popular banco de perguntas, regras de score e catálogo

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `prisma/seed-data/quiz-source.json` (já existe, commitado), `db` de `@/lib/db` (Fase 1, Task 4).
- Produces: linhas reais em `ScoreRule` (13), `Question`+`QuestionOption` (41 perguntas), `PillarMessage` (39), `Product` (1: `acesso-relatorio`) — consumidas por Task 5 (`assessment-service.ts`) e Task 8 (páginas do funil).

- [ ] **Step 1: Adicionar o script `db:seed` ao `package.json`**

Adicione dentro de `"scripts"`:

```json
    "db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 2: Criar `prisma/seed.ts`**

```typescript
import { db } from '../src/lib/db';
import quizSource from './seed-data/quiz-source.json';

interface QuizSourceOption {
  ordem: number;
  label: string;
  rawScore: number;
}
interface QuizSourceQuestion {
  ordem: number;
  texto: string;
  options: QuizSourceOption[];
}
interface QuizSourcePillar {
  pillar: string;
  weight: number;
  max: number;
  questions: QuizSourceQuestion[];
}
interface QuizSourceMessage {
  pillar: string;
  level: 'Alto' | 'Moderado' | 'Baixo';
  diagnostico: string;
  recomendacao: string;
}
interface QuizSource {
  scoreDenominator: number;
  pillars: QuizSourcePillar[];
  pillarMessages: QuizSourceMessage[];
}

const source = quizSource as QuizSource;

async function seedScoreRules() {
  for (const p of source.pillars) {
    await db.scoreRule.upsert({
      where: { pillar: p.pillar },
      update: { peso: p.weight, maxDoPilar: p.max, scoreDenominator: source.scoreDenominator },
      create: {
        pillar: p.pillar,
        peso: p.weight,
        maxDoPilar: p.max,
        scoreDenominator: source.scoreDenominator,
      },
    });
  }
  console.log(`ScoreRule: ${source.pillars.length} pilares`);
}

async function seedQuestions() {
  // Idempotente por reset completo — conteúdo de quiz, não dado transacional.
  await db.questionOption.deleteMany({});
  await db.question.deleteMany({});

  let totalQuestions = 0;
  let totalOptions = 0;
  for (let pillarIndex = 0; pillarIndex < source.pillars.length; pillarIndex++) {
    const p = source.pillars[pillarIndex];
    for (const q of p.questions) {
      await db.question.create({
        data: {
          pillar: p.pillar,
          pillarOrdem: pillarIndex + 1,
          ordem: q.ordem,
          texto: q.texto,
          options: {
            create: q.options.map((o) => ({
              label: o.label,
              ordem: o.ordem,
              rawScore: o.rawScore,
            })),
          },
        },
      });
      totalQuestions += 1;
      totalOptions += q.options.length;
    }
  }
  console.log(`Question: ${totalQuestions}, QuestionOption: ${totalOptions}`);
}

async function seedPillarMessages() {
  for (const m of source.pillarMessages) {
    await db.pillarMessage.upsert({
      where: { pillar_level: { pillar: m.pillar, level: m.level } },
      update: { diagnostico: m.diagnostico, recomendacao: m.recomendacao },
      create: {
        pillar: m.pillar,
        level: m.level,
        diagnostico: m.diagnostico,
        recomendacao: m.recomendacao,
      },
    });
  }
  console.log(`PillarMessage: ${source.pillarMessages.length}`);
}

async function seedProducts() {
  await db.product.upsert({
    where: { slug: 'acesso-relatorio' },
    update: {},
    create: {
      slug: 'acesso-relatorio',
      nome: 'Acesso + Relatório de Fertilidade',
      priceCents: 4990,
      kind: 'APP_ACCESS',
      platform: 'KIWIFY',
      platformProductId: 'PLACEHOLDER-acesso-relatorio',
      checkoutUrl: 'https://pay.kiwify.com.br/PLACEHOLDER-acesso-relatorio',
      grants: { entitlement: 'REPORT' },
    },
  });
  console.log('Product: acesso-relatorio');
}

async function main() {
  await seedScoreRules();
  await seedQuestions();
  await seedPillarMessages();
  await seedProducts();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

- [ ] **Step 3: Rodar o seed**

Run: `npm run db:seed`

Expected: quatro linhas de log terminando em algo como:
```
ScoreRule: 13 pilares
Question: 41, QuestionOption: <N>
PillarMessage: 39
Product: acesso-relatorio
```
(o número de `QuestionOption` varia — não precisa bater um valor exato, só ser maior que 41.)

- [ ] **Step 4: Verificar as contagens diretamente no banco**

Run: `docker compose exec postgres psql -U fertilidade -d fertilidade -c "SELECT (SELECT COUNT(*) FROM \"ScoreRule\") sr, (SELECT COUNT(*) FROM \"Question\") q, (SELECT COUNT(*) FROM \"QuestionOption\") qo, (SELECT COUNT(*) FROM \"PillarMessage\") pm, (SELECT COUNT(*) FROM \"Product\") p;"`

Expected: uma linha com `sr=13`, `q=41`, `pm=39`, `p=1` (qo = qualquer número > 41).

- [ ] **Step 5: Rodar o seed de novo pra confirmar idempotência**

Run: `npm run db:seed`

Expected: mesmas contagens da Step 4 (sem duplicar `ScoreRule`/`PillarMessage`/`Product`; `Question`/`QuestionOption` são recriadas do zero mas o total final é o mesmo).

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add idempotent seed for score rules, quiz questions and report product"
```

---

### Task 5: `src/lib/assessment-service.ts` — criação de Assessment

**Files:**
- Create: `src/lib/assessment-service.ts`

**Interfaces:**
- Consumes: `db` (`@/lib/db`), `computePillarScores` (Task 2), `computeAssessment` (Task 1), models `Question`/`QuestionOption`/`ScoreRule`/`Assessment` do Prisma Client (Fase 1 + Task 3).
- Produces: `createAssessment(input): Promise<CreateAssessmentResult>` — usado pelas rotas das Tasks 6 e 7.

- [ ] **Step 1: Criar `src/lib/assessment-service.ts`**

```typescript
import { db } from '@/lib/db';
import { computeAssessment } from '@/lib/scoring';
import { computePillarScores, type AnsweredOption } from '@/lib/scoring-answers';
import type { PillarKey } from '@/types/assessment';

export interface RawAnswer {
  questionId: string;
  optionId: string;
}

export interface AssessmentLead {
  nome: string;
  email: string;
  celular?: string;
  cpf?: string;
}

export interface CreateAssessmentInput {
  source: 'APP_NATIVE' | 'TYPEBOT';
  answers: RawAnswer[];
  lead?: AssessmentLead;
}

export interface CreateAssessmentResult {
  assessmentId: string;
  scoreTotal: number;
  resultadoFinal: number;
  nivelGlobal: 'BAIXA' | 'MODERADA' | 'ALTA';
  pontosAtencao: { pillar: PillarKey; level: 'Alto' | 'Moderado' | 'Baixo' }[];
}

export async function createAssessment(
  input: CreateAssessmentInput
): Promise<CreateAssessmentResult> {
  const optionIds = input.answers.map((a) => a.optionId);

  const options = await db.questionOption.findMany({
    where: { id: { in: optionIds } },
    include: { question: true },
  });

  if (options.length !== optionIds.length) {
    throw new Error('One or more optionId in answers do not exist');
  }

  const answeredOptions: AnsweredOption[] = options.map((o) => ({
    pillar: o.question.pillar as PillarKey,
    rawScore: o.rawScore,
  }));

  const rules = await db.scoreRule.findMany();
  if (rules.length === 0) {
    throw new Error('ScoreRule table is empty — run `npm run db:seed` first');
  }

  const weights = {} as Record<PillarKey, number>;
  for (const r of rules) weights[r.pillar as PillarKey] = r.peso;

  const pillarScores = computePillarScores(answeredOptions, weights);

  const ruleInputs = rules.map((r) => ({
    pillar: r.pillar as PillarKey,
    peso: r.peso,
    maxDoPilar: r.maxDoPilar,
  }));
  const scoreDenominator = rules[0].scoreDenominator;

  const computation = computeAssessment(pillarScores, ruleInputs, scoreDenominator);

  const assessment = await db.assessment.create({
    data: {
      source: input.source,
      leadNome: input.lead?.nome,
      leadEmail: input.lead?.email,
      leadCelular: input.lead?.celular,
      leadCpf: input.lead?.cpf,
      answers: input.answers as unknown as object,
      pillarScores: pillarScores as unknown as object,
      scoreTotal: computation.scoreTotal,
      resultadoFinal: computation.resultadoFinal,
      nivelGlobal: computation.nivelGlobal,
    },
  });

  return {
    assessmentId: assessment.id,
    scoreTotal: computation.scoreTotal,
    resultadoFinal: computation.resultadoFinal,
    nivelGlobal: computation.nivelGlobal,
    pontosAtencao: computation.pontosAtencao,
  };
}
```

- [ ] **Step 2: Verificar que compila e roda contra o banco seedado**

Crie um arquivo temporário `verify-assessment.tmp.ts` na raiz:

```typescript
import { db } from './src/lib/db';
import { createAssessment } from './src/lib/assessment-service';

async function main() {
  const options = await db.questionOption.findMany({ take: 41 });
  const byQuestion = new Map<string, string>();
  for (const o of options) {
    if (!byQuestion.has(o.questionId)) byQuestion.set(o.questionId, o.id);
  }
  const answers = Array.from(byQuestion.entries()).map(([questionId, optionId]) => ({
    questionId,
    optionId,
  }));

  const result = await createAssessment({
    source: 'APP_NATIVE',
    lead: { nome: 'Usuária Teste', email: 'teste@example.com' },
    answers,
  });

  console.log('OK - assessment created:', result.assessmentId, result.nivelGlobal, result.resultadoFinal);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run: `npx tsx verify-assessment.tmp.ts`

Expected: `OK - assessment created: <cuid> <BAIXA|MODERADA|ALTA> <number>`

- [ ] **Step 3: Remover o script temporário**

Run: `rm verify-assessment.tmp.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/assessment-service.ts
git commit -m "feat: add assessment-service to create Assessment from raw answers"
```

---

### Task 6: Rotas `POST /api/assessments` e `GET /api/assessments/[id]`

**Files:**
- Create: `src/app/api/assessments/route.ts`
- Create: `src/app/api/assessments/[id]/route.ts`

**Interfaces:**
- Consumes: `createAssessment` (Task 5), `db` (`@/lib/db`).
- Produces: `POST /api/assessments` (body `{ lead, answers }` → `{ assessmentId, nivelGlobal, resultadoFinal, pontosAtencao }`), `GET /api/assessments/:id` (→ dados do assessment) — consumidos pela Task 8 (páginas `/quiz`, `/resultado`, `/checkout`).

- [ ] **Step 1: Criar `src/app/api/assessments/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAssessment, type RawAnswer, type AssessmentLead } from '@/lib/assessment-service';

interface CreateAssessmentBody {
  lead: AssessmentLead;
  answers: RawAnswer[];
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateAssessmentBody;

  if (!body.lead?.nome || !body.lead?.email) {
    return NextResponse.json({ error: 'lead.nome and lead.email are required' }, { status: 400 });
  }
  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'answers must be a non-empty array' }, { status: 400 });
  }

  try {
    const result = await createAssessment({
      source: 'APP_NATIVE',
      lead: body.lead,
      answers: body.answers,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Criar `src/app/api/assessments/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = await db.assessment.findUnique({ where: { id } });

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: assessment.id,
    leadNome: assessment.leadNome,
    leadEmail: assessment.leadEmail,
    nivelGlobal: assessment.nivelGlobal,
    resultadoFinal: assessment.resultadoFinal,
    pillarScores: assessment.pillarScores,
  });
}
```

- [ ] **Step 3: Testar manualmente com o servidor de dev**

Run: `npm run dev` (em background/outro terminal)

Depois, com o servidor no ar, monte um payload real a partir do banco e teste o POST:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const options = await db.questionOption.findMany();
  const byQuestion = new Map();
  for (const o of options) if (!byQuestion.has(o.questionId)) byQuestion.set(o.questionId, o.id);
  const answers = Array.from(byQuestion.entries()).map(([questionId, optionId]) => ({ questionId, optionId }));
  const body = JSON.stringify({ lead: { nome: 'Teste API', email: 'api@example.com' }, answers });
  const res = await fetch('http://localhost:3000/api/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  console.log(res.status, await res.text());
  await db.\$disconnect();
})();
"
```

Expected: `201` seguido de um JSON com `assessmentId`, `nivelGlobal`, `resultadoFinal`, `pontosAtencao`.

Em seguida, teste o GET substituindo `<ID>` pelo `assessmentId` retornado:

Run: `curl -s http://localhost:3000/api/assessments/<ID>`

Expected: JSON com os mesmos dados do assessment (200).

Pare o servidor de dev depois do teste (`Ctrl+C` no terminal onde rodou `npm run dev`, ou `kill` o processo).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/assessments
git commit -m "feat: add POST /api/assessments and GET /api/assessments/:id routes"
```

> **Nota pós-review final:** `GET /api/assessments/[id]` foi removida depois — o review final de branch inteira da Fase 2 encontrou que ela expunha `leadNome`/`leadEmail` sem autenticação e não era consumida por nenhuma página (Task 8 optou por ler o `Assessment` direto via Server Component em vez de chamar essa rota). Decisão do usuário: remover agora, recriar já com auth quando a Fase 3 existir, se necessário.

---

### Task 7: Rota `POST /api/ingest/typebot`

**Files:**
- Create: `src/app/api/ingest/typebot/route.ts`
- Modify: `.env` (adicionar `INGEST_TOKEN` local)
- Modify: `.env.example` (já tem `INGEST_TOKEN=` vazio da Fase 1 — não precisa mudar)

**Interfaces:**
- Consumes: `createAssessment` (Task 5), `process.env.INGEST_TOKEN`.
- Produces: `POST /api/ingest/typebot`, protegida por header `X-Ingest-Token`. Não é exercitada no vídeo de demo (caminho Typebot fica fora do fluxo gravado), mas precisa existir e funcionar per `docs/03-funil-e-webhooks.md`.

- [ ] **Step 1: Adicionar `INGEST_TOKEN` ao `.env` local**

Adicione ao final do `.env` (arquivo gitignored, não commitado):

```
INGEST_TOKEN=dev-ingest-token-local
```

- [ ] **Step 2: Criar `src/app/api/ingest/typebot/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAssessment, type RawAnswer } from '@/lib/assessment-service';

interface TypebotIngestBody {
  nome: string;
  email: string;
  cpf?: string;
  celular?: string;
  answers: RawAnswer[];
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('X-Ingest-Token');
  if (!token || token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: 'Invalid or missing X-Ingest-Token' }, { status: 401 });
  }

  const body = (await request.json()) as TypebotIngestBody;

  if (!body.nome || !body.email) {
    return NextResponse.json({ error: 'nome and email are required' }, { status: 400 });
  }
  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'answers must be a non-empty array' }, { status: 400 });
  }

  try {
    const result = await createAssessment({
      source: 'TYPEBOT',
      lead: { nome: body.nome, email: body.email, cpf: body.cpf, celular: body.celular },
      answers: body.answers,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 3: Testar manualmente (com e sem token)**

Run: `npm run dev` (background)

Sem token — deve falhar:
Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/ingest/typebot -H "Content-Type: application/json" -d "{}"`
Expected: `401`

Com token errado — deve falhar:
Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/ingest/typebot -H "Content-Type: application/json" -H "X-Ingest-Token: wrong" -d "{}"`
Expected: `401`

Com token correto mas sem `answers` — deve falhar com 400:
Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/ingest/typebot -H "Content-Type: application/json" -H "X-Ingest-Token: dev-ingest-token-local" -d "{\"nome\":\"X\",\"email\":\"x@x.com\"}"`
Expected: `400`

Pare o servidor de dev.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ingest
git commit -m "feat: add POST /api/ingest/typebot route"
```

---

### Task 8: Páginas do funil — Welcome, Captura, Quiz, Resultado, Checkout

**Files:**
- Create: `src/app/welcome/page.tsx`
- Create: `src/app/captura/page.tsx`
- Create: `src/components/screens/QuizFlow.tsx` (novo client component)
- Create: `src/app/quiz/page.tsx`
- Create: `src/app/resultado/page.tsx`
- Create: `src/app/checkout/page.tsx`
- Modify: `src/app/page.tsx` (adicionar link pra `/welcome`)

**Interfaces:**
- Consumes: `WelcomeView`, `CaptureView` (+ `CaptureData`), `QuizQuestionView` (+ `QuizOption`), `ResultTeaserView`, `CheckoutReportView` (todos já existem em `src/components/screens/`), `PILLAR_LABEL` (`@/types/assessment`), `db` (`@/lib/db`).
- Produces: rotas navegáveis `/welcome`, `/captura`, `/quiz`, `/resultado?assessmentId=`, `/checkout?assessmentId=` — o funil completo pro vídeo de demo.

- [ ] **Step 1: Criar `src/app/welcome/page.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { WelcomeView } from '@/components/screens/WelcomeView';

export default function WelcomePage() {
  const router = useRouter();
  return <WelcomeView onStart={() => router.push('/captura')} />;
}
```

- [ ] **Step 2: Criar `src/app/captura/page.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { CaptureView, type CaptureData } from '@/components/screens/CaptureView';

const TOTAL_STEPS = 42; // 1 (captura) + 41 perguntas do quiz

export default function CapturaPage() {
  const router = useRouter();

  function handleSubmit(data: CaptureData) {
    sessionStorage.setItem('leadData', JSON.stringify(data));
    router.push('/quiz');
  }

  return (
    <CaptureView
      currentStep={1}
      totalSteps={TOTAL_STEPS}
      onSubmit={handleSubmit}
      onBack={() => router.push('/welcome')}
    />
  );
}
```

- [ ] **Step 3: Criar `src/components/screens/QuizFlow.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QuizQuestionView, type QuizOption } from '@/components/screens/QuizQuestionView';
import { PILLAR_LABEL, type PillarKey } from '@/types/assessment';
import type { CaptureData } from '@/components/screens/CaptureView';

export interface QuizFlowQuestion {
  id: string;
  pillar: PillarKey;
  texto: string;
  options: QuizOption[];
}

interface QuizFlowProps {
  questions: QuizFlowQuestion[];
}

const TOTAL_STEPS = 42; // 1 (captura, já feita) + 41 perguntas

export function QuizFlow({ questions }: QuizFlowProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const current = questions[index];

  function handleAnswer(optionId: string) {
    const nextAnswers = { ...answers, [current.id]: optionId };
    setAnswers(nextAnswers);

    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }

    void submit(nextAnswers);
  }

  async function submit(finalAnswers: Record<string, string>) {
    setSubmitting(true);

    const leadRaw = sessionStorage.getItem('leadData');
    if (!leadRaw) {
      router.push('/captura');
      return;
    }
    const lead = JSON.parse(leadRaw) as CaptureData;

    const answersPayload = Object.entries(finalAnswers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead, answers: answersPayload }),
    });

    if (!res.ok) {
      setSubmitting(false);
      throw new Error('Failed to create assessment');
    }

    const data = (await res.json()) as { assessmentId: string };
    sessionStorage.removeItem('leadData');
    router.push(`/resultado?assessmentId=${data.assessmentId}`);
  }

  function handleBack() {
    if (index === 0) {
      router.push('/captura');
      return;
    }
    setIndex(index - 1);
  }

  if (submitting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-cream)]">
        <p className="text-sm text-[var(--color-brand-brown)]/60">Calculando seu resultado...</p>
      </div>
    );
  }

  return (
    <QuizQuestionView
      key={current.id}
      question={current.texto}
      options={current.options}
      currentStep={index + 2}
      totalSteps={TOTAL_STEPS}
      pillarLabel={PILLAR_LABEL[current.pillar]}
      onAnswer={handleAnswer}
      onBack={handleBack}
    />
  );
}
```

- [ ] **Step 4: Criar `src/app/quiz/page.tsx`**

```typescript
import { db } from '@/lib/db';
import { QuizFlow, type QuizFlowQuestion } from '@/components/screens/QuizFlow';
import type { PillarKey } from '@/types/assessment';

export default async function QuizPage() {
  const questions = await db.question.findMany({
    orderBy: [{ pillarOrdem: 'asc' }, { ordem: 'asc' }],
    include: { options: { orderBy: { ordem: 'asc' } } },
  });

  const flowQuestions: QuizFlowQuestion[] = questions.map((q) => ({
    id: q.id,
    pillar: q.pillar as PillarKey,
    texto: q.texto,
    options: q.options.map((o) => ({ id: o.id, label: o.label })),
  }));

  return <QuizFlow questions={flowQuestions} />;
}
```

- [ ] **Step 5: Criar `src/app/resultado/page.tsx`**

```typescript
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { computeAssessment } from '@/lib/scoring';
import { ResultTeaserView } from '@/components/screens/ResultTeaserView';
import { PILLAR_LABEL, type NivelGlobal, type PillarKey } from '@/types/assessment';

interface ResultadoPageProps {
  searchParams: Promise<{ assessmentId?: string }>;
}

export default async function ResultadoPage({ searchParams }: ResultadoPageProps) {
  const { assessmentId } = await searchParams;
  if (!assessmentId) redirect('/welcome');

  const assessment = await db.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) redirect('/welcome');

  const rules = await db.scoreRule.findMany();
  const ruleInputs = rules.map((r) => ({
    pillar: r.pillar as PillarKey,
    peso: r.peso,
    maxDoPilar: r.maxDoPilar,
  }));
  const pillarScores = assessment.pillarScores as Record<PillarKey, number>;
  const computation = computeAssessment(pillarScores, ruleInputs, rules[0].scoreDenominator);

  const pontosAtencao = [...computation.pontosAtencao]
    .sort((a, b) => {
      const order = { Baixo: 0, Moderado: 1, Alto: 2 } as const;
      return order[a.level] - order[b.level];
    })
    .slice(0, 2)
    .map((p) => ({ label: PILLAR_LABEL[p.pillar], level: p.level }));

  return (
    <ResultTeaserView
      primeiroNome={assessment.leadNome ?? 'Você'}
      nivelGlobal={assessment.nivelGlobal as NivelGlobal}
      pontosAtencao={pontosAtencao}
      checkoutUrl={`/checkout?assessmentId=${assessment.id}`}
    />
  );
}
```

- [ ] **Step 6: Criar `src/app/checkout/page.tsx`**

```typescript
import { db } from '@/lib/db';
import { CheckoutReportView } from '@/components/screens/CheckoutReportView';
import type { NivelGlobal } from '@/types/assessment';

interface CheckoutPageProps {
  searchParams: Promise<{ assessmentId?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { assessmentId } = await searchParams;

  const [product, assessment] = await Promise.all([
    db.product.findUnique({ where: { slug: 'acesso-relatorio' } }),
    assessmentId ? db.assessment.findUnique({ where: { id: assessmentId } }) : Promise.resolve(null),
  ]);

  if (!product) {
    throw new Error('Product acesso-relatorio not found — run `npm run db:seed`');
  }

  return (
    <CheckoutReportView
      checkoutUrl={product.checkoutUrl}
      primeiroNome={assessment?.leadNome ?? undefined}
      nivelGlobal={(assessment?.nivelGlobal as NivelGlobal | undefined) ?? undefined}
    />
  );
}
```

- [ ] **Step 7: Adicionar link de conveniência em `src/app/page.tsx`**

No array de `Link`s existente em `src/app/page.tsx`, adicione um novo link no topo da lista (antes do primeiro `Preview:`):

```tsx
        <Link
          href="/welcome"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Funil real: Boas-vindas
        </Link>
```

- [ ] **Step 8: Testar o funil completo manualmente no navegador**

Run: `npm run dev`

No navegador, acesse `http://localhost:3000/welcome` e percorra manualmente: clique em "Iniciar diagnóstico gratuito" → preencha nome/e-mail em `/captura` → responda as 41 perguntas em `/quiz` (a barra de progresso deve ir de "2 de 42" até "42 de 42") → confirme que cai em `/resultado?assessmentId=...` mostrando o nível e 2 pontos de atenção → clique no CTA e confirme que abre `/checkout?assessmentId=...` (rota interna, não externa) → confirme que o CTA final desse `/checkout` aponta para a URL do Kiwify (`https://pay.kiwify.com.br/PLACEHOLDER-acesso-relatorio` — inspecione o `href` do botão, não precisa clicar de verdade).

Pare o servidor de dev.

- [ ] **Step 9: Commit**

```bash
git add src/app/welcome src/app/captura src/app/quiz src/app/resultado src/app/checkout src/components/screens/QuizFlow.tsx src/app/page.tsx
git commit -m "feat: wire native quiz funnel (welcome, captura, quiz, resultado, checkout)"
```

---

## Ao final desta fase

O funil nativo completo está navegável de ponta a ponta com dados reais: 41 perguntas reais extraídas do Typebot, motor de score fiel à fórmula original, relatório de nível calculado corretamente, e a usuária pode chegar até a página de checkout do relatório. A Fase 3 (auth demo) constrói o login e dashboard sobre o `Assessment` criado aqui.
