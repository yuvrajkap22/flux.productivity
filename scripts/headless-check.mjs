#!/usr/bin/env node
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const url = process.argv[2] || 'http://127.0.0.1:8080';
(async () => {
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