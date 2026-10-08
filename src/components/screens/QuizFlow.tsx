'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { QuizQuestionView, type QuizOption } from '@/components/screens/QuizQuestionView';
import { PillarIntroView } from '@/components/screens/PillarIntroView';
import { CalculatingView } from '@/components/screens/CalculatingView';
import { buildSections, crossesSectionBoundary, sectionForIndex, type QuizPillarMeta } from '@/lib/quiz-sections';
import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/useQuizPersistence';
import { pillarIcon } from '@/lib/pillar-icons';
import type { CaptureData } from '@/components/screens/CaptureView';

export interface QuizFlowQuestion {
  id: string;
  pillar: string;
  texto: string;
  helpText?: string;
  multiSelect?: boolean;
  options: QuizOption[];
}

interface QuizFlowProps {
  questions: QuizFlowQuestion[];
  /** Rótulos e textos de checkpoint dos pilares da versão servida (quizPillarMeta). */
  pillarMeta: Record<string, QuizPillarMeta>;
}

type Phase = 'question' | 'intro' | 'resume' | 'calculating';
type Direction = 'forward' | 'backward';

const slideVariants = {
  enter: (direction: Direction) => ({ opacity: 0, x: direction === 'forward' ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: Direction) => ({ opacity: 0, x: direction === 'forward' ? -24 : 24 }),
};

export function QuizFlow({ questions, pillarMeta }: QuizFlowProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('question');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [direction, setDirection] = useState<Direction>('forward');
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState(false);

  const sections = useMemo(() => buildSections(questions, pillarMeta), [questions, pillarMeta]);

  useEffect(() => {
    const ids = questions.map((q) => q.id);
    const snapshot = loadQuizProgress(ids);
    if (!snapshot || snapshot.index <= 0) return;

    const hasLead = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('leadData');
    if (!hasLead) {
      router.push('/captura');
      return;
    }

    // Sincroniza com o localStorage (sistema externo) uma única vez, no mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setAnswers(snapshot.answers);
    setIndex(snapshot.index);
    setPhase('resume');
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAnswer(optionIds: string[]) {
    const current = questions[index];
    const nextAnswers = { ...answers, [current.id]: optionIds };
    setAnswers(nextAnswers);

    const nextIndex = index + 1;

    if (nextIndex >= questions.length) {
      void submit(nextAnswers);
      return;
    }

    saveQuizProgress({ answers: nextAnswers, index: nextIndex, updatedAt: Date.now() });
    setDirection('forward');

    if (crossesSectionBoundary(sections, index, nextIndex)) {
      setPendingIndex(nextIndex);
      setPhase('intro');
    } else {
      setIndex(nextIndex);
    }
  }

  function handleIntroContinue() {
    if (pendingIndex !== null) {
      setIndex(pendingIndex);
      setPendingIndex(null);
    }
    setPhase('question');
  }

  function handleBack() {
    if (index === 0) {
      router.push('/captura');
      return;
    }
    setDirection('backward');
    setIndex(index - 1);
    saveQuizProgress({ answers, index: index - 1, updatedAt: Date.now() });
  }

  async function submit(finalAnswers: Record<string, string[]>) {
    setPhase('calculating');
    setSubmitError(false);

    const leadRaw = sessionStorage.getItem('leadData');
    if (!leadRaw) {
      router.push('/captura');
      return;
    }
    const lead = JSON.parse(leadRaw) as CaptureData;

    const answersPayload = Object.entries(finalAnswers).flatMap(([questionId, optionIds]) =>
      optionIds.map((optionId) => ({ questionId, optionId }))
    );

    try {
      const [res] = await Promise.all([
        fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead, answers: answersPayload }),
        }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);

      if (!res.ok) throw new Error('Failed to create assessment');

      const data = (await res.json()) as { assessmentId: string };
      clearQuizProgress();
      sessionStorage.removeItem('leadData');
      router.push(`/resultado?assessmentId=${data.assessmentId}`);
    } catch {
      setSubmitError(true);
    }
  }

  if (phase === 'calculating') {
    return (
      <CalculatingView status={submitError ? 'error' : 'loading'} onRetry={() => void submit(answers)} />
    );
  }

  if (phase === 'resume') {
    const { section } = sectionForIndex(sections, index);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-surface-cream)] px-8 text-center">
        <p className="text-sm text-[var(--color-brand-brown)]/80">
          Você parou na pergunta {index + 1} ({section.shortLabel}).
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={() => setPhase('question')}
            className="rounded-xl bg-[var(--color-brand-terracota)] px-6 py-3 text-sm font-semibold text-white"
          >
            Continuar de onde parou
          </button>
          <button
            type="button"
            onClick={() => {
              clearQuizProgress();
              setAnswers({});
              setIndex(0);
              setPhase('question');
            }}
            className="rounded-xl border border-[var(--color-border-soft)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-brown)]"
          >
            Recomeçar
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'intro' && pendingIndex !== null) {
    const { section, sectionIndex } = sectionForIndex(sections, pendingIndex);
    return (
      <PillarIntroView
        icon={pillarIcon(section.pillar)}
        pillarLabel={section.label}
        pillarNumber={sectionIndex + 1}
        totalPillars={sections.length}
        introText={section.intro}
        onContinue={handleIntroContinue}
      />
    );
  }

  const current = questions[index];
  const { section, sectionIndex, questionInSection } = sectionForIndex(sections, index);

  return (
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={current.id}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
      >
        <QuizQuestionView
          question={current.texto}
          helpText={current.helpText}
          options={current.options}
          multiSelect={current.multiSelect}
          pillarLabel={section.shortLabel}
          sectionIndex={sectionIndex}
          totalSections={sections.length}
          sectionProgress={questionInSection / section.questionCount}
          questionNumber={index + 1}
          totalQuestions={questions.length}
          selectedOptionIds={answers[current.id]}
          onAnswer={handleAnswer}
          onBack={handleBack}
        />
      </motion.div>
    </AnimatePresence>
  );
}
