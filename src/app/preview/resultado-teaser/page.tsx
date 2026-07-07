import { ResultTeaserView } from '@/components/screens/ResultTeaserView';

export default function ResultadoTeaserPreviewPage() {
  return (
    <ResultTeaserView
      primeiroNome="Ana"
      nivelGlobal="MODERADA"
      pontosAtencao={[
        { label: 'Saúde Hormonal', level: 'Moderado' },
        { label: 'Estresse', level: 'Baixo' },
        { label: 'Saúde Intestinal', level: 'Baixo' },
      ]}
      checkoutUrl="https://pay.kiwify.com.br/exemplo-relatorio"
    />
  );
}
