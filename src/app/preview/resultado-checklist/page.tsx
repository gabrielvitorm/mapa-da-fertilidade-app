import { ChecklistTeaserView } from '@/components/screens/ChecklistTeaserView';
import { sampleChecklistReport } from '../relatorio-checklist/fixture';

/** Preview do teaser do Checklist v2: ?perfil=favoravel|intermediario|alta|inconclusivo */
export default async function ResultadoChecklistPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string }>;
}) {
  const { perfil } = await searchParams;
  return (
    <ChecklistTeaserView
      primeiroNome="Ana"
      report={sampleChecklistReport(perfil)}
      checkoutUrl="https://pay.kiwify.com.br/exemplo-relatorio"
    />
  );
}
