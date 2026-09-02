'use client';

import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { SegmentedProgressBar } from '@/components/ui/SegmentedProgressBar';

export interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestionViewProps {
  question: string;
  options: QuizOption[];
  pillarLabel: string;
  sectionIndex: number;
  totalSections: number;
  /** Preenchimento da seção atual, de 0 a 1 (ex.: questionInSection / questionCount). */
  sectionProgress: number;
  questionNumber: number;
  totalQuestions: number;
  /** Resposta já dada a esta pergunta (voltar); aparece pré-marcada, sem o check animado. */
  selectedOptionId?: string;
  onAnswer: (optionId: string) => void;
  onBack?: () => void;
}

const optionListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const optionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function QuizQuestionView({
  question,
  options,
  pillarLabel,
  sectionIndex,
  totalSections,
  sectionProgress,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  onAnswer,
  onBack,
}: QuizQuestionViewProps) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(id: string) {
    if (selected) return; // evita duplo toque durante a transição
    setSelected(id);
    setTimeout(() => {
      onAnswer(id);
      setSelected(null);
    }, 220);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Header com progresso */}
      <header className="bg-white sticky top-0 z-30 border-b border-[var(--color-border-soft)] px-5 pt-4 pb-3">
        <div className="flex items-center mb-3">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Voltar"
              className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-brand-terracota)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <SegmentedProgressBar
          totalSections={totalSections}
          currentSectionIndex={sectionIndex}
          currentSectionProgress={sectionProgress}
        />

        <div className="flex items-center justify-between mt-2 text-[10px] font-bold text-[var(--color-brand-brown)]/50 uppercase tracking-widest">
          <span>
            {pillarLabel} · pilar {sectionIndex + 1} de {totalSections}
          </span>
          <span>
            pergunta {questionNumber} de {totalQuestions}
          </span>
        </div>
      </header>

      {/* Corpo */}
      <div className="flex-grow px-6 pt-8 pb-10 flex flex-col gap-6">
        {/* Pergunta */}
        <h2 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)] leading-snug">
          {question}
        </h2>

        {/* Opções */}
        <motion.div
          className="flex flex-col gap-3 mt-2"
          variants={reduceMotion ? undefined : optionListVariants}
          initial={reduceMotion ? undefined : 'hidden'}
          animate={reduceMotion ? undefined : 'visible'}
        >
          {options.map((opt) => {
            const isTransitioning = selected === opt.id;
            const isPreMarked = selected === null && selectedOptionId === opt.id;
            const isSelected = isTransitioning || isPreMarked;

            return (
              <motion.button
                key={opt.id}
                variants={reduceMotion ? undefined : optionVariants}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                onClick={() => handleSelect(opt.id)}
                disabled={selected !== null}
                className={`w-full flex items-center justify-between gap-3 text-left px-4 py-4 rounded-xl border text-sm font-medium transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[var(--color-brand-terracota)] border-[var(--color-brand-terracota)] text-white shadow-sm'
                    : 'bg-white border-[var(--color-border-soft)] text-[var(--color-brand-brown)] hover:border-[var(--color-brand-terracota)]/40 hover:bg-[var(--color-brand-terracota)]/5'
                } disabled:cursor-default`}
              >
                <span>{opt.label}</span>
                {isTransitioning && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
