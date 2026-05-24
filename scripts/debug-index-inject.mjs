import puppeteer from 'puppeteer';
import fs from 'fs';

(async function(){
  const stamp = Date.now();
  const email = `debugidx+${stamp}@example.com`;
  const password = 'password123';
  console.log('Creating emulator user', email);
  const res = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=notasecret',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password,returnSecureToken:true})});
  const body = await res.json();
  const uid = body.localId;
  console.log('signup response uid=', uid);

  const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', m=> console.log('PAGE:', m.text()));
  page.on('pageerror', e=> console.log('PAGE_ERROR', e.message));

  await page.goto('http://127.0.0.1:8081/index.html', {waitUntil:'networkidle2'});

  // attempt to inject the same auth shim the E2E harness uses
  const injected = await page.evaluate((u, e) => {
    try {
      const user = { uid: u, email: e, displayName: e.split('@')[0], photoURL: '', isGuest: false };
      window.FluxAuth = { ready: () => true, user: () => user };
      window.FluxAuthState = { ready: true, user };
      if (window.FluxApp && typeof window.FluxApp.onAuthChange === 'function') {
        window.FluxApp.onAuthChange(user);
      }
      return true;
    } catch (err) {
      console.error('inject auth failed', err);
      return false;
    }
  }, uid, email).catch((e)=>{ console.log('inject eval failed', e); return false; });

  console.log('injected?', injected);
  // wait a short while for app to react
  await new Promise((r) => setTimeout(r, 4000));

  const html = await page.content();
  fs.writeFileSync('/Users/yuvrajkapoor/Documents/GitHub/flux.productivity/tmp/debug-index-after-inject.html', html);
  await page.screenshot({path:'/Users/yuvrajkapoor/Documents/GitHub/flux.productivity/tmp/debug-index-after-inject.png', fullPage:true});

  const hasPlay = await page.$('#pomo-play');
  const visible = hasPlay ? await page.evaluate((el)=>{
    const r = el.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }, hasPlay) : false;
  console.log('pomo-play exists:', Boolean(hasPlay), 'visible:', visible);

  await browser.close();
  console.log('wrote debug-index-after-inject files');
})();
