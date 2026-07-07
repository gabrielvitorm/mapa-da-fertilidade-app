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
