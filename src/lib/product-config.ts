export interface ProductConfig {
  report: { platformProductId: string; checkoutUrl: string };
  challenge: { platformProductId: string; checkoutUrl: string };
}

type ProductEnv = Record<string, string | undefined>;

function isDemo(env: ProductEnv): boolean {
  return env.DEMO_MODE === 'true' && env.NODE_ENV !== 'production';
}

function requireRealValue(value: string | undefined, name: string, env: ProductEnv): string {
  if (value && !value.includes('PLACEHOLDER')) return value;
  if (isDemo(env)) return `demo-${name.toLowerCase().replaceAll('_', '-')}`;
  throw new Error(`Kiwify product configuration is required: ${name}`);
}

export function getProductConfig(env: ProductEnv = process.env): ProductConfig {
  const reportId = requireRealValue(env.KIWIFY_REPORT_PRODUCT_ID, 'KIWIFY_REPORT_PRODUCT_ID', env);
  const reportUrl = env.KIWIFY_REPORT_CHECKOUT_URL && !env.KIWIFY_REPORT_CHECKOUT_URL.includes('PLACEHOLDER')
    ? env.KIWIFY_REPORT_CHECKOUT_URL
    : isDemo(env)
      ? 'https://pay.kiwify.com.br/demo-acesso-relatorio'
      : requireRealValue(undefined, 'KIWIFY_REPORT_CHECKOUT_URL', env);
  const challengeId = requireRealValue(env.KIWIFY_CHALLENGE_PRODUCT_ID, 'KIWIFY_CHALLENGE_PRODUCT_ID', env);
  const challengeUrl = env.KIWIFY_CHALLENGE_CHECKOUT_URL && !env.KIWIFY_CHALLENGE_CHECKOUT_URL.includes('PLACEHOLDER')
    ? env.KIWIFY_CHALLENGE_CHECKOUT_URL
    : isDemo(env)
      ? 'https://pay.kiwify.com.br/demo-desafio-7-dias'
      : requireRealValue(undefined, 'KIWIFY_CHALLENGE_CHECKOUT_URL', env);

  return {
    report: { platformProductId: reportId, checkoutUrl: reportUrl },
    challenge: { platformProductId: challengeId, checkoutUrl: challengeUrl },
  };
}
