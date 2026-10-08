import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { computeAssessment } from '@/lib/scoring';
import { computePillarScores, type AnsweredOption } from '@/lib/scoring-answers';
import { computeChecklist } from '@/lib/checklist-scoring';
import {
  toChecklistAnswers,
  validateChecklistSelection,
  type ChecklistStoredAnswer,
} from '@/lib/checklist-answers';
import type { PillarKey } from '@/types/assessment';
import { CLASSIFICATION_TO_TRACK, type ChecklistClassification, type QuizVersion } from '@/types/checklist';

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
  /** No Checklist v2, perguntas de múltipla escolha geram uma entrada por opção marcada. */
  answers: RawAnswer[];
  lead?: AssessmentLead;
}

export interface CreateAssessmentResult {
  assessmentId: string;
  quizVersion: QuizVersion;
  scoreTotal: number;
  resultadoFinal: number | null;
  nivelGlobal: 'BAIXA' | 'MODERADA' | 'ALTA';
  classification?: ChecklistClassification;
  pontosAtencao?: { pillar: PillarKey; level: 'Alto' | 'Moderado' | 'Baixo' }[];
}

/**
 * Cria o Assessment recalculando tudo a partir das respostas cruas. A versão
 * do quiz é deduzida das opções enviadas — assim o Typebot (Mapa v1) e o quiz
 * nativo (Checklist v2) compartilham a mesma porta de ingestão.
 */
export async function createAssessment(input: CreateAssessmentInput): Promise<CreateAssessmentResult> {
  const optionIds = [...new Set(input.answers.map((a) => a.optionId))];

  const options = await db.questionOption.findMany({
    where: { id: { in: optionIds } },
    include: { question: true },
  });

  if (options.length !== optionIds.length) {
    throw new Error('One or more optionId in answers do not exist');
  }
  for (const a of input.answers) {
    const option = options.find((o) => o.id === a.optionId);
    if (option?.questionId !== a.questionId) {
      throw new Error(`optionId ${a.optionId} does not belong to questionId ${a.questionId}`);
    }
  }

  const versions = new Set(options.map((o) => o.question.version));
  if (versions.size !== 1) {
    throw new Error('Answers mix questions from different quiz versions');
  }

  return versions.has('CHECKLIST_V2')
    ? createChecklistAssessment(input, options)
    : createMapaAssessment(input, options);
}

type OptionWithQuestion = Prisma.QuestionOptionGetPayload<{ include: { question: true } }>;

async function createChecklistAssessment(
  input: CreateAssessmentInput,
  options: OptionWithQuestion[]
): Promise<CreateAssessmentResult> {
  const questions = await db.question.findMany({
    where: { version: 'CHECKLIST_V2' },
    include: { options: true },
  });

  const error = validateChecklistSelection(
    questions.map((q) => ({
      id: q.id,
      code: q.code ?? q.id,
      multiSelect: q.multiSelect,
      options: q.options.map((o) => ({ id: o.id, exclusive: o.exclusive })),
    })),
    input.answers
  );
  if (error) throw new Error(error);

  const stored: ChecklistStoredAnswer[] = input.answers.map((a) => {
    const option = options.find((o) => o.id === a.optionId)!;
    if (!option.question.code || !option.value) {
      throw new Error(`Checklist option ${option.id} is missing code/value — run npm run db:seed`);
    }
    return { questionId: a.questionId, optionId: a.optionId, questionCode: option.question.code, value: option.value };
  });

  const computation = computeChecklist(toChecklistAnswers(stored));
  const nivelGlobal = CLASSIFICATION_TO_TRACK[computation.classification];
  const pillarScores = Object.fromEntries(computation.pillars.map((p) => [p.pillar, p.status]));

  const assessment = await db.assessment.create({
    data: {
      source: input.source,
      quizVersion: 'CHECKLIST_V2',
      leadNome: input.lead?.nome,
      leadEmail: input.lead?.email,
      leadCelular: input.lead?.celular,
      leadCpf: input.lead?.cpf,
      answers: stored as unknown as object,
      pillarScores,
      scoreTotal: computation.total,
      resultadoFinal: null,
      nivelGlobal,
      classification: computation.classification,
      checklistResult: computation as unknown as object,
    },
  });

  return {
    assessmentId: assessment.id,
    quizVersion: 'CHECKLIST_V2',
    scoreTotal: computation.total,
    resultadoFinal: null,
    nivelGlobal,
    classification: computation.classification,
  };
}

async function createMapaAssessment(
  input: CreateAssessmentInput,
  options: OptionWithQuestion[]
): Promise<CreateAssessmentResult> {
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
      quizVersion: 'MAPA_V1',
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
    quizVersion: 'MAPA_V1',
    scoreTotal: computation.scoreTotal,
    resultadoFinal: computation.resultadoFinal,
    nivelGlobal: computation.nivelGlobal,
    pontosAtencao: computation.pontosAtencao,
  };
}
