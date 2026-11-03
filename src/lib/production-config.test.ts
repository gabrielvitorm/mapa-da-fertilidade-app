import assert from 'node:assert/strict';
import { validateProductionEnv } from './production-config';

const valid = {
  NODE_ENV: 'production',
  DEMO_MODE: 'false',
  DATABASE_URL: 'postgresql://user:pass@db:5432/app',
  SESSION_SECRET: 'a-long-production-session-secret',
  APP_BASE_URL: 'https://app.example.com',
  SUPPORT_EMAIL: 'suporte@example.com',
  KIWIFY_WEBHOOK_SECRET: 'secret',
  KIWIFY_REPORT_PRODUCT_ID: 'report-id',
  KIWIFY_REPORT_CHECKOUT_URL: 'https://pay.kiwify.com.br/report',
  KIWIFY_CHALLENGE_PRODUCT_ID: 'challenge-id',
  KIWIFY_CHALLENGE_CHECKOUT_URL: 'https://pay.kiwify.com.br/challenge',
  N8N_MAGIC_LINK_WEBHOOK_URL: 'https://n8n.example.com/webhook/magic-link',
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'bucket',
  NEXT_PUBLIC_R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
};

assert.deepEqual(validateProductionEnv(valid), []);
assert.match(validateProductionEnv({ ...valid, DEMO_MODE: 'true' }).join('\n'), /DEMO_MODE/);
assert.match(validateProductionEnv({ ...valid, APP_BASE_URL: 'http://localhost:3000' }).join('\n'), /APP_BASE_URL/);
assert.match(validateProductionEnv({ ...valid, KIWIFY_REPORT_CHECKOUT_URL: 'PLACEHOLDER' }).join('\n'), /KIWIFY_REPORT_CHECKOUT_URL/);

console.log('production-config.test.ts: all assertions passed');
