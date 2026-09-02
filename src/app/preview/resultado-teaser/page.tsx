import { ResultTeaserView } from '@/components/screens/ResultTeaserView';

export default function ResultadoTeaserPreviewPage() {
  return (
    <ResultTeaserView
      primeiroNome="Ana"
      nivelGlobal="MODERADA"
      pontosAtencao={[
        {
          label: 'Saúde Hormonal',
          level: 'Moderado',
          diagnostico: 'Sinais de TPM intensa e oscilações de humor indicam desequilíbrio hormonal leve.',
          recomendacao: 'Ajuste de fitoterápicos e uma rotina de sono consistente ajudam a regular o ciclo.',
          evidencias: [
            {
              pergunta: 'Contagem de folículos antrais',
              resposta: '<6',
              insight: 'Poucos folículos antrais indicam reserva ovariana mais limitada para este ciclo.',
            },
          ],
        },
        {
          label: 'Estresse',
          level: 'Baixo',
          diagnostico: 'Tensão constante no dia a dia, com pouco espaço para recuperação.',
          recomendacao: 'Técnicas de respiração guiada e pausas programadas reduzem o cortisol em poucas semanas.',
          evidencias: [
            {
              pergunta: 'Você se sente estressada diariamente?',
              resposta: 'Sempre',
              insight: 'Estresse constante mantém o cortisol cronicamente alto, o que compete diretamente com a progesterona.',
            },
          ],
        },
      ]}
      outrosPilares={[
        'Fatores de Infertilidade',
        'Ciclo Menstrual',
        'Sono',
        'Imunidade',
        'Atividade Física',
        'Alimentação',
        'Saúde Intestinal',
        'Fígado',
        'Tireoide',
        'Toxinas',
        'Histórico',
      ]}
      checkoutUrl="https://pay.kiwify.com.br/exemplo-relatorio"
    />
  );
}
