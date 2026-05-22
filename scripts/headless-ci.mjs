import fs from 'fs';
import puppeteer from 'puppeteer';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080';
const targets = [
  { name: 'login', url: `${baseUrl}/login.html` },
  { name: 'landing', url: `${baseUrl}/landing.html` },
];

async function checkPage(browser, target) {
  const page = await browser.newPage();
  const logs = [];

  page.on('console', msg => {
    logs.push({ type: 'console', text: msg.text(), level: msg.type() });
  });
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err?.message || String(err) }));
  page.on('requestfailed', req => logs.push({ type: 'requestfailed', url: req.url(), errorText: req.failure()?.errorText || '' }));

  let status = null;
  let error = null;

  try {
    const response = await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
    status = response?.status() ?? null;
    await new Promise(resolve => setTimeout(resolve, 1500));
    await page.screenshot({ path: `headless-${target.name}.png`, fullPage: true });
  } catch (err) {
    error = err?.message || String(err);
  }

  await page.close();

  return { name: target.name, url: target.url, status, error, screenshot: `headless-${target.name}.png`, logs };
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = [];
  let failed = false;

  for (const target of targets) {
    const result = await checkPage(browser, target);
    results.push(result);
    if (!result.status || result.status >= 400 || result.error || result.logs.some(entry => entry.type === 'pageerror' || entry.type === 'requestfailed')) {
      failed = true;
    }
  }

  await browser.close();

  fs.writeFileSync('headless-ci.json', JSON.stringify({ baseUrl, results }, null, 2));
  console.log('Wrote headless-ci.json');

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
