import { db } from '@/lib/db';
import { CheckoutReportView } from '@/components/screens/CheckoutReportView';
import { SimulatePaymentButton } from '@/components/screens/SimulatePaymentButton';
import type { NivelGlobal } from '@/types/assessment';

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
