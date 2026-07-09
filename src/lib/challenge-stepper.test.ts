import assert from 'node:assert/strict';
import {
  initStepperState,
  goNext,
  goPrevious,
  canGoNext,
  canGoBack,
  isLastStep,
} from './challenge-stepper';

const TOTAL = 5;

// Estado inicial: começa no índice 0 quando não há progresso salvo
{
  const state = initStepperState(0, TOTAL);
  assert.equal(state.currentIndex, 0);
  assert.equal(state.maxVisitedIndex, 0);
  assert.equal(canGoBack(state), false);
  assert.equal(canGoNext(state, TOTAL), true);
  assert.equal(isLastStep(state, TOTAL), false);
}

// initialIndex além do total de passos é limitado ao último passo válido
{
  const state = initStepperState(99, TOTAL);
  assert.equal(state.currentIndex, TOTAL - 1);
  assert.equal(state.maxVisitedIndex, TOTAL - 1);
}

// goNext avança 1 passo e atualiza maxVisitedIndex
{
  let state = initStepperState(0, TOTAL);
  state = goNext(state, TOTAL);
  assert.equal(state.currentIndex, 1);
  assert.equal(state.maxVisitedIndex, 1);
}

// goNext no último passo não avança além do total
{
  let state = initStepperState(TOTAL - 1, TOTAL);
  state = goNext(state, TOTAL);
  assert.equal(state.currentIndex, TOTAL - 1);
  assert.equal(isLastStep(state, TOTAL), true);
}

// goPrevious volta 1 passo sem alterar maxVisitedIndex (progresso não se perde)
{
  let state = initStepperState(0, TOTAL);
  state = goNext(state, TOTAL);
  state = goNext(state, TOTAL);
  assert.equal(state.currentIndex, 2);
  state = goPrevious(state);
  assert.equal(state.currentIndex, 1);
  assert.equal(state.maxVisitedIndex, 2);
}

// goPrevious no primeiro passo não desce abaixo de 0
{
  let state = initStepperState(0, TOTAL);
  state = goPrevious(state);
  assert.equal(state.currentIndex, 0);
  assert.equal(canGoBack(state), false);
}

// Depois de voltar, dá pra avançar de novo até o ponto mais avançado
{
  let state = initStepperState(0, TOTAL);
  state = goNext(state, TOTAL); // idx 1
  state = goNext(state, TOTAL); // idx 2
  state = goPrevious(state); // idx 1
  state = goNext(state, TOTAL); // idx 2 de novo
  assert.equal(state.currentIndex, 2);
  assert.equal(state.maxVisitedIndex, 2);
}

console.log('challenge-stepper: todos os testes passaram');
