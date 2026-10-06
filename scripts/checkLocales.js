#!/usr/bin/env node
/**
 * Verify every locale defines the same keys as English.
 *
 *   npm run i18n:check
 *
 * i18n-js falls back to English for a missing key, so a gap is invisible at
 * runtime until someone reads a screen in French and finds an English word in
 * the middle of it. This turns that into a failed check instead.
 *
 * Also reports keys a locale has but English does not — usually a rename that
 * was applied to one file and forgotten in the others.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '../src/i18n/locales');
const BASE = 'en';

/** Nested object -> flat dotted key set. */
function flatten(value, prefix = '') {
  const keys = new Set();
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      for (const nested of flatten(child, `${prefix}${key}.`)) keys.add(nested);
    } else {
      keys.add(`${prefix}${key}`);
    }
  }
  return keys;
}

const load = (locale) =>
  flatten(JSON.parse(fs.readFileSync(path.join(DIR, `${locale}.json`), 'utf8')));

const locales = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => path.basename(f, '.json'))
  .sort();

if (!locales.includes(BASE)) {
  console.error(`No ${BASE}.json in ${path.relative(process.cwd(), DIR)} — nothing to compare against.`);
  process.exit(1);
}

const baseKeys = load(BASE);
const problems = [];

for (const locale of locales.filter((l) => l !== BASE)) {
  const keys = load(locale);
  for (const key of baseKeys) {
    if (!keys.has(key)) problems.push(`${locale}: missing "${key}"`);
  }
  for (const key of keys) {
    if (!baseKeys.has(key)) problems.push(`${locale}: has "${key}", which ${BASE} does not`);
  }
}

if (problems.length) {
  console.error('Locale check failed:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `Locale check passed — ${locales.length} locales (${locales.join(', ')}), ` +
    `${baseKeys.size} keys each.`
);
