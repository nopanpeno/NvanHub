// Tes asap di browser sungguhan. Butuh Playwright: npm install --no-save playwright
// Jalankan: node scripts/smoke.cjs   (server statis dijalankan sendiri di port acak)
// Memeriksa: tidak ada error JS atau request gagal, kartu = jumlah proyek, tidak ada scroll
// horizontal di 375px dan 1280px, font pixel termuat, dan mode reduced-motion tanpa animasi.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const problems = [];
const expect = (cond, msg) => { if (!cond) problems.push(msg); };

async function visit(browser, base, { width, reduced }) {
  const label = `${width}px${reduced ? ' reduced-motion' : ''}`;
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${label}] error JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] request gagal: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const total = JSON.parse(fs.readFileSync(path.join(root, 'data/projects.json'), 'utf8')).length;
  expect((await page.locator('.card').count()) === total, `[${label}] jumlah kartu bukan ${total}`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  expect(await page.evaluate(() => document.fonts.check('16px "Jersey 10"')), `[${label}] font Jersey 10 tidak termuat`);
  const hasMotion = await page.evaluate(() => Boolean(window.NvanMotion && window.gsap));
  expect(reduced || hasMotion, `[${label}] GSAP atau NvanMotion tidak ada`);
  if (reduced) {
    expect((await page.locator('.plate').count()) === 0, `[${label}] kotak nama muncul padahal gerak dikurangi`);
    expect((await page.locator('.grid-glow').count()) === 0, `[${label}] grid glow muncul padahal gerak dikurangi`);
  } else {
    expect((await page.locator('.plate').count()) === 1, `[${label}] kotak nama tidak ada`);
  }
  expect((await page.evaluate(() => getComputedStyle(document.querySelector('.hero h1')).opacity)) === '1', `[${label}] judul hero tidak terlihat`);
  await ctx.close();
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch(process.env.CI ? { channel: 'chrome' } : {});
  try {
    for (const opts of [{ width: 1280 }, { width: 375 }, { width: 1280, reduced: true }]) await visit(browser, base, opts);
  } finally {
    await browser.close();
    server.close();
  }
  if (problems.length) {
    console.error(`Tes asap gagal (${problems.length}):\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log('Tes asap lolos: 1280px, 375px, dan reduced-motion.');
})();
