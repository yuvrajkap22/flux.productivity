#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(process.cwd());
const SVG_PATH = path.join(ROOT, 'assets', 'social-card.svg');
const OUT_PATH = path.join(ROOT, 'assets', 'social-card.png');
const WIDTH = 1200;
const HEIGHT = 630;

async function run() {
  try {
    const svg = await fs.readFile(SVG_PATH, 'utf8');
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.setViewport({width: WIDTH, height: HEIGHT});
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${svg}</body></html>`;
    await page.setContent(html, {waitUntil: 'networkidle0'});
    const el = await page.$('svg') || await page.$('body');
    await el.screenshot({path: OUT_PATH});
    await browser.close();
    console.log('Wrote', OUT_PATH);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
