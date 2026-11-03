import assert from 'node:assert/strict';
import { createMagicToken, hashMagicToken, isMagicTokenExpired, MAGIC_LINK_TTL_MS } from './magic-link-core';

const secret = 'test-session-secret';
const first = createMagicToken(secret);
const second = createMagicToken(secret);

assert.notEqual(first.rawToken, second.rawToken);
assert.notEqual(first.rawToken, first.tokenHash);
assert.equal(first.tokenHash, hashMagicToken(first.rawToken, secret));
assert.notEqual(first.tokenHash, hashMagicToken(first.rawToken, 'other-secret'));

const issuedAt = new Date('2026-11-03T12:00:00.000Z');
const expiresAt = new Date(issuedAt.getTime() + MAGIC_LINK_TTL_MS);
assert.equal(isMagicTokenExpired(expiresAt, new Date(expiresAt.getTime() - 1)), false);
assert.equal(isMagicTokenExpired(expiresAt, expiresAt), true);

console.log('magic-link-core.test.ts: all assertions passed');
