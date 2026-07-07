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
