import { db } from '@/lib/db';
import { QuizFlow, type QuizFlowQuestion } from '@/components/screens/QuizFlow';
import type { PillarKey } from '@/types/assessment';

// Sem isso, o Next.js pré-renderiza esta página como estática no build,
// congelando as perguntas no snapshot do momento do build em vez de buscá-las
// do banco a cada request (quebra se o seed rodar depois do build, como na Fase 7/Docker).
export const dynamic = 'force-dynamic';

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
