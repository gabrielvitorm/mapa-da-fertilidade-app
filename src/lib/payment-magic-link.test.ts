import assert from 'node:assert/strict';
import { sendMagicLinkSafely } from './payment-handler';

async function main() {
  let calledWith = '';
  await sendMagicLinkSafely('user-1', async (userId) => {
    calledWith = userId;
    throw new Error('mail service down');
  });

  assert.equal(calledWith, 'user-1');
  console.log('payment-magic-link.test.ts: all assertions passed');
}

void main();
