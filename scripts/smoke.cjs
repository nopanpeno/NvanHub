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
  // Titik di akhir nama ada di dalam kotak nama (bukan di luar).
  expect((await page.textContent('.accent')).trim().endsWith('.'), `[${label}] titik di akhir nama keluar dari .accent`);
  // Sub-bab Fun fact ada di dalam Tentang, tingkat h3.
  expect((await page.locator('.about h3.label-sub').count()) === 1, `[${label}] sub-bab Fun fact tidak ada di Tentang`);
  // Garis footer: biru penuh di dasar halaman (scaleX 1 atau tanpa transform), baik animasi nyala maupun mati.
  const lineScale = () => page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('.footer-line-fill')).transform;
    return t === 'none' ? 1 : new DOMMatrixReadOnly(t).m11;
  });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  const full = await lineScale();
  expect(full > 0.99, `[${label}] garis footer belum penuh di dasar halaman (scaleX ${full})`);
  if (!reduced) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const empty = await lineScale();
    expect(empty < 0.05, `[${label}] garis footer harus kosong saat footer di luar layar (scaleX ${empty})`);
  }
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
