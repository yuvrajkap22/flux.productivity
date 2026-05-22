import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, rm, writeFile, copyFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

async function ensureCleanDist() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(path.join(dist, 'js'), { recursive: true });
  await mkdir(path.join(dist, 'css'), { recursive: true });
  await mkdir(path.join(dist, 'assets'), { recursive: true });
}

async function copyDirRecursive(src, dst) {
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await mkdir(dstPath, { recursive: true });
      await copyDirRecursive(srcPath, dstPath);
    } else {
      await copyFile(srcPath, dstPath);
    }
  }
}

async function copySourceFiles() {
  const rootFiles = ['index.html', 'landing.html', 'login.html', 'style.css', 'favicon.ico'];
  for (const file of rootFiles) {
    await copyFile(path.join(root, file), path.join(dist, file));
  }

  // Copy optional public root files (like performance-lite.css) into dist root
  try {
    await copyFile(path.join(root, 'public', 'performance-lite.css'), path.join(dist, 'performance-lite.css'));
  } catch (e) {
    // ignore if not present
  }

  const jsDir = path.join(root, 'js');
  const jsFiles = (await readdir(jsDir)).filter((name) => name.endsWith('.js'));
  for (const file of jsFiles) {
    await copyFile(path.join(jsDir, file), path.join(dist, 'js', file));
  }

  // Recursively copy css/ directory
  const cssDir = path.join(root, 'css');
  try {
    await copyDirRecursive(cssDir, path.join(dist, 'css'));
  } catch (e) {
    // css directory may not exist, skip if it doesn't
  }

  // Recursively copy assets/ directory
  const assetsDir = path.join(root, 'assets');
  await copyDirRecursive(assetsDir, path.join(dist, 'assets'));
}

async function getBuildVersion() {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  let gitSha = 'local';

  try {
    gitSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    gitSha = 'local';
  }

  return `${packageJson.version}+${gitSha}`;
}

function versionAssetUrls(source, buildVersion) {
  return source
    .replace(/(href|src)="((?:style\.css|js\/[^"]+\.js|assets\/[^"]+\.(?:svg|png|jpe?g|webp|ico))(?:\?v=[^"]*)?)"/g, (_, attr, assetPath) => {
      const cleanAssetPath = assetPath.replace(/\?v=[^"]*$/, '');
      return `${attr}="${cleanAssetPath}?v=${buildVersion}"`;
    })
    .replace(/\.\/js\/firebase-config\.js(?:\?v=[^'"]*)?/g, `./js/firebase-config.js?v=${buildVersion}`);
}

async function minifyHtmlFiles(buildVersion) {
  const htmlFiles = ['index.html', 'login.html'];
  for (const file of htmlFiles) {
    const inputPath = path.join(dist, file);
    const source = await readFile(inputPath, 'utf8');
    const versionedSource = versionAssetUrls(source, buildVersion);
    await writeFile(inputPath, versionedSource, 'utf8');
  }
}

async function minifyCssFile() {
  const cssPath = path.join(dist, 'style.css');
  const source = await readFile(cssPath, 'utf8');
  const result = new CleanCSS({ level: 2 }).minify(source);
  if (result.errors.length) {
    throw new Error(`CSS minification failed: ${result.errors.join('; ')}`);
  }
  await writeFile(cssPath, result.styles, 'utf8');
}

async function minifyJsFiles() {
  const jsDistDir = path.join(dist, 'js');
  const jsFiles = (await readdir(jsDistDir)).filter((name) => name.endsWith('.js'));

  for (const file of jsFiles) {
    const inputPath = path.join(jsDistDir, file);
    const source = await readFile(inputPath, 'utf8');
    const result = await minifyJs(source, {
      compress: true,
      mangle: true,
      format: { comments: false },
    });

    if (!result.code) {
      throw new Error(`JS minification produced empty output for ${file}`);
    }

    await writeFile(inputPath, result.code, 'utf8');
  }
}

async function main() {
  const buildVersion = await getBuildVersion();
  await ensureCleanDist();
  await copySourceFiles();
  await minifyHtmlFiles(buildVersion);
  await minifyCssFile();
  await minifyJsFiles();
  console.log('Built minified deployment in dist/');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
