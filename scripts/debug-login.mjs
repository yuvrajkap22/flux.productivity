import puppeteer from 'puppeteer';
import fs from 'fs';
(async function(){
  const stamp = Date.now();
  const email = `debug+${stamp}@example.com`;
  const password = 'password123';
  console.log('Creating emulator user', email);
  const res = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=notasecret',{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password,returnSecureToken:true})
  });
  const body = await res.json();
  console.log('signup response', body);
  const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', m=> console.log('PAGE:', m.text()));
  page.on('pageerror', e=> console.log('PAGE_ERROR', e.message));
  await page.goto('http://127.0.0.1:8081/login.html', {waitUntil:'networkidle2'});
  await page.waitForSelector('#input-email', {visible:true, timeout:5000});
  await page.type('#input-email', email);
  await page.type('#input-password', password);
  await page.click('#btn-signin');
  // wait a bit
  await new Promise((r) => setTimeout(r, 4000));
  const html = await page.content();
  fs.writeFileSync('/Users/yuvrajkapoor/Documents/GitHub/flux.productivity/tmp/debug-login-after.html', html);
  await page.screenshot({path:'/Users/yuvrajkapoor/Documents/GitHub/flux.productivity/tmp/debug-login-after.png', fullPage:true});
  console.log('Wrote snapshot and html');
  await browser.close();
})();
