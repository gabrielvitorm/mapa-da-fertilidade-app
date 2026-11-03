import assert from 'node:assert/strict';
import {
  buildMagicLinkPayload,
  deliverMagicLink,
  type MagicLinkPayload,
} from './magic-link';

const payload = buildMagicLinkPayload(
  { email: 'cliente@example.com', nome: 'Cliente Teste' },
  'https://app.example.com/api/auth/verify?token=raw-token'
);

assert.deepEqual(payload, {
  email: 'cliente@example.com',
  nome: 'Cliente Teste',
  magicLinkUrl: 'https://app.example.com/api/auth/verify?token=raw-token',
});

let received: MagicLinkPayload | undefined;
const successfulFetch = async (_input: string | URL, init?: RequestInit) => {
  received = JSON.parse(String(init?.body)) as MagicLinkPayload;
  return new Response(null, { status: 204 });
};

async function main() {
  assert.equal(
    await deliverMagicLink(payload, 'https://n8n.example.com/webhook/magic-link', successfulFetch),
    true
  );
  assert.deepEqual(received, payload);

  assert.equal(
    await deliverMagicLink(payload, 'https://n8n.example.com/webhook/magic-link', async () => {
      throw new Error('network unavailable');
    }),
    false
  );
  assert.equal(
    await deliverMagicLink(
      payload,
      'https://n8n.example.com/webhook/magic-link',
      async () => new Response(null, { status: 502 })
    ),
    false
  );
  assert.equal(await deliverMagicLink(payload, undefined), false);

  console.log('magic-link.test.ts: all assertions passed');
}

void main();
