/**
 * Tipos de domínio do Checklist da Fertilidade (quiz v2, docs/08).
 *
 * Convive com o modelo legado do Mapa (src/types/assessment.ts): assessments
 * antigos continuam com `quizVersion = MAPA_V1` e são renderizados pelo
 * relatório antigo. Este modelo NÃO calcula porcentagem — cada pilar recebe
 * 0–3 pontos (ou ND/NA) e a soma é só um "total auxiliar" de prioridade.
 */

import type { NivelGlobal } from '@/types/assessment';

export type QuizVersion = 'MAPA_V1' | 'CHECKLIST_V2';

export const CHECKLIST_PILLARS = [
  'idade_tentativa',
  'ciclo_ovulacao',
  'somp',
  'endometriose_pelve',
  'trompas',
  'reserva_ovariana',
  'tireoide',
  'disruptores',
  'figado',
  'intestino',
  'metabolismo_nutricao',
  'metilacao_inflamacao',
  'fator_masculino',
] as const;

export type ChecklistPillarKey = (typeof CHECKLIST_PILLARS)[number];

/** 0 Favorável · 1 Atenção · 2 Investigar · 3 Prioridade alta. */
export type PillarPoints = 0 | 1 | 2 | 3;

/** ND = dado essencial ausente quando já indicado; NA = ainda não indicado. */
export type PillarStatus = PillarPoints | 'ND' | 'NA';

export type ChecklistClassification = 'FAVORAVEL' | 'INTERMEDIARIA' | 'ALTA_PRIORIDADE' | 'INCONCLUSIVA';

export type DataCompleteness = 'SUFICIENTE' | 'PARCIAL' | 'INSUFICIENTE';

/** Respostas indexadas pelo código estável da pergunta → valores das opções marcadas. */
export type ChecklistAnswers = Record<string, string[]>;

export interface ChecklistPillarResult {
  pillar: ChecklistPillarKey;
  status: PillarStatus;
  critical: boolean;
  /**
   * Achados (texto em ChecklistText `finding.<chave>`), do mais para o menos
   * relevante. Achados com 0 pontos são informativos (ex.: progesterona ovulatória).
   */
  findings: { key: string; points: PillarPoints }[];
}

export interface ChecklistComputation {
  pillars: ChecklistPillarResult[];
  /** Soma só dos pilares com 0–3; ND e NA não entram. */
  total: number;
  classification: ChecklistClassification;
  /** Travas de prioridade acionadas (chaves de achado com 3 pontos ou `dois_pilares_criticos`). */
  locks: string[];
  /** Pilares cujo dado essencial está ausente quando a avaliação já é indicada. */
  missingData: ChecklistPillarKey[];
  completeness: DataCompleteness;
  /** Idade × tempo de tentativa já indicam investigação médica da fertilidade. */
  investigationIndicated: boolean;
}

/** Pilares críticos para as travas (manual profissional, "Pilares críticos"). */
export const CRITICAL_PILLARS: readonly ChecklistPillarKey[] = [
  'idade_tentativa',
  'ciclo_ovulacao',
  'endometriose_pelve',
  'trompas',
  'reserva_ovariana',
  'fator_masculino',
];

export const CHECKLIST_PILLAR_LABEL: Record<ChecklistPillarKey, string> = {
  idade_tentativa: 'Idade e tempo de tentativa',
  ciclo_ovulacao: 'Ciclo menstrual e ovulação',
  somp: 'Sinais de SOMP e alterações hormonais',
  endometriose_pelve: 'Endometriose, adenomiose e anatomia pélvica',
  trompas: 'Trompas',
  reserva_ovariana: 'Reserva ovariana',
  tireoide: 'Tireoide',
  disruptores: 'Exposição a disruptores endócrinos',
  figado: 'Saúde hepática',
  intestino: 'Avaliação intestinal',
  metabolismo_nutricao: 'Saúde metabólica e nutricional',
  metilacao_inflamacao: 'Metilação, inflamação e deficiências nutricionais',
  fator_masculino: 'Fator masculino',
};

export const CHECKLIST_PILLAR_SHORT_LABEL: Record<ChecklistPillarKey, string> = {
  idade_tentativa: 'Idade e tentativa',
  ciclo_ovulacao: 'Ciclo e ovulação',
  somp: 'SOMP',
  endometriose_pelve: 'Endometriose e pelve',
  trompas: 'Trompas',
  reserva_ovariana: 'Reserva ovariana',
  tireoide: 'Tireoide',
  disruptores: 'Disruptores',
  figado: 'Fígado',
  intestino: 'Intestino',
  metabolismo_nutricao: 'Metabolismo',
  metilacao_inflamacao: 'Metilação e nutrientes',
  fator_masculino: 'Fator masculino',
};

export const CHECKLIST_PILLAR_INTRO: Record<ChecklistPillarKey, string> = {
  idade_tentativa: 'Vamos começar pela sua idade e pelo tempo de tentativa.',
  ciclo_ovulacao: 'Seu ciclo menstrual é um dos sinais mais importantes da ovulação.',
  somp: 'Agora vamos observar sinais ligados à SOMP e aos hormônios.',
  endometriose_pelve: 'Vamos olhar para dor pélvica e para a anatomia do útero e dos ovários.',
  trompas: 'As trompas são o caminho por onde óvulo e espermatozoide se encontram.',
  reserva_ovariana: 'Agora vamos falar dos exames de reserva ovariana.',
  tireoide: 'A tireoide influencia a ovulação e a gestação.',
  disruptores: 'Vamos observar a sua exposição a disruptores endócrinos no dia a dia.',
  figado: 'O fígado participa do metabolismo dos hormônios.',
  intestino: 'Seu intestino tem papel importante na nutrição e na inflamação.',
  metabolismo_nutricao: 'Peso, composição corporal e alimentação também entram no mapa.',
  metilacao_inflamacao: 'Agora vamos olhar para exames de homocisteína, inflamação e nutrientes.',
  fator_masculino: 'Por fim: a fertilidade é uma avaliação do casal. Vamos falar do seu parceiro.',
};

export const PILLAR_STATUS_LABEL: Record<`${PillarStatus}`, string> = {
  '0': 'Favorável',
  '1': 'Atenção',
  '2': 'Investigar',
  '3': 'Prioridade alta',
  ND: 'Dados insuficientes',
  NA: 'Não aplicável',
};

export const CLASSIFICATION_LABEL: Record<ChecklistClassification, string> = {
  FAVORAVEL: 'Perfil favorável',
  INTERMEDIARIA: 'Perfil intermediário',
  ALTA_PRIORIDADE: 'Alta prioridade',
  INCONCLUSIVA: 'Resultado inconclusivo',
};

export const COMPLETENESS_LABEL: Record<DataCompleteness, string> = {
  SUFICIENTE: 'Suficiente',
  PARCIAL: 'Parcial',
  INSUFICIENTE: 'Insuficiente',
};

/**
 * Trilha do desafio por classificação. A ordem é invertida em relação ao
 * Mapa antigo: "alta prioridade" é quem precisa da trilha mais acolhedora
 * (Semente). Inconclusiva vai para a trilha intermediária.
 */
export const CLASSIFICATION_TO_TRACK: Record<ChecklistClassification, NivelGlobal> = {
  FAVORAVEL: 'ALTA',
  INTERMEDIARIA: 'MODERADA',
  INCONCLUSIVA: 'MODERADA',
  ALTA_PRIORIDADE: 'BAIXA',
};

/** Textos editáveis do relatório (tabela ChecklistText), indexados por chave. */
export type ChecklistTexts = Record<string, { title: string | null; body: string }>;

export interface ChecklistReportPillar {
  key: ChecklistPillarKey;
  label: string;
  status: PillarStatus;
  statusLabel: string;
  critical: boolean;
  findings: { key: string; points: PillarPoints; title: string; body: string }[];
  /** Frase automática do pilar (próximo passo). */
  nextStep: string;
}

export interface ChecklistReport {
  classification: ChecklistClassification;
  classificationLabel: string;
  classificationText: string;
  completeness: DataCompleteness;
  total: number;
  locks: { key: string; title: string; body: string }[];
  /** Pendências essenciais, com o texto ND do pilar (o que fazer para completar). */
  missingData: { key: ChecklistPillarKey; label: string; text: string }[];
  /** Quantos pilares em cada status — base do mapa visual dos 13 pilares. */
  statusCounts: Record<`${PillarStatus}`, number>;
  /** Achados que pontuam (> 0); os informativos ficam de fora da contagem. */
  findingsCount: number;
  priorities: ChecklistReportPillar[];
  favorables: ChecklistReportPillar[];
  pillars: ChecklistReportPillar[];
  closing: string;
  disclaimer: string;
}
