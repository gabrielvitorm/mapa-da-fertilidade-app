'use client';

import { useState } from 'react';
import { QuizQuestionView } from '@/components/screens/QuizQuestionView';

const PERGUNTAS = [
  {
    pillarLabel: 'Saúde Hormonal',
    question: 'Com que frequência você apresenta sintomas como TPM intensa, inchaço ou mudanças de humor antes da menstruação?',
    options: [
      { id: 'a', label: 'Raramente ou nunca' },
      { id: 'b', label: 'Às vezes (1–2 ciclos por trimestre)' },
      { id: 'c', label: 'Com frequência (a maioria dos ciclos)' },
      { id: 'd', label: 'Sempre e de forma intensa' },
    ],
  },
  {
    pillarLabel: 'Sono',
    question: 'Como você descreveria a qualidade do seu sono na maior parte dos dias?',
    options: [
      { id: 'a', label: 'Excelente — acordo descansada e sem interrupções' },
      { id: 'b', label: 'Boa — durmo bem na maioria das noites' },
      { id: 'c', label: 'Regular — acordo cansada ou tenho dificuldade para dormir' },
      { id: 'd', label: 'Ruim — insônia frequente ou sono não reparador' },
    ],
  },
  {
    pillarLabel: 'Estresse',
    question: 'Como você avalia o nível de estresse no seu dia a dia nos últimos 3 meses?',
    options: [
      { id: 'a', label: 'Baixo — me sinto tranquila na maior parte do tempo' },
      { id: 'b', label: 'Moderado — momentos de tensão mas consigo recuperar' },
      { id: 'c', label: 'Alto — tensão constante com pouco espaço para descansar' },
      { id: 'd', label: 'Muito alto — estou esgotada emocionalmente' },
    ],
  },
];

export default function QuizPerguntaPreviewPage() {
  const [step, setStep] = useState(0);

  const current = PERGUNTAS[step % PERGUNTAS.length];

  return (
    <QuizQuestionView
      question={current.question}
      options={current.options}
      pillarLabel={current.pillarLabel}
      currentStep={step + 1}
      totalSteps={PERGUNTAS.length}
      onAnswer={(id) => {
        console.log(`Pergunta ${step + 1} respondida: opção ${id}`);
        setStep((s) => s + 1);
      }}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
    />
  );
}
