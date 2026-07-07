/**
 * Tipos de domínio do desafio de 7 dias (alinhados a docs/04-motor-do-desafio.md
 * e ao formato dos seeds/desafio-track-*.json).
 * Substituem os mocks `TIMELINE_DAYS` do protótipo do AI Studio.
 */

export type ChallengeMessageType = 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'VIDEO';

export interface ChallengeMessage {
  ordem: number;
  tipo: ChallengeMessageType;
  texto?: string;
  /** Caminho no R2 (ex.: "desafio/baixa/dia1/7.mp3"). Ausente para TEXTO puro. */
  mediaKey?: string;
  /** Delay em ms antes de revelar esta mensagem (ritmo estilo WhatsApp). */
  delayMs: number;
}

export interface ChallengeDay {
  dayNumber: number; // 0 (onboarding) a 7
  isOnboarding: boolean;
  messages: ChallengeMessage[];
}

export interface ChallengeTrack {
  level: 'BAIXA' | 'MODERADA' | 'ALTA';
  codename: string; // SEMENTE | RAIZES | FLORACAO
  title: string;
  defaultCooldownHours: number;
}

/** Estado de progresso da usuária numa trilha (vem do banco, não mock). */
export interface DayCompletion {
  completedAt: string; // ISO date
}

export interface ChallengeProgress {
  trackLevel: ChallengeTrack['level'];
  currentDay: number;
  dayCompletions: Record<number, DayCompletion>;
}

export type DevolutivaTipo = 'TEXTO' | 'AUDIO' | 'FOTO';

export interface DevolutivaInput {
  dayNumber: number;
  tipo: DevolutivaTipo;
  conteudo?: string; // texto livre
  mediaUrl?: string; // áudio/foto enviados
}
