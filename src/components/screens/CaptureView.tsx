'use client';

import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

export interface CaptureData {
  nome: string;
  email: string;
  celular?: string;
}

interface CaptureViewProps {
  currentStep: number;
  totalSteps: number;
  onSubmit: (data: CaptureData) => void;
  onBack?: () => void;
}

export function CaptureView({ currentStep, totalSteps, onSubmit, onBack }: CaptureViewProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [touched, setTouched] = useState({ nome: false, email: false });

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const podeEnviar = nome.trim().length >= 2 && emailValido;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ nome: true, email: true });
    if (!podeEnviar) return;
    onSubmit({ nome: nome.trim(), email: email.trim(), celular: celular.trim() || undefined });
  }

  const progress = currentStep / totalSteps;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Header com progresso — mesmo padrão do QuizQuestionView */}
      <header className="bg-white sticky top-0 z-30 border-b border-[var(--color-border-soft)] px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Voltar"
              className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-brand-terracota)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}

          <span className="text-[10px] font-bold text-[var(--color-brand-brown)]/50 uppercase tracking-widest">
            {currentStep} de {totalSteps}
          </span>

          <div className="w-8" />
        </div>

        <div className="h-1.5 rounded-full bg-[var(--color-border-soft)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-brand-terracota)] transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </header>

      {/* Corpo */}
      <form onSubmit={handleSubmit} noValidate className="flex-grow flex flex-col px-6 pt-8 pb-10 gap-6">
        {/* Headline */}
        <div className="flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-terracota)]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[var(--color-brand-terracota)]" />
          </div>
          <h2 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)] leading-snug">
            Quase lá! Para onde enviamos seu resultado?
          </h2>
          <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/65">
            Seu diagnóstico é personalizado — precisamos saber para quem estamos preparando.
          </p>
        </div>

        {/* Campos */}
        <div className="flex flex-col gap-4">
          <Field
            label="Seu nome"
            required
            error={touched.nome && nome.trim().length < 2 ? 'Informe pelo menos 2 caracteres' : undefined}
          >
            <input
              type="text"
              autoComplete="given-name"
              placeholder="Como posso te chamar?"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, nome: true }))}
              className={inputClass(touched.nome && nome.trim().length < 2)}
            />
          </Field>

          <Field
            label="E-mail"
            required
            error={touched.email && !emailValido ? 'Informe um e-mail válido' : undefined}
          >
            <input
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={inputClass(touched.email && !emailValido)}
            />
          </Field>

          <Field label="WhatsApp" hint="Opcional">
            <input
              type="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className={inputClass(false)}
            />
          </Field>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <button
            type="submit"
            disabled={!podeEnviar}
            className="w-full py-4 bg-[var(--color-brand-terracota)] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-opacity"
          >
            Ver meu resultado
          </button>
          <p className="text-center text-[10px] text-[var(--color-brand-brown)]/40 leading-relaxed">
            Seus dados ficam seguros e não são compartilhados com terceiros.
          </p>
        </div>
      </form>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    'w-full px-4 py-3 rounded-xl border text-sm bg-white text-[var(--color-brand-brown)]',
    'placeholder:text-[var(--color-brand-brown)]/35 outline-none transition-colors',
    hasError
      ? 'border-red-300 focus:border-red-400'
      : 'border-[var(--color-border-soft)] focus:border-[var(--color-brand-terracota)]/60',
  ].join(' ');
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-bold text-[var(--color-brand-brown)]">{label}</label>
        {required && (
          <span className="text-[var(--color-brand-terracota)] text-xs leading-none">*</span>
        )}
        {hint && (
          <span className="text-[10px] text-[var(--color-brand-brown)]/40 ml-auto">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p className="text-[10px] text-red-500 leading-none animate-fade-in">{error}</p>
      )}
    </div>
  );
}
