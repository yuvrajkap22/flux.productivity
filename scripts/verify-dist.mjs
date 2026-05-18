import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const requiredFiles = [
  'index.html',
  'login.html',
  'style.css',
  'css/leaderboard.css',
  'js/app.js',
  'js/todo.js',
  'js/storage-migrations.js',
  'assets/flux-logo.svg',
];

function extractAssetRefs(html) {
  const refs = [];
  const regex = /(href|src)="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[2];
    if (!raw || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('#')) continue;
    refs.push(raw);
  }
  return refs;
}

function stripQuery(assetPath) {
  return assetPath.split('?')[0].replace(/^\.\//, '');
}

async function assertExists(relPath) {
  const target = path.join(dist, relPath);
  try {
    await access(target, fsConstants.R_OK);
  } catch (error) {
    throw new Error(`Missing dist asset: ${relPath}`);
  }
}

async function main() {
  for (const file of requiredFiles) {
    await assertExists(file);
  }

  const htmlFiles = ['index.html', 'login.html'];
  for (const htmlFile of htmlFiles) {
    const html = await readFile(path.join(dist, htmlFile), 'utf8');
    const refs = extractAssetRefs(html).map(stripQuery);
    for (const ref of refs) {
      if (ref.startsWith('mailto:') || ref.startsWith('tel:')) continue;
      await assertExists(ref);
    }
  }

  console.log('Dist verification passed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
