export const CONSENT_VERSION = 'fertilidade-v1-2026-11-03';

export const CONSENT_TEXT =
  'Autorizo o uso dos dados informados, inclusive informações de saúde, para calcular e entregar meu mapa de fertilidade, conforme a política de privacidade.';

export function hasValidConsent(input: { consentVersion?: string }): boolean {
  return input.consentVersion === CONSENT_VERSION;
}
