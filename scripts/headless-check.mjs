#!/usr/bin/env node
const url = process.argv[2] || 'http://127.0.0.1:8080';

async function loadPuppeteer() {
  try {
    const [{ default: puppeteer }, { default: StealthPlugin }] = await Promise.all([
      import('puppeteer-extra'),
      import('puppeteer-extra-plugin-stealth'),
    ]);
    puppeteer.use(StealthPlugin());
    return puppeteer;
  } catch (error) {
    console.error('Headless check skipped: optional deps missing (puppeteer-extra, puppeteer-extra-plugin-stealth).');
    console.error('Install them as dev deps to enable this check.');
    process.exit(0);
  }
}

(async () => {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('PAGE:', m.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err));
  page.on('response', r => {
    if (r.status() >= 400) console.warn('HTTP', r.status(), r.url());
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.screenshot({ path: 'headless-screenshot.png', fullPage: true });
  console.log('screenshot: headless-screenshot.png');
  await browser.close();
})();