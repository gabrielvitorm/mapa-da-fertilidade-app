'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestionViewProps {
  question: string;
  options: QuizOption[];
  currentStep: number;
  totalSteps: number;
  /** Rótulo do pilar avaliado nesta pergunta (ex.: "Saúde Hormonal"). */
  pillarLabel?: string;
  onAnswer: (optionId: string) => void;
  onBack?: () => void;
}

export function QuizQuestionView({
  question,
  options,
  currentStep,
  totalSteps,
  pillarLabel,
  onAnswer,
  onBack,
}: QuizQuestionViewProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(id: string) {
    if (selected) return; // evita duplo toque durante a transição
    setSelected(id);
    setTimeout(() => {
      onAnswer(id);
      setSelected(null);
    }, 220);
  }

  const progress = currentStep / totalSteps;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Header com progresso */}
      <header className="bg-white sticky top-0 z-30 border-b border-[var(--color-border-soft)] px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
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

          <span className="text-[10px] font-bold text-[var(--color-brand-brown)]/50 uppercase tracking-widest">
            {currentStep} de {totalSteps}
          </span>

          <div className="w-8" />
        </div>

        {/* Barra de progresso */}
        <div className="h-1.5 rounded-full bg-[var(--color-border-soft)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-brand-terracota)] transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </header>

      {/* Corpo */}
      <div className="flex-grow px-6 pt-8 pb-10 flex flex-col gap-6">
        {/* Pilar (opcional) */}
        {pillarLabel && (
          <span className="inline-block self-start px-3 py-1 rounded-full bg-[var(--color-brand-sage)]/15 text-[var(--color-brand-sage)] text-[10px] font-bold uppercase tracking-wider">
            {pillarLabel}
          </span>
        )}

        {/* Pergunta */}
        <h2 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)] leading-snug">
          {question}
        </h2>

        {/* Opções */}
        <div className="flex flex-col gap-3 mt-2">
          {options.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={selected !== null}
                className={`w-full text-left px-4 py-4 rounded-xl border text-sm font-medium transition-all duration-150 ${
                  isSelected
                    ? 'bg-[var(--color-brand-terracota)] border-[var(--color-brand-terracota)] text-white shadow-sm'
                    : 'bg-white border-[var(--color-border-soft)] text-[var(--color-brand-brown)] hover:border-[var(--color-brand-terracota)]/40 hover:bg-[var(--color-brand-terracota)]/5'
                } disabled:cursor-default`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
