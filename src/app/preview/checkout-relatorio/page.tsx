import { CheckoutReportView } from '@/components/screens/CheckoutReportView';

// Duas variantes: com personalização (assessment conhecido) e genérica
export default function CheckoutRelatorioPreviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-2 bg-gray-50">
          Com personalização (nível Moderada)
        </p>
        <CheckoutReportView
          checkoutUrl="https://pay.kiwify.com.br/exemplo-relatorio"
          primeiroNome="Ana"
          nivelGlobal="MODERADA"
        />
      </div>

      <div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-2 bg-gray-50">
          Genérica (sem assessment)
        </p>
        <CheckoutReportView
          checkoutUrl="https://pay.kiwify.com.br/exemplo-relatorio"
        />
      </div>
    </div>
  );
}
