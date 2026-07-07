'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QuizQuestionView, type QuizOption } from '@/components/screens/QuizQuestionView';
import { PILLAR_LABEL, type PillarKey } from '@/types/assessment';
import type { CaptureData } from '@/components/screens/CaptureView';

export interface QuizFlowQuestion {
  id: string;
  pillar: PillarKey;
  texto: string;
  options: QuizOption[];
}

interface QuizFlowProps {
  questions: QuizFlowQuestion[];
}

const TOTAL_STEPS = 42; // 1 (captura, já feita) + 41 perguntas

export function QuizFlow({ questions }: QuizFlowProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const current = questions[index];

  function handleAnswer(optionId: string) {
    const nextAnswers = { ...answers, [current.id]: optionId };
    setAnswers(nextAnswers);

    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }

    void submit(nextAnswers);
  }

  async function submit(finalAnswers: Record<string, string>) {
    setSubmitting(true);

    const leadRaw = sessionStorage.getItem('leadData');
    if (!leadRaw) {
      router.push('/captura');
      return;
    }
    const lead = JSON.parse(leadRaw) as CaptureData;

    const answersPayload = Object.entries(finalAnswers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead, answers: answersPayload }),
    });

    if (!res.ok) {
      setSubmitting(false);
      throw new Error('Failed to create assessment');
    }

    const data = (await res.json()) as { assessmentId: string };
    sessionStorage.removeItem('leadData');
    router.push(`/resultado?assessmentId=${data.assessmentId}`);
  }

  function handleBack() {
    if (index === 0) {
      router.push('/captura');
      return;
    }
    setIndex(index - 1);
  }

  if (submitting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-cream)]">
        <p className="text-sm text-[var(--color-brand-brown)]/60">Calculando seu resultado...</p>
      </div>
    );
  }

  return (
    <QuizQuestionView
      key={current.id}
      question={current.texto}
      options={current.options}
      currentStep={index + 2}
      totalSteps={TOTAL_STEPS}
      pillarLabel={PILLAR_LABEL[current.pillar]}
      onAnswer={handleAnswer}
      onBack={handleBack}
    />
  );
}
