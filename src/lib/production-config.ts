type Env = Record<string, string | undefined>;

const REQUIRED = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'APP_BASE_URL',
  'SUPPORT_EMAIL',
  'KIWIFY_WEBHOOK_SECRET',
  'KIWIFY_REPORT_PRODUCT_ID',
  'KIWIFY_REPORT_CHECKOUT_URL',
  'KIWIFY_CHALLENGE_PRODUCT_ID',
  'KIWIFY_CHALLENGE_CHECKOUT_URL',
  'N8N_MAGIC_LINK_WEBHOOK_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'NEXT_PUBLIC_R2_PUBLIC_BASE_URL',
] as const;

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes('PLACEHOLDER') || value.includes('configure-');
}

function isHttpsUrl(value: string | undefined): boolean {
  try {
    return value ? new URL(value).protocol === 'https:' : false;
  } catch {
    return false;
  }
}

export function validateProductionEnv(env: Env = process.env): string[] {
  const errors: string[] = [];

  if (env.NODE_ENV !== 'production') errors.push('NODE_ENV must be production');
  if (env.DEMO_MODE !== 'false') errors.push('DEMO_MODE must be false');

  for (const key of REQUIRED) {
    if (isPlaceholder(env[key])) errors.push(`${key} is required and cannot be a placeholder`);
  }

  if (!isHttpsUrl(env.APP_BASE_URL)) errors.push('APP_BASE_URL must be an https URL');
  if (!isHttpsUrl(env.N8N_MAGIC_LINK_WEBHOOK_URL)) errors.push('N8N_MAGIC_LINK_WEBHOOK_URL must be an https URL');
  if (!isHttpsUrl(env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL)) {
    errors.push('NEXT_PUBLIC_R2_PUBLIC_BASE_URL must be an https URL');
  }

  return errors;
}
