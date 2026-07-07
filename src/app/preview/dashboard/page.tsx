import { DashboardView } from '@/components/screens/DashboardView';

// Duas variantes para testar: com desafio ativo e sem desafio (upsell)
export default function DashboardPreviewPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Variante 1: tem relatório + desafio em andamento */}
      <div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-2 bg-gray-50">
          Com desafio ativo (Dia 3)
        </p>
        <DashboardView
          primeiroNome="Ana"
          nivelGlobal="MODERADA"
          resultadoFinal={69.5}
          relatorioHref="/preview/relatorio"
          temDesafio
          desafioHref="/preview/desafio"
          progressoDesafio={{ diaAtual: 3 }}
        />
      </div>

      {/* Variante 2: tem relatório, mas ainda não comprou o desafio */}
      <div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-2 bg-gray-50">
          Sem desafio — upsell
        </p>
        <DashboardView
          primeiroNome="Carla"
          nivelGlobal="BAIXA"
          resultadoFinal={44.2}
          relatorioHref="/preview/relatorio"
          temDesafio={false}
          desafioHref="https://pay.kiwify.com.br/exemplo-desafio"
        />
      </div>
    </div>
  );
}
