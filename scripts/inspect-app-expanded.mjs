import puppeteer from 'puppeteer';
import fs from 'fs';
(async function(){
  const out = [];
  const browser = await puppeteer.launch({headless:false, args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => out.push('PAGE: ' + msg.text()));
  page.on('pageerror', err => out.push('PAGE_ERROR: ' + err.message));
  page.on('response', res => out.push(`RESP: ${res.status()} ${res.url()}`));

  await page.goto('http://127.0.0.1:8081/index.html', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 5000));

  const info = await page.evaluate(async () => {
    const scripts = Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.getAttribute('src'),
      inline: !s.getAttribute('src'),
      text: s.getAttribute('src') ? null : s.textContent && s.textContent.slice(0,2000)
    }));
    const external = await Promise.all(scripts.filter(s=>s.src).map(async s => {
      try {
        const url = new URL(s.src, location.href).href;
        const res = await fetch(url);
        const text = await res.text();
        return {src: url, status: res.status, text: text.slice(0,2000)};
      } catch(e) {
        return {src: s.src, status: 'ERR', text: String(e).slice(0,500)};
      }
    }));
    let fetchedPage = { status: null, text: null };
    try {
      const r = await fetch(location.href);
      fetchedPage.status = r.status;
      fetchedPage.text = (await r.text()).slice(0,20000);
    } catch (e) {
      fetchedPage.text = String(e).slice(0,500);
    }

    return {
      fluxAppType: typeof window.FluxApp,
      hasShowView: typeof window.showView === 'function',
      fluxAuthState: !!(window.FluxAuthState && window.FluxAuthState.user),
      bodyClasses: document.body.className,
      loaderClass: (document.getElementById('flux-page-loader')||{}).className || null,
      scriptCount: document.querySelectorAll('script').length,
      scriptsInlineCount: scripts.filter(s=>s.inline).length,
      scriptsExternal: external,
      fetchedPage,
      htmlSlice: document.documentElement.innerHTML.slice(0,8000)
    };
  });

  out.push('EVAL_INFO: ' + JSON.stringify(info, null, 2));
  const pageHtml = await page.content();
  out.push('PAGE_CONTENT_INCLUDES_SCRIPT_TAG: ' + (pageHtml.includes('<script') ? 'true' : 'false'));
  out.push('PAGE_CONTENT_SLICE: ' + pageHtml.slice(0,2000));
  const outPath = '/Users/yuvrajkapoor/Documents/GitHub/flux.productivity/tmp/inspect-app-expanded.log';
  fs.writeFileSync(outPath, out.join('\n'));
  console.log('Wrote', outPath);
  // keep browser open for manual inspection a short time
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
