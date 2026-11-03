import assert from 'node:assert/strict';
import { getProductConfig } from './product-config';

const configured = getProductConfig({
  NODE_ENV: 'production',
  DEMO_MODE: 'false',
  KIWIFY_REPORT_PRODUCT_ID: 'real-report-id',
  KIWIFY_REPORT_CHECKOUT_URL: 'https://pay.kiwify.com.br/report',
  KIWIFY_CHALLENGE_PRODUCT_ID: 'real-challenge-id',
  KIWIFY_CHALLENGE_CHECKOUT_URL: 'https://pay.kiwify.com.br/challenge',
});
assert.equal(configured.report.platformProductId, 'real-report-id');
assert.equal(configured.challenge.checkoutUrl, 'https://pay.kiwify.com.br/challenge');

assert.throws(
  () => getProductConfig({ NODE_ENV: 'production', DEMO_MODE: 'false' }),
  /Kiwify product configuration is required/
);

const demo = getProductConfig({ NODE_ENV: 'development', DEMO_MODE: 'true' });
assert.match(demo.report.checkoutUrl, /^https:\/\/pay\.kiwify\.com\.br\/demo-/);

console.log('product-config.test.ts: all assertions passed');
