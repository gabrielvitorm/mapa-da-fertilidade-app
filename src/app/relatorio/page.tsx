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
