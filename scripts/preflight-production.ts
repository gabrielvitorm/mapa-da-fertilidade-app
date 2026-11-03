import { validateProductionEnv } from '../src/lib/production-config';

const errors = validateProductionEnv();
if (errors.length > 0) {
  console.error('Production preflight failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Production preflight passed. Secrets were not printed.');
