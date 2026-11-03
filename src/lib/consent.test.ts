import assert from 'node:assert/strict';
import { CONSENT_VERSION, hasValidConsent } from './consent';

assert.equal(hasValidConsent({ consentVersion: CONSENT_VERSION }), true);
assert.equal(hasValidConsent({ consentVersion: 'old-version' }), false);
assert.equal(hasValidConsent({}), false);
console.log('consent.test.ts: all assertions passed');
