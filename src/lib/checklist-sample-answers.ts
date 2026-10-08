import type { ChecklistAnswers } from '@/types/checklist';

/**
 * Respostas de referência do Checklist v2 — usadas nos testes do motor, no
 * usuário demo do seed e na página /preview/relatorio-checklist.
 */

/** Perfil sem nenhum achado: < 35 anos, < 6 meses de tentativa, exames normais. */
export const FAVORABLE_ANSWERS: ChecklistAnswers = {
  idade: ['lt35'],
  tempo_tentativa: ['lt6'],
  ciclo_duracao: ['21_35'],
  amenorreia_90: ['nao'],
  sangramento: ['nenhum'],
  sinais_ovulacao: ['muco', 'lh_pico'],
  progesterona: ['nao'],
  sintomas_hormonais: ['nao'],
  sinais_androgenicos: ['nenhum'],
  exames_somp: ['nenhum'],
  diagnostico_somp: ['nao'],
  dor_pelvica: ['nenhum'],
  achados_pelvicos: ['nenhum'],
  avaliacao_trompas: ['pervias'],
  riscos_trompas: ['nenhum'],
  amh: ['1_5_4'],
  cfa: ['gte8'],
  fsh: ['lt10'],
  historico_ovariano: ['nenhum'],
  tireoide_condicao: ['nao'],
  tireoide_extra: ['nenhum'],
  exposicao_domestica: ['nenhum'],
  exposicao_relevante: ['nenhum'],
  figado_exames: ['nenhum'],
  figado_sinais: ['nenhum'],
  sintomas_intestinais: ['nenhum'],
  frequencia_intestinal: ['nao_tenho'],
  condicoes_intestinais: ['nenhum'],
  peso_variacao: ['nao'],
  estado_nutricional: ['adequado'],
  comportamento_alimentar: ['nenhum'],
  cafeina: ['ate_200'],
  homocisteina: ['ate_8'],
  deficiencias: ['nenhuma'],
  inflamacao: ['normais'],
  parceiro_idade: ['lt40'],
  espermograma: ['normal'],
  fragmentacao: ['nao'],
  riscos_masculinos: ['nenhum'],
};

/**
 * Perfil intermediário típico (usuário demo): 6–11 meses de tentativa, alguns
 * hábitos a ajustar, sem travas nem dados essenciais pendentes.
 */
export const INTERMEDIATE_ANSWERS: ChecklistAnswers = {
  ...FAVORABLE_ANSWERS,
  tempo_tentativa: ['6_11'],
  avaliacao_trompas: ['nao'],
  amh: ['nao'],
  cfa: ['nao'],
  fsh: ['nao'],
  sinais_androgenicos: ['acne'],
  exposicao_domestica: ['aquece_plastico', 'embalagem_quente'],
  figado_sinais: ['enxaqueca'],
  sintomas_intestinais: ['estufamento', 'gases'],
  frequencia_intestinal: ['ocasional'],
  cafeina: ['acima_200'],
  homocisteina: ['nao'],
  deficiencias: ['vit_d'],
  inflamacao: ['nao'],
};
