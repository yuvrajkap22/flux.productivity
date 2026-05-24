import puppeteer from 'puppeteer';
import fs from 'fs';
(async function(){
  const browser = await puppeteer.launch({headless:true, args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  const out = [];
  page.on('console', msg => out.push('PAGE: '+msg.text()));
  page.on('pageerror', err => out.push('PAGE_ERROR: '+err.message));
  await page.goto('http://127.0.0.1:8081/index.html', {waitUntil:'networkidle2'});
  await new Promise(r=>setTimeout(r,3000));
  const html = await page.content();
  out.push('PAGE_CONTENT_LENGTH: '+html.length);
  out.push('PAGE_CONTENT_HAS_SCRIPT: '+(html.includes('<script')? 'true':'false'));
  const scriptCount = await page.evaluate(()=>document.querySelectorAll('script').length);
  out.push('EVAL_SCRIPT_COUNT: '+scriptCount);
  const headInner = await page.evaluate(()=>({
    headHTMLSlice: document.head.innerHTML.slice(0,2000),
    headChildNodes: Array.from(document.head.childNodes).map(n => ({nodeName: n.nodeName, nodeType: n.nodeType, outerHTML: n.outerHTML ? n.outerHTML.slice(0,200) : null}))
  }));
  out.push('HEAD_INNER_SLICE: '+JSON.stringify(headInner, null, 2));
  const scriptInfo = await page.evaluate(()=>({
    scriptsLen: document.scripts ? document.scripts.length : null,
    getByTag: document.getElementsByTagName ? document.getElementsByTagName('script').length : null,
    bodyType: typeof document.body.innerText,
    bodyStarts: (document.body && document.body.innerText) ? document.body.innerText.slice(0,200) : null
  }));
  out.push('SCRIPT_INFO: '+JSON.stringify(scriptInfo, null, 2));
  fs.writeFileSync('/Users/yuvrajkapoor/Documents/GitHub/flux.productivity/tmp/inspect-script-count.log', out.join('\n'));
  await browser.close();
})();
