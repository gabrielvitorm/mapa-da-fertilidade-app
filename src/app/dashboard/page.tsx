import { requireSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DashboardView } from '@/components/screens/DashboardView';
import { LogoutButton } from '@/components/screens/LogoutButton';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireSessionUser();

  const assessment = await db.assessment.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!assessment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-cream)] px-6 text-center">
        <p className="text-sm text-[var(--color-brand-brown)]/60">
          Você ainda não tem um diagnóstico. Faça o quiz pra continuar.
        </p>
      </div>
    );
  }

  const entitlements = await db.entitlement.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
  });
  const challengeEntitlement = entitlements.find((e) => e.type === 'CHALLENGE');

  let progressoDesafio: { diaAtual: number } | undefined;
  if (challengeEntitlement) {
    const trackLevel = (challengeEntitlement.metadata as { track?: NivelGlobal } | null)?.track;
    if (trackLevel) {
      const track = await db.challengeTrack.findUnique({ where: { level: trackLevel } });
      if (track) {
        const progress = await db.challengeProgress.findUnique({
          where: { userId_trackId: { userId: user.id, trackId: track.id } },
        });
        if (progress) {
          progressoDesafio = { diaAtual: progress.currentDay };
        }
      }
    }
  }

  return (
    <div>
      <DashboardView
        primeiroNome={user.nome?.split(' ')[0] ?? 'Você'}
        nivelGlobal={assessment.nivelGlobal as NivelGlobal}
        resultadoFinal={assessment.resultadoFinal}
        relatorioHref="/relatorio"
        desafioHref={challengeEntitlement ? '/desafio' : '/desafio/oferta'}
        temDesafio={Boolean(challengeEntitlement)}
        progressoDesafio={progressoDesafio}
      />
      <LogoutButton />
    </div>
  );
}
