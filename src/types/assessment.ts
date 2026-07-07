/**
 * Tipos de domínio do assessment (alinhados a docs/02-motor-de-score.md).
 * Substituem os mocks `PillarData`/`PILLARS_DATA` do protótipo do AI Studio.
 */

export type PillarKey =
  | 'fatores_infertilidade'
  | 'saude_hormonal'
  | 'ciclo'
  | 'sono'
  | 'imunidade'
  | 'atividade_fisica'
  | 'alimentacao'
  | 'saude_intestinal'
  | 'figado'
  | 'estresse'
  | 'tireoide'
  | 'toxinas'
  | 'historico';

export type PillarLevel = 'Alto' | 'Moderado' | 'Baixo';
export type NivelGlobal = 'ALTA' | 'MODERADA' | 'BAIXA';

export interface PillarResult {
  key: PillarKey;
  /** Rótulo amigável em PT-BR para exibição (ex.: "Saúde Hormonal"). */
  label: string;
  level: PillarLevel;
  diagnostico: string;
  recomendacao: string;
  /** Conteúdo liberado só após pagamento (entitlement REPORT). */
  locked?: boolean;
}

export interface AssessmentResult {
  scoreTotal: number;
  resultadoFinal: number; // 0–100
  nivelGlobal: NivelGlobal;
  pillars: PillarResult[];
}

/** Rótulos amigáveis por nível global, usados em headers e badges. */
export const NIVEL_GLOBAL_LABEL: Record<NivelGlobal, string> = {
  BAIXA: 'Semente',
  MODERADA: 'Raízes',
  ALTA: 'Floração',
};

export const PILLAR_LABEL: Record<PillarKey, string> = {
  fatores_infertilidade: 'Fatores de Infertilidade',
  saude_hormonal: 'Saúde Hormonal',
  ciclo: 'Ciclo Menstrual',
  sono: 'Sono',
  imunidade: 'Imunidade',
  atividade_fisica: 'Atividade Física',
  alimentacao: 'Alimentação',
  saude_intestinal: 'Saúde Intestinal',
  figado: 'Fígado',
  estresse: 'Estresse',
  tireoide: 'Tireoide',
  toxinas: 'Toxinas',
  historico: 'Histórico',
};
