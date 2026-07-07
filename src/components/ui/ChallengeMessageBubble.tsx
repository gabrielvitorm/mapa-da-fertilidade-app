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

export function ChallengeMessageBubble({ message }: { message: ChallengeMessage }) {
  if (message.tipo === 'TEXTO') {
    return (
      <div className="flex items-start gap-3 animate-fade-in">
        <Avatar />
        <div className="max-w-[85%] bg-white p-4 rounded-xl shadow-xs border border-[var(--color-border-soft)] text-xs text-[var(--color-brand-brown)] leading-relaxed whitespace-pre-line">
          {message.texto}
        </div>
      </div>
    );
  }

  if (message.tipo === 'IMAGEM') {
    return (
      <div className="flex items-start gap-3 animate-fade-in">
        <Avatar emoji="🌱" />
        <div className="max-w-[85%] bg-white p-3 rounded-xl shadow-xs border border-[var(--color-border-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(message.mediaKey)}
            alt={message.texto ?? 'Imagem do desafio'}
            className="w-full aspect-video object-cover rounded-lg border border-[var(--color-border-soft)]"
          />
          {message.texto && (
            <p className="px-1.5 pt-2 text-[11px] leading-relaxed text-[var(--color-brand-brown)]/80 font-medium">
              {message.texto}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.tipo === 'AUDIO') {
    return <AudioBubble message={message} />;
  }

  // VIDEO — usado para a "ASSISTA A AULA N" e o vídeo de boas-vindas.
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--color-border-soft)] shadow-xs group animate-fade-in">
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

function Avatar({ emoji = '🌷' }: { emoji?: string }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] shrink-0 flex items-center justify-center text-xs mt-1 select-none">
      {emoji}
    </div>
  );
}

function AudioBubble({ message }: { message: ChallengeMessage }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <Avatar emoji="🧘" />
      <div className="max-w-[85%] bg-white p-4 rounded-xl shadow-xs border border-[var(--color-border-soft)] space-y-3 flex-1">
        <p className="text-xs font-bold text-[var(--color-brand-terracota)] tracking-tight">
          Mensagem de áudio
        </p>
        <div className="bg-[var(--color-surface-cream)] rounded-lg p-2.5 flex items-center gap-2.5 border border-[var(--color-border-soft)]">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="w-9 h-9 rounded-lg bg-[var(--color-brand-terracota)] text-white flex items-center justify-center active:scale-95 transition-all outline-none"
            aria-label={playing ? 'Pausar áudio' : 'Tocar áudio'}
          >
            {playing ? (
              <Pause className="w-4 h-4 text-white fill-white" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white translate-x-0.5" />
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
    </div>
  );
}
