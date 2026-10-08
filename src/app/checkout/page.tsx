import { db } from '@/lib/db';
import { CheckoutReportView } from '@/components/screens/CheckoutReportView';
import { SimulatePaymentButton } from '@/components/screens/SimulatePaymentButton';
import type { NivelGlobal } from '@/types/assessment';
import { CHECKLIST_PILLAR_SHORT_LABEL, CLASSIFICATION_LABEL } from '@/types/checklist';

interface CheckoutPageProps {
  searchParams: Promise<{ assessmentId?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { assessmentId } = await searchParams;

  const [product, assessment] = await Promise.all([
    db.product.findUnique({ where: { slug: 'acesso-relatorio' } }),
    assessmentId ? db.assessment.findUnique({ where: { id: assessmentId } }) : Promise.resolve(null),
  ]);

  if (!product) {
    throw new Error('Product acesso-relatorio not found — run `npm run db:seed`');
  }

  return (
    <div>
      <CheckoutReportView
        checkoutUrl={product.checkoutUrl}
        primeiroNome={assessment?.leadNome ?? undefined}
        nivelGlobal={(assessment?.nivelGlobal as NivelGlobal | undefined) ?? undefined}
        checklist={
          assessment?.classification
            ? {
                perfilLabel: CLASSIFICATION_LABEL[assessment.classification],
                pilaresDestaque: [
                  CHECKLIST_PILLAR_SHORT_LABEL.ciclo_ovulacao,
                  CHECKLIST_PILLAR_SHORT_LABEL.reserva_ovariana,
                  CHECKLIST_PILLAR_SHORT_LABEL.trompas,
                  CHECKLIST_PILLAR_SHORT_LABEL.somp,
                  CHECKLIST_PILLAR_SHORT_LABEL.tireoide,
                  CHECKLIST_PILLAR_SHORT_LABEL.fator_masculino,
                ],
              }
            : undefined
        }
      />
      {process.env.DEMO_MODE === 'true' && assessment?.leadEmail && (
        <div className="px-6 pb-10">
          <SimulatePaymentButton
            email={assessment.leadEmail}
            nome={assessment.leadNome ?? undefined}
            productSlug="acesso-relatorio"
          />
        </div>
      )}
    </div>
  );
}
