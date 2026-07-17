import { CaptureClient } from '@/components/screens/CaptureClient';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function CapturaPage() {
  let questionCount = 0;

  try {
    questionCount = await db.question.count();
  } catch {
    // Sem banco o preview ainda precisa renderizar; nesse caso o progresso
    // da captura cai para o mínimo viável em vez de quebrar a página.
  }

  return <CaptureClient totalSteps={questionCount > 0 ? questionCount + 1 : 1} />;
}
