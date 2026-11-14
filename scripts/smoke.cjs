// Tes asap di browser sungguhan. Butuh Playwright: npm install --no-save playwright
// Jalankan: node scripts/smoke.cjs   (server statis dijalankan sendiri di port acak)
// Memeriksa: tidak ada error JS atau request gagal, kartu = jumlah proyek, tidak ada scroll
// horizontal di 375px dan 1280px, font pixel termuat, dan mode reduced-motion tanpa animasi.
// Juga: NvanPass di /pass/ tampil dan memuat manifest, dan hub serta NvanPass tetap bisa dibuka offline.
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
  // Tombol Lihat proyek: setelah intro tampil penuh dan transform dilepas (hover CSS bisa jalan).
  await page.waitForTimeout(reduced ? 0 : 800);
  const cta = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.hero .btn')); return { op: c.opacity, tf: c.transform }; });
  expect(cta.op === '1', `[${label}] tombol Lihat proyek tidak terlihat (opacity ${cta.op})`);
  expect(cta.tf === 'none', `[${label}] tombol Lihat proyek masih membawa transform (${cta.tf})`);
  expect((await page.locator('header nav a').count()) === 1, `[${label}] nav header harus hanya berisi Tentang`);
  // Dropdown topik: buka lewat klik, pilih lewat keyboard, filter jalan, Escape menutup dan fokus kembali.
  const btn = page.locator('#tag');
  const list = page.locator('#tag-list');
  const opts = await list.locator('[role=option]').count();
  expect(opts >= 2, `[${label}] dropdown topik kosong`);
  expect((await btn.getAttribute('aria-expanded')) === 'false', `[${label}] dropdown harus tertutup di awal`);
  await btn.click();
  expect((await btn.getAttribute('aria-expanded')) === 'true', `[${label}] dropdown tidak terbuka saat diklik`);
  // Opsi masuk berurutan hanya kalau gerak boleh: opsi terakhir menunggu lebih lama dari yang pertama.
  const anim = await list.evaluate((el) => [...el.querySelectorAll('[role=option]')].map((o) => { const c = getComputedStyle(o); return [c.animationName, parseFloat(c.animationDelay) || 0]; }));
  if (reduced) expect(anim.every(([n]) => n === 'none'), `[${label}] opsi dropdown beranimasi padahal gerak dikurangi`);
  else expect(anim[0][0] === 'dropdown-opt-in' && anim[anim.length - 1][1] > anim[0][1], `[${label}] opsi dropdown tidak masuk berurutan`);
  expect(await list.evaluate((el) => el === document.activeElement), `[${label}] fokus tidak pindah ke daftar topik`);
  const box = await list.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= width, `[${label}] daftar topik keluar dari layar`);
  // Tinggi dari gaya terhitung, bukan getBoundingClientRect: rect ikut transform animasi masuk dan bisa meleset sub-piksel.
  const tall = await list.locator('[role=option]').first().evaluate((el) => parseFloat(getComputedStyle(el).height));
  expect(tall >= 44, `[${label}] opsi topik lebih pendek dari 44px (${tall}px)`);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(reduced ? 100 : 700);
  expect((await btn.getAttribute('aria-expanded')) === 'false', `[${label}] dropdown tidak menutup setelah memilih`);
  expect(await btn.evaluate((el) => el === document.activeElement), `[${label}] fokus tidak kembali ke tombol topik`);
  expect((await page.locator('.card').count()) < total, `[${label}] filter topik tidak menyaring kartu`);
  expect(!(await btn.textContent()).startsWith('Semua'), `[${label}] teks tombol topik tidak ikut pilihan`);
  await btn.click();
  await page.keyboard.press('Escape');
  expect(await btn.evaluate((el) => el === document.activeElement), `[${label}] Escape tidak mengembalikan fokus ke tombol`);
  await btn.click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(reduced ? 100 : 700);
  expect((await page.locator('.card').count()) === total, `[${label}] "Semua topik" tidak mengembalikan semua kartu`);
  const over2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over2 <= 0, `[${label}] dropdown menimbulkan scroll horizontal (${over2}px)`);
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
  const dashFull = await page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('.footer-dash-fill')).transform;
    return t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41;
  });
  expect(Math.abs(dashFull) < 1, `[${label}] garis putus-putus footer belum penuh di dasar halaman (geser ${dashFull}px)`);
  if (!reduced) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const empty = await lineScale();
    expect(empty < 0.05, `[${label}] garis footer harus kosong saat footer di luar layar (scaleX ${empty})`);
    const dashX = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.footer-dash-fill')).transform).m41);
    expect(dashX < -100, `[${label}] garis putus-putus footer harus tersembunyi saat footer di luar layar (geser ${dashX}px)`);
  }
  await ctx.close();
}

// NvanPass di /pass/: layar awal tampil, tombol kembali ke hub ada, manifest termuat, tidak ada scroll horizontal.
async function visitPass(browser, base, { width }) {
  const label = `pass ${width}px`;
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${label}] error JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] request gagal: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`${base}pass/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect(await page.locator('#go-send').isVisible(), `[${label}] layar awal NvanPass tidak tampil`);
  expect((await page.locator('a.hub-back').getAttribute('href')) === '../', `[${label}] tombol kembali ke NvanHub tidak ada`);
  expect((await page.locator('link[rel=manifest]').count()) === 1, `[${label}] link manifest tidak ada`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  await ctx.close();
}

// Offline: setelah sekali dibuka lewat service worker, hub dan NvanPass tetap bisa dibuka tanpa jaringan.
async function visitOffline(browser, base) {
  const total = JSON.parse(fs.readFileSync(path.join(root, 'data/projects.json'), 'utf8')).length;
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[offline] error JS: ${e.message}`));
  await page.goto(base, { waitUntil: 'load' });
  // Install service worker selesai menyimpan aset dulu, baru mengambil alih halaman (controller terisi).
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  expect((await page.locator('.card').count()) === total, `[offline] hub tidak memuat ${total} kartu tanpa jaringan`);
  await page.goto(`${base}pass/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect(await page.locator('#go-send').isVisible(), '[offline] NvanPass tidak tampil tanpa jaringan');
  await ctx.close();
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch(process.env.CI ? { channel: 'chrome' } : {});
  try {
    for (const opts of [{ width: 1280 }, { width: 375 }, { width: 1280, reduced: true }]) await visit(browser, base, opts);
    await visitPass(browser, base, { width: 375 });
    await visitPass(browser, base, { width: 1280 });
    await visitOffline(browser, base);
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
