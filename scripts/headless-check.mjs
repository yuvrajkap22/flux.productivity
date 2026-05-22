import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
  const url = process.argv[2] || 'http://127.0.0.1:8080/';
  const outPng = 'headless-check.png';
  const outJson = 'headless-check.json';
  const logs = [];

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    try { logs.push({type: 'console', text: msg.text(), location: msg.location()}); } catch(e) { logs.push({type:'console','text':String(msg)}); }
  });
  page.on('pageerror', err => logs.push({type: 'pageerror', text: err?.message || String(err)}));
  page.on('requestfailed', req => logs.push({type: 'requestfailed', url: req.url(), errorText: req.failure()?.errorText || ''}));

  let status = 'unknown';
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    status = resp?.status() || 'no-response';
  } catch (e) {
    logs.push({type: 'navigation-error', text: e.message});
  }

  // wait a bit for any dynamic loading
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: outPng, fullPage: true });

  const result = { status, url, screenshot: outPng, logs };
  fs.writeFileSync(outJson, JSON.stringify(result, null, 2));
  console.log('Wrote', outJson, 'and', outPng);

  await browser.close();
}

run().catch(e=>{console.error(e); process.exit(1)});