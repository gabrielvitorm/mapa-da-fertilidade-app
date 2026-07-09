'use client';

import { useState } from 'react';
import {
  initStepperState,
  goNext,
  goPrevious,
  canGoNext as computeCanGoNext,
  canGoBack as computeCanGoBack,
  isLastStep as computeIsLastStep,
} from './challenge-stepper';

/**
 * Navegação do stepper do desafio: um passo (ChallengeMessage) por vez,
 * controlada pela usuária (Voltar/Próximo), sem delay automático. Lógica
 * pura em `challenge-stepper.ts` — este hook só liga ela ao React state.
 */
export function useChallengeStepper(totalSteps: number, initialIndex = 0) {
  const [state, setState] = useState(() => initStepperState(initialIndex, totalSteps));

  return {
    currentIndex: state.currentIndex,
    maxVisitedIndex: state.maxVisitedIndex,
    next: () => setState((s) => goNext(s, totalSteps)),
    previous: () => setState((s) => goPrevious(s)),
    canGoNext: computeCanGoNext(state, totalSteps),
    canGoBack: computeCanGoBack(state),
    isLastStep: computeIsLastStep(state, totalSteps),
  };
}
