import { ChallengeOfferView } from '@/components/screens/ChallengeOfferView';

// Duas variantes: com personalização (nível Moderada) e genérica
export default function ChallengeOfferPreviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-2 bg-gray-50">
          Com personalização (nível Moderada)
        </p>
        <ChallengeOfferView
          checkoutUrl="https://pay.kiwify.com.br/exemplo-desafio"
          nivelGlobal="MODERADA"
          primeiroNome="Ana"
        />
      </div>

      <div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-2 bg-gray-50">
          Genérica (sem personalização)
        </p>
        <ChallengeOfferView
          checkoutUrl="https://pay.kiwify.com.br/exemplo-desafio"
        />
      </div>
    </div>
  );
}
