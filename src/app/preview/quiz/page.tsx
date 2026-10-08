'use client';

import { useEffect, useState } from 'react';
import { QuizFlow } from '@/components/screens/QuizFlow';
import { quizPillarMeta } from '@/lib/quiz-sections';
import { fixtureQuestions } from './fixture';

export default function QuizPreviewPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Preenche leadData pra chegar até a CalculatingView sem passar por /captura.
    // O POST final falha (perguntas do fixture não existem no banco) — dá pra
    // validar visualmente o estado de erro + "Tentar novamente" da tela de cálculo.
    sessionStorage.setItem('leadData', JSON.stringify({ nome: 'Preview', email: 'preview@example.com' }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  if (!ready) return null;

  return <QuizFlow questions={fixtureQuestions} pillarMeta={quizPillarMeta('CHECKLIST_V2')} />;
}
