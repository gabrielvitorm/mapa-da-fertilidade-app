import type { Assessment } from '@prisma/client';
import { db } from '@/lib/db';
import { computeAssessment, type ScoreRuleInput } from '@/lib/scoring';
import { buildAssessmentResult } from '@/lib/report-assembly';
import { computeChecklist } from '@/lib/checklist-scoring';
import { toChecklistAnswers, type ChecklistStoredAnswer } from '@/lib/checklist-answers';
import { buildChecklistReport } from '@/lib/checklist-report';
import { PILLAR_LABEL, type AssessmentResult, type PillarKey } from '@/types/assessment';
import type { ChecklistReport, ChecklistTexts } from '@/types/checklist';

type PillarMessageInput = {
  pillar: PillarKey;
  level: 'Alto' | 'Moderado' | 'Baixo';
  diagnostico: string;
  recomendacao: string;
};

export type ReportData =
  | { version: 'MAPA_V1'; result: AssessmentResult }
  | { version: 'CHECKLIST_V2'; report: ChecklistReport };

export async function loadReportData(userId: string): Promise<ReportData | null> {
  const assessment = await db.assessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!assessment) {
    return null;
  }

  if (assessment.quizVersion === 'CHECKLIST_V2') {
    return { version: 'CHECKLIST_V2', report: await loadChecklistReport(assessment) };
  }
  return { version: 'MAPA_V1', result: await loadMapaResult(assessment) };
}

export async function loadChecklistTexts(): Promise<ChecklistTexts> {
  const rows = await db.checklistText.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, { title: r.title, body: r.body }]));
}

/** Recalcula a partir das respostas: regras e textos atualizados valem também para relatórios antigos. */
export async function loadChecklistReport(assessment: Pick<Assessment, 'answers'>): Promise<ChecklistReport> {
  const answers = toChecklistAnswers(assessment.answers as unknown as ChecklistStoredAnswer[]);
  return buildChecklistReport(computeChecklist(answers), await loadChecklistTexts());
}

async function loadMapaResult(assessment: Assessment): Promise<AssessmentResult> {
  const rules = await db.scoreRule.findMany();
  const pillarMessages = await db.pillarMessage.findMany();

  const ruleInputs: ScoreRuleInput[] = rules.map((rule) => ({
    pillar: rule.pillar as PillarKey,
    peso: rule.peso,
    maxDoPilar: rule.maxDoPilar,
  }));

  const pillarScores = assessment.pillarScores as Record<PillarKey, number>;
  const computation = computeAssessment(pillarScores, ruleInputs, rules[0].scoreDenominator);

  return buildAssessmentResult(
    computation,
    pillarScores,
    ruleInputs,
    pillarMessages.map((message): PillarMessageInput => ({
      pillar: message.pillar as PillarKey,
      level: message.level,
      diagnostico: message.diagnostico,
      recomendacao: message.recomendacao,
    })),
    PILLAR_LABEL
  );
}
