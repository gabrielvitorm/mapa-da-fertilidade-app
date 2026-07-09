/**
 * Navegação do stepper do desafio (docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md):
 * um `ChallengeMessage` por vez, controlada pela usuária. Pode voltar e
 * avançar livremente entre passos já vistos; só revela um passo novo por
 * vez (nunca pula pra um passo nunca visto).
 *
 * `maxVisitedIndex` é o ponto mais avançado já alcançado na sessão — é o
 * que deve ser persistido pra retomada (não `currentIndex`, que pode
 * diminuir se a usuária voltar antes de sair da tela).
 */
export interface StepperState {
  currentIndex: number;
  maxVisitedIndex: number;
}

export function initStepperState(initialIndex: number, totalSteps: number): StepperState {
  const upperBound = Math.max(0, totalSteps - 1);
  const clamped = Math.min(Math.max(0, initialIndex), upperBound);
  return { currentIndex: clamped, maxVisitedIndex: clamped };
}

export function goNext(state: StepperState, totalSteps: number): StepperState {
  if (state.currentIndex >= totalSteps - 1) return state;
  const currentIndex = state.currentIndex + 1;
  return { currentIndex, maxVisitedIndex: Math.max(state.maxVisitedIndex, currentIndex) };
}

export function goPrevious(state: StepperState): StepperState {
  if (state.currentIndex <= 0) return state;
  return { ...state, currentIndex: state.currentIndex - 1 };
}

export function canGoNext(state: StepperState, totalSteps: number): boolean {
  return state.currentIndex < totalSteps - 1;
}

export function canGoBack(state: StepperState): boolean {
  return state.currentIndex > 0;
}

export function isLastStep(state: StepperState, totalSteps: number): boolean {
  return state.currentIndex === totalSteps - 1;
}
