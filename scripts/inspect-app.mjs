import puppeteer from 'puppeteer';
import fs from 'fs';
(async function(){
  const out = [];
  const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => out.push('PAGE: ' + msg.text()));
  page.on('pageerror', err => out.push('PAGE_ERROR: ' + err.message));
  page.on('response', res => out.push(`RESP: ${res.status()} ${res.url()}`));

  await page.goto('http://127.0.0.1:8081/index.html', {waitUntil: 'networkidle2'});
  // wait for scripts to execute
  await new Promise(r => setTimeout(r, 8000));

  const info = await page.evaluate(() => {
    return {
      fluxAppType: typeof window.FluxApp,
      hasShowView: typeof window.showView === 'function',
      fluxAuthState: !!(window.FluxAuthState && window.FluxAuthState.user),
      bodyClasses: document.body.className,
      loaderClass: (document.getElementById('flux-page-loader')||{}).className || null,
      scripts: Array.from(document.querySelectorAll('script[src]')).map(s=>s.getAttribute('src'))
    };
  });
  out.push('EVAL_INFO: ' + JSON.stringify(info));
  fs.writeFileSync('/Users/yuvrajkapoor/Documents/GitHub/flux.productivity/tmp/inspect-app.log', out.join('\n'));
  console.log('Wrote /tmp/inspect-app.log');
  await browser.close();
})();
