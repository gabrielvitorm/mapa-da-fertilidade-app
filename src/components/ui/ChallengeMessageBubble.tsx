'use client';

import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { ChallengeMessage } from '@/types/challenge';

/** Resolve a key do R2 para uma URL pública. Ajustar a base no .env real. */
function mediaUrl(mediaKey?: string) {
  if (!mediaKey) return undefined;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? '';
  return `${base}/${mediaKey}`;
}

/**
 * Conteúdo de um passo do desafio — renderiza pelo `tipo` da mensagem.
 * Sem avatar/bolha de chat: é o corpo de um cartão de aula, mostrado um
 * passo por vez pelo stepper
 * (docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md).
 */
export function ChallengeMessageBubble({ message }: { message: ChallengeMessage }) {
  if (message.tipo === 'TEXTO') {
    return (
      <div className="animate-fade-in">
        <p className="text-sm text-[var(--color-brand-brown)] leading-relaxed whitespace-pre-line">
          {message.texto}
        </p>
      </div>
    );
  }

  if (message.tipo === 'IMAGEM') {
    return (
      <div className="animate-fade-in space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(message.mediaKey)}
          alt={message.texto ?? 'Imagem do desafio'}
          className="w-full aspect-video object-cover rounded-xl border border-[var(--color-border-soft)]"
        />
        {message.texto && (
          <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/80 font-medium">
            {message.texto}
          </p>
        )}
      </div>
    );
  }

  if (message.tipo === 'AUDIO') {
    return <AudioContent message={message} />;
  }

  // VIDEO — usado para a "ASSISTA A AULA N" e o vídeo de boas-vindas.
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--color-border-soft)] shadow-xs animate-fade-in">
      <video
        src={mediaUrl(message.mediaKey)}
        controls
        className="w-full h-full object-cover bg-black"
      />
      {message.texto && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded border border-[var(--color-border-soft)] text-[9px] font-bold text-[var(--color-brand-terracota)] uppercase tracking-wider">
          {message.texto}
        </div>
      )}
    </div>
  );
}

function AudioContent({ message }: { message: ChallengeMessage }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="animate-fade-in space-y-3">
      <p className="text-xs font-bold text-[var(--color-brand-terracota)] tracking-tight">
        Mensagem de áudio
      </p>
      <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-[var(--color-border-soft)]">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-11 h-11 rounded-lg bg-[var(--color-brand-terracota)] text-white flex items-center justify-center active:scale-95 transition-all outline-none shrink-0"
          aria-label={playing ? 'Pausar áudio' : 'Tocar áudio'}
        >
          {playing ? (
            <Pause className="w-4.5 h-4.5 text-white fill-white" />
          ) : (
            <Play className="w-4.5 h-4.5 text-white fill-white translate-x-0.5" />
          )}
        </button>
        <div className="flex-grow h-1 bg-[var(--color-border-soft)] rounded overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--color-brand-sage)] rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <audio
        src={mediaUrl(message.mediaKey)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        className="hidden"
      />
    </div>
  );
}
