import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, rm, writeFile, copyFile, readdir } from 'node:fs/promises';
import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

async function ensureCleanDist() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(path.join(dist, 'js'), { recursive: true });
  await mkdir(path.join(dist, 'assets'), { recursive: true });
}

async function copySourceFiles() {
  const rootFiles = ['index.html', 'login.html', 'style.css'];
  for (const file of rootFiles) {
    await copyFile(path.join(root, file), path.join(dist, file));
  }

  const jsDir = path.join(root, 'js');
  const jsFiles = (await readdir(jsDir)).filter((name) => name.endsWith('.js'));
  for (const file of jsFiles) {
    await copyFile(path.join(jsDir, file), path.join(dist, 'js', file));
  }

  const assetsDir = path.join(root, 'assets');
  const assetFiles = await readdir(assetsDir);
  for (const file of assetFiles) {
    await copyFile(path.join(assetsDir, file), path.join(dist, 'assets', file));
  }
}

async function minifyHtmlFiles() {
  const htmlFiles = ['index.html', 'login.html'];
  for (const file of htmlFiles) {
    const inputPath = path.join(dist, file);
    const source = await readFile(inputPath, 'utf8');
    const minified = await minifyHtml(source, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
      keepClosingSlash: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
    });
    await writeFile(inputPath, minified, 'utf8');
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
  await ensureCleanDist();
  await copySourceFiles();
  await minifyHtmlFiles();
  await minifyCssFile();
  await minifyJsFiles();
  console.log('Built minified deployment in dist/');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
