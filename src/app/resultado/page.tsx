import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { computeAssessment } from '@/lib/scoring';
import { buildAssessmentResult } from '@/lib/report-assembly';
import { ResultTeaserView } from '@/components/screens/ResultTeaserView';
import type { RawAnswer } from '@/lib/assessment-service';
import { PILLAR_LABEL, type NivelGlobal, type PillarKey, type PillarLevel } from '@/types/assessment';

interface ResultadoPageProps {
  searchParams: Promise<{ assessmentId?: string }>;
}

const LEVEL_ORDER: Record<PillarLevel, number> = { Baixo: 0, Moderado: 1, Alto: 2 };

export default async function ResultadoPage({ searchParams }: ResultadoPageProps) {
  const { assessmentId } = await searchParams;
  if (!assessmentId) redirect('/welcome');

  const assessment = await db.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) redirect('/welcome');

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
      level: m.level as PillarLevel,
      diagnostico: m.diagnostico,
      recomendacao: m.recomendacao,
    })),
    PILLAR_LABEL
  );

  const piores = [...result.pillars].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]).slice(0, 2);

  // Evidência: dentro de cada pilar em destaque, qual resposta real da usuária
  // puxou o score pra baixo — amarra o diagnóstico à resposta dela, não a um
  // texto genérico compartilhado por todo mundo no mesmo nível.
  const rawAnswers = assessment.answers as unknown as RawAnswer[];
  const answeredOptions = await db.questionOption.findMany({
    where: { id: { in: rawAnswers.map((a) => a.optionId) } },
    include: { question: true },
  });

  function piroresRespostas(pillar: PillarKey) {
    return answeredOptions
      .filter((o) => o.question.pillar === pillar && o.insight)
      .sort((a, b) => a.rawScore - b.rawScore)
      .slice(0, 2)
      .map((o) => ({ pergunta: o.question.texto, resposta: o.label, insight: o.insight! }));
  }

  const pontosAtencao = piores.map((p) => ({
    label: p.label,
    level: p.level,
    diagnostico: p.diagnostico,
    recomendacao: p.recomendacao,
    evidencias: piroresRespostas(p.key),
  }));

  const outrosPilares = result.pillars
    .filter((p) => !pontosAtencao.some((a) => a.label === p.label))
    .map((p) => p.label);

  return (
    <ResultTeaserView
      primeiroNome={assessment.leadNome ?? 'Você'}
      nivelGlobal={assessment.nivelGlobal as NivelGlobal}
      pontosAtencao={pontosAtencao}
      outrosPilares={outrosPilares}
      checkoutUrl={`/checkout?assessmentId=${assessment.id}`}
    />
  );
}
