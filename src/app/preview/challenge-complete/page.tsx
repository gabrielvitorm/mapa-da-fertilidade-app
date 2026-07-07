'use client';

import { ChallengeCompleteView } from '@/components/screens/ChallengeCompleteView';

/**
 * Preview da tela ChallengeCompleteView em duas variantes:
 * - Dia 3 intermediário (18h de cooldown, trilha Raízes)
 * - Dia 7 — conclusão da trilha (trilha Raízes)
 */
export default function ChallengeCompletePreviewPage() {
  return (
    <div className="space-y-12">
      {/* Variante 1: Dia 3 de 7 concluído, 18h de cooldown */}
      <section>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 py-3 border-b border-gray-100">
          Variante 1 — Dia intermediário (Dia 3 · 18h cooldown)
        </p>
        <ChallengeCompleteView
          dayNumber={3}
          totalDays={7}
          nivelGlobal="MODERADA"
          hoursUntilNextDay={18}
          isLastDay={false}
          onBackToTimeline={() => alert('Voltar à jornada (placeholder)')}
        />
      </section>

      {/* Variante 2: Último dia (dia 7) concluído */}
      <section>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 py-3 border-b border-gray-100">
          Variante 2 — Último dia (Dia 7 · Trilha Raízes completa)
        </p>
        <ChallengeCompleteView
          dayNumber={7}
          totalDays={7}
          nivelGlobal="MODERADA"
          hoursUntilNextDay={0}
          isLastDay={true}
          onBackToTimeline={() => alert('Ver minha jornada (placeholder)')}
        />
      </section>
    </div>
  );
}
