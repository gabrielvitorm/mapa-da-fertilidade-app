'use client';

import { ChallengePlayerView } from '@/components/screens/ChallengePlayerView';
import type { ChallengeDay } from '@/types/challenge';
import trackModerada from '../../../../seeds/desafio-track-moderada.json';

/**
 * Preview que carrega o Dia 1 da trilha Moderada (Raízes) direto do seed real
 * gerado a partir da planilha — prova de que o formato do seed encaixa sem
 * adaptação no componente portado.
 */
export default function ChallengePreviewPage() {
  const day = trackModerada.days.find((d) => d.dayNumber === 1) as ChallengeDay;

  return (
    <ChallengePlayerView
      day={day}
      dayTitle="Dia 1: Mapa das sensibilidades corporais"
      onCompleteDay={() => alert('Dia concluído! (placeholder — vai persistir no backend)')}
      onSubmitDevolutiva={(input) => console.log('Devolutiva enviada:', input)}
    />
  );
}
