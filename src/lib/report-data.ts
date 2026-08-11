import { db } from '@/lib/db';
import { computeAssessment, type ScoreRuleInput } from '@/lib/scoring';
import { buildAssessmentResult } from '@/lib/report-assembly';
import { PILLAR_LABEL, type AssessmentResult, type PillarKey } from '@/types/assessment';

type PillarMessageInput = {
  pillar: PillarKey;
  level: 'Alto' | 'Moderado' | 'Baixo';
  diagnostico: string;
  recomendacao: string;
};

export async function loadReportData(userId: string): Promise<AssessmentResult | null> {
  const assessment = await db.assessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!assessment) {
    return null;
  }

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
