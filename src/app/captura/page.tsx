import { CaptureClient } from '@/components/screens/CaptureClient';
import { db } from '@/lib/db';
import { activeQuizVersion } from '@/lib/quiz-version';

export const dynamic = 'force-dynamic';

export default async function CapturaPage() {
  let totalSteps: number | undefined;

  try {
    const questionCount = await db.question.count({ where: { version: activeQuizVersion() } });
    totalSteps = questionCount + 1;
  } catch {
    // Sem banco o preview ainda precisa renderizar; nesse caso o progresso
    // da captura fica sem total explícito em vez de inventar uma contagem.
  }

  return <CaptureClient totalSteps={totalSteps} />;
}
