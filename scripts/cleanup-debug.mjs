#!/usr/bin/env node
// Move noisy debug artifacts into tmp/archive/<timestamp>/ for safe cleanup
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const tmp = path.join(root, 'tmp');
const archiveDir = path.join(tmp, 'archive', String(Date.now()));
const patterns = [
  'headless-e2e-failure-*.html',
  'headless-e2e-failure-*.png',
  'headless-screenshot.png',
  'headless.log',
  'inspect-*.log',
  'debug-*.html',
  'debug-*.png',
  'debug-login-*',
  'debug-index-after-inject*'
];

function globMatch(pattern, names) {
  const regex = new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return names.filter((n) => regex.test(n));
}

if (!fs.existsSync(tmp)) {
  console.log('No tmp/ directory found — nothing to clean.');
  process.exit(0);
}

fs.mkdirSync(archiveDir, { recursive: true });

const names = fs.readdirSync(tmp);
let moved = 0;
for (const pattern of patterns) {
  const matches = globMatch(pattern, names);
  for (const m of matches) {
    const src = path.join(tmp, m);
    const dest = path.join(archiveDir, m);
    try {
      fs.renameSync(src, dest);
      console.log('Archived', m);
      moved++;
    } catch (e) {
      console.warn('Failed to move', m, e && e.message);
    }
  }
}

if (moved === 0) console.log('No matching debug artifacts found to archive.');
else console.log(`Archived ${moved} files to ${archiveDir}`);

console.log('Remaining tmp/ contents:');
console.log(fs.readdirSync(tmp).join('\n'));

process.exit(0);
