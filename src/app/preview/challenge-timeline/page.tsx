'use client';

import { ChallengeTimelineView } from '@/components/screens/ChallengeTimelineView';
import type { ChallengeProgress, ChallengeTrack } from '@/types/challenge';

/**
 * Preview da tela de jornada (timeline de dias do desafio).
 *
 * Cenário simulado:
 * - Trilha Raízes (Moderada), cooldown de 20 h
 * - Dias 0 e 1 concluídos ontem (> 20 h atrás) → Dia 2 desbloqueado
 * - Dias 3–7 bloqueados (dia anterior não concluído)
 */

const TRACK: ChallengeTrack = {
  level: 'MODERADA',
  codename: 'RAIZES',
  title: 'Trilha Raízes',
  defaultCooldownHours: 20,
};

const DAYS = [
  { dayNumber: 0, title: 'Boas-vindas ao desafio' },
  { dayNumber: 1, title: 'Mapa das sensibilidades corporais' },
  { dayNumber: 2, title: 'Ritmo circadiano e fertilidade' },
  { dayNumber: 3, title: 'Alimentação anti-inflamatória' },
  { dayNumber: 4, title: 'Movimento e ciclo menstrual' },
  { dayNumber: 5, title: 'Intestino, fígado e hormônios' },
  { dayNumber: 6, title: 'Estresse, cortisol e ciclo' },
  { dayNumber: 7, title: 'Integrando tudo: seu plano pessoal' },
];

// Dias 0 e 1 concluídos há 25 horas (cooldown de 20 h já passou → Dia 2 aberto)
const agora = new Date();
const veinteCincoHorasAtras = new Date(agora.getTime() - 25 * 60 * 60 * 1000).toISOString();

const PROGRESS: ChallengeProgress = {
  trackLevel: 'MODERADA',
  currentDay: 2,
  dayCompletions: {
    0: { completedAt: veinteCincoHorasAtras },
    1: { completedAt: veinteCincoHorasAtras },
  },
};

export default function ChallengeTimelinePreviewPage() {
  return (
    <ChallengeTimelineView
      track={TRACK}
      days={DAYS}
      progress={PROGRESS}
      onSelectDay={(day) => alert(`Abrir dia ${day}`)}
      onBack={() => alert('Voltar ao dashboard')}
    />
  );
}
