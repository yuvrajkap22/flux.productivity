import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const url = 'file://' + path.resolve(process.cwd(), 'index.html');

(async () => {
  fs.mkdirSync('tmp', { recursive: true });
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const logs = [];

  page.on('console', (msg) => {
    try { logs.push({ type: msg.type(), text: msg.text() }); } catch (e) {}
  });
  page.on('pageerror', (err) => logs.push({ type: 'pageerror', text: err.message }));
  page.on('requestfailed', (req) => logs.push({ type: 'requestfailed', url: req.url(), errorText: req.failure()?.errorText }));

  const start = Date.now();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Collect runtime perf data
    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return {
        timeOrigin: performance.timeOrigin,
        navigation: nav,
        memory: performance.memory || null
      };
    });

    const shot = path.join('tmp', 'headless-screenshot.png');
    await page.screenshot({ path: shot, fullPage: true });
    await browser.close();

    console.log(JSON.stringify({ ok: true, url, durationMs: Date.now() - start, logs, perf, screenshot: shot }));
  } catch (err) {
    await browser.close();
    console.log(JSON.stringify({ ok: false, error: String(err), logs }));
    process.exit(1);
  }
})();
