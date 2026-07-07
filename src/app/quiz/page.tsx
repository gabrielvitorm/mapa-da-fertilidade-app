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
