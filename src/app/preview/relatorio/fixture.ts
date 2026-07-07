import type { AssessmentResult } from '@/types/assessment';
import { PILLAR_LABEL } from '@/types/assessment';

/**
 * Fixture de exemplo para a preview da ReportView.
 * Em produção, este objeto vem do banco (Assessment + cálculo de
 * docs/02-motor-de-score.md), nunca hardcoded como aqui.
 */
export const sampleAssessmentResult: AssessmentResult = {
  scoreTotal: 198,
  resultadoFinal: 69.5,
  nivelGlobal: 'MODERADA',
  pillars: [
    {
      key: 'saude_hormonal',
      label: PILLAR_LABEL.saude_hormonal,
      level: 'Moderado',
      diagnostico: 'Níveis de progesterona levemente abaixo do ideal para o 21º dia do ciclo.',
      recomendacao: 'Aumente o consumo de sementes de abóbora e magnésio para suporte lúteo.',
    },
    {
      key: 'sono',
      label: PILLAR_LABEL.sono,
      level: 'Alto',
      diagnostico: 'Sincronia circadiana excelente, com média de 7h45 de sono profundo.',
      recomendacao: 'Mantenha a janela de sono atual. Continue evitando telas 1h antes de deitar.',
    },
    {
      key: 'estresse',
      label: PILLAR_LABEL.estresse,
      level: 'Baixo',
      diagnostico: 'Cortisol elevado detectado no período matinal, com impacto na ovulação.',
      recomendacao: 'Pratique 10 minutos de respiração diafragmática logo ao acordar.',
    },
    {
      key: 'ciclo',
      label: PILLAR_LABEL.ciclo,
      level: 'Moderado',
      diagnostico: 'Ciclo regular, mas com fase lútea um pouco curta (10 dias).',
      recomendacao: 'Acompanhe a temperatura basal por 2 ciclos para confirmar o padrão.',
    },
    {
      key: 'alimentacao',
      label: PILLAR_LABEL.alimentacao,
      level: 'Moderado',
      diagnostico: 'Baixa ingestão de gorduras boas essenciais à produção hormonal.',
      recomendacao: 'Inclua abacate, azeite e oleaginosas em pelo menos 2 refeições por dia.',
    },
    {
      key: 'figado',
      label: PILLAR_LABEL.figado,
      level: 'Alto',
      diagnostico: 'Boa capacidade de metabolização hormonal indicada pelos hábitos relatados.',
      recomendacao: 'Mantenha a hidratação atual e o consumo regular de vegetais crucíferos.',
    },
    {
      key: 'fatores_infertilidade',
      label: PILLAR_LABEL.fatores_infertilidade,
      level: 'Moderado',
      diagnostico: 'Nenhum fator de risco grave identificado, mas alguns pontos de atenção leve.',
      recomendacao: 'Considere um check-up hormonal completo nos próximos 60 dias.',
    },
    {
      key: 'imunidade',
      label: PILLAR_LABEL.imunidade,
      level: 'Alto',
      diagnostico: 'Sem sinais de inflamação crônica relatados.',
      recomendacao: 'Continue com a rotina atual de descanso e alimentação.',
    },
    {
      key: 'atividade_fisica',
      label: PILLAR_LABEL.atividade_fisica,
      level: 'Moderado',
      diagnostico: 'Atividade física presente, mas irregular ao longo da semana.',
      recomendacao: 'Busque 3 sessões semanais de 30 minutos, priorizando regularidade.',
    },
    {
      key: 'saude_intestinal',
      label: PILLAR_LABEL.saude_intestinal,
      level: 'Baixo',
      diagnostico: 'Sinais de desconforto digestivo frequente relatados no questionário.',
      recomendacao: 'Inicie um diário alimentar simples para identificar gatilhos.',
    },
    {
      key: 'tireoide',
      label: PILLAR_LABEL.tireoide,
      level: 'Moderado',
      diagnostico: 'Sintomas leves compatíveis com função tireoidiana levemente alterada.',
      recomendacao: 'Considere solicitar TSH e T4 livre no próximo check-up.',
    },
    {
      key: 'toxinas',
      label: PILLAR_LABEL.toxinas,
      level: 'Alto',
      diagnostico: 'Baixa exposição relatada a disruptores endócrinos comuns.',
      recomendacao: 'Mantenha os hábitos atuais de escolha de produtos.',
    },
    {
      key: 'historico',
      label: PILLAR_LABEL.historico,
      level: 'Moderado',
      diagnostico: 'Histórico familiar com alguns pontos relevantes a monitorar.',
      recomendacao: 'Compartilhe esse histórico com seu ginecologista no próximo retorno.',
    },
  ],
};
