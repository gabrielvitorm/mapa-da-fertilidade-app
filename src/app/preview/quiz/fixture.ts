import type { QuizFlowQuestion } from '@/components/screens/QuizFlow';
import type { PillarKey } from '@/types/assessment';

function opts(...labels: string[]) {
  return labels.map((label, i) => ({ id: `${label}-${i}`.toLowerCase().replace(/\s+/g, '-'), label }));
}

interface PillarFixture {
  pillar: PillarKey;
  perguntas: [string, string];
}

const PILLARS: PillarFixture[] = [
  {
    pillar: 'fatores_infertilidade',
    perguntas: [
      'Você já recebeu algum diagnóstico relacionado à fertilidade?',
      'Há quanto tempo você e seu parceiro(a) tentam engravidar?',
    ],
  },
  {
    pillar: 'saude_hormonal',
    perguntas: [
      'Com que frequência você sente sintomas de TPM intensa?',
      'Você percebe queda de libido nos últimos meses?',
    ],
  },
  {
    pillar: 'ciclo',
    perguntas: [
      'Seu ciclo menstrual costuma ser regular?',
      'Você sente cólicas intensas durante o período menstrual?',
    ],
  },
  {
    pillar: 'sono',
    perguntas: [
      'Como você descreveria a qualidade do seu sono?',
      'Quantas horas você dorme, em média, por noite?',
    ],
  },
  {
    pillar: 'imunidade',
    perguntas: [
      'Com que frequência você fica gripada ou resfriada?',
      'Suas feridas costumam demorar pra cicatrizar?',
    ],
  },
  {
    pillar: 'atividade_fisica',
    perguntas: [
      'Quantas vezes por semana você pratica atividade física?',
      'Como você descreveria seu nível de disposição no dia a dia?',
    ],
  },
  {
    pillar: 'alimentacao',
    perguntas: [
      'Como você avalia sua alimentação na maior parte da semana?',
      'Com que frequência você consome alimentos ultraprocessados?',
    ],
  },
  {
    pillar: 'saude_intestinal',
    perguntas: [
      'Você sente inchaço ou desconforto abdominal com frequência?',
      'Seu intestino funciona de forma regular?',
    ],
  },
  {
    pillar: 'figado',
    perguntas: [
      'Você sente enjoo após refeições gordurosas?',
      'Com que frequência você consome álcool?',
    ],
  },
  {
    pillar: 'estresse',
    perguntas: [
      'Como você avalia o nível de estresse no seu dia a dia?',
      'Você sente que tem tempo para relaxar durante a semana?',
    ],
  },
  {
    pillar: 'tireoide',
    perguntas: [
      'Você já teve alguma alteração na tireoide diagnosticada?',
      'Você sente cansaço extremo mesmo dormindo bem?',
    ],
  },
  {
    pillar: 'toxinas',
    perguntas: [
      'Com que frequência você usa produtos de plástico pra aquecer comida?',
      'Você tem contato frequente com produtos de limpeza fortes?',
    ],
  },
  {
    pillar: 'historico',
    perguntas: [
      'Há histórico de infertilidade na sua família?',
      'Você já passou por alguma cirurgia ginecológica?',
    ],
  },
];

const OPTION_LABELS: [string, string, string, string] = ['Nunca', 'Às vezes', 'Com frequência', 'Sempre'];

export const fixtureQuestions: QuizFlowQuestion[] = PILLARS.flatMap(({ pillar, perguntas }) =>
  perguntas.map((texto, i) => ({
    id: `q-${pillar}-${i + 1}`,
    pillar,
    texto,
    options: opts(...OPTION_LABELS),
  }))
);
