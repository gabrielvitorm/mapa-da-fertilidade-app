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

  if (flowQuestions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--color-surface-cream)] px-8 text-center">
        <p className="text-sm font-medium text-[var(--color-brand-brown)]">
          O quiz ainda não está disponível.
        </p>
        <p className="text-xs text-[var(--color-brand-brown)]/60">
          Tente novamente em alguns minutos.
        </p>
      </div>
    );
  }

  return <QuizFlow questions={flowQuestions} />;
}
