export const metadata = {
  title: 'Política de privacidade | Mapa da Fertilidade',
};

export default function PrivacidadePage() {
  const supportEmail = process.env.SUPPORT_EMAIL ?? 'configure-SUPPORT_EMAIL@seudominio.com';

  return (
    <main className="min-h-screen bg-[var(--color-surface-cream)] px-6 py-10 text-[var(--color-brand-brown)]">
      <article className="mx-auto max-w-2xl space-y-6 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-terracota)]">Mapa da Fertilidade</p>
          <h1 className="mt-2 font-serif text-3xl italic font-bold">Política de privacidade</h1>
          <p className="mt-2 text-xs text-[var(--color-brand-brown)]/60">Versão operacional: 03/11/2026 · revisão jurídica pendente antes do lançamento.</p>
        </div>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="font-bold">Quais dados coletamos</h2>
          <p>Nome, e-mail, telefone opcional e respostas do questionário de fertilidade. As respostas podem conter dados relacionados à saúde.</p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="font-bold">Para que usamos</h2>
          <p>Usamos esses dados para calcular seu mapa, entregar o relatório, liberar produtos comprados e permitir o acompanhamento do desafio dentro do aplicativo.</p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="font-bold">Compartilhamento</h2>
          <p>O pagamento é processado pela plataforma de checkout configurada. Quando habilitado, um serviço de automação de e-mail recebe somente os dados necessários para enviar o link de acesso.</p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="font-bold">Acesso e correção</h2>
          <p>Para solicitar acesso, correção ou esclarecimentos sobre seus dados, escreva para <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="font-bold">Retenção</h2>
          <p>O prazo definitivo de retenção dos assessments e respostas será definido e aprovado pela responsável pelo tratamento antes do lançamento comercial. Até essa aprovação, esta página não deve ser considerada a versão jurídica final.</p>
        </section>
      </article>
    </main>
  );
}
