import assert from 'node:assert/strict';
import { isMagicLinkUsable } from './magic-link-verification';

const now = new Date('2026-11-03T12:00:00.000Z');
const future = new Date('2026-11-04T12:00:00.000Z');

assert.equal(isMagicLinkUsable({ expiresAt: future, usedAt: null }, now), true);
assert.equal(isMagicLinkUsable({ expiresAt: future, usedAt: new Date() }, now), false);
assert.equal(isMagicLinkUsable({ expiresAt: now, usedAt: null }, now), false);

console.log('magic-link-verification.test.ts: all assertions passed');
