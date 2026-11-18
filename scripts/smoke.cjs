// Tes asap di browser sungguhan. Butuh Playwright: npm install --no-save playwright
// Jalankan: node scripts/smoke.cjs   (server statis dijalankan sendiri di port acak)
// Memeriksa: tidak ada error JS atau request gagal, kartu = jumlah proyek, tidak ada scroll
// horizontal di 375px dan 1280px, font Anton dan Onest termuat, dan mode reduced-motion tanpa animasi.
// Juga: NvanPass, NvanPlay, NvanVector, NvanQR, NvanExif, dan NvanCut tampil dan punya tombol kembali ke hub, dan hub serta tool tetap bisa dibuka offline.
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
  // Animasi judul dan kartu jalan saat load. Beri waktu sampai selesai.
  await page.waitForTimeout(900);

  const total = JSON.parse(fs.readFileSync(path.join(root, 'data/projects.json'), 'utf8')).length;
  expect((await page.locator('.card').count()) === total, `[${label}] jumlah kartu bukan ${total}`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  for (const face of ['Anton', 'Onest']) {
    const loaded = await page.evaluate(async (f) => (await document.fonts.load(`16px "${f}"`)).some((x) => x.status === 'loaded'), face);
    expect(loaded, `[${label}] font ${face} tidak termuat`);
  }
  expect((await page.evaluate(() => getComputedStyle(document.querySelector('.hero h1')).opacity)) === '1', `[${label}] judul hero tidak terlihat`);
  // Elemen sakuga: tombol Lihat proyek, tombol Salin tautan di tiap kartu, tab kategori, dan toast.
  expect((await page.locator('sakuga-button#cta').count()) === 1, `[${label}] tombol Lihat proyek tidak ada`);
  expect((await page.locator('sakuga-button.copy').count()) === total, `[${label}] tombol Salin tautan tidak ada di tiap kartu`);
  expect((await page.locator('#toast').count()) === 1, `[${label}] toast tidak ada`);
  expect((await page.locator('header nav a').count()) === 1, `[${label}] nav header harus hanya berisi Tentang`);
  // Tab kategori: pilih Alat, kartu menyaring; pilih Semua, kartu kembali lengkap.
  const tab = (name) => page.locator('#tabs [role=tab]', { hasText: name });
  const shown = () => page.locator('.card:not([hidden])').count();
  expect((await tab('Alat').count()) === 1, `[${label}] tab Alat tidak ada`);
  await tab('Alat').click();
  await page.waitForTimeout(reduced ? 0 : 300);
  const alat = await shown();
  expect(alat > 0 && alat < total, `[${label}] tab Alat tidak menyaring kartu (${alat} tampil)`);
  expect((await tab('Alat').getAttribute('aria-selected')) === 'true', `[${label}] tab Alat tidak terpilih`);
  await tab('Semua').click();
  await page.waitForTimeout(reduced ? 0 : 300);
  expect((await shown()) === total, `[${label}] "Semua" tidak mengembalikan semua kartu`);
  const over2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over2 <= 0, `[${label}] tab kategori menimbulkan scroll horizontal (${over2}px)`);
  // Sub-bab Fun fact ada di dalam Tentang, tingkat h3.
  expect((await page.locator('.about h3').count()) === 1, `[${label}] sub-bab Fun fact tidak ada di Tentang`);
  // Kembali ke atas di footer tampil saat halaman sudah di dasar.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(reduced ? 0 : 400);
  expect(await page.locator('.to-top').isVisible(), `[${label}] Kembali ke atas di footer tidak tampil`);
  // Kembali ke atas harus benar-benar membawa halaman ke atas (header fixed tidak boleh jadi target fragment).
  await page.click('.to-top');
  await page.waitForTimeout(reduced ? 0 : 1500);
  const top = await page.evaluate(() => window.scrollY);
  expect(top === 0, `[${label}] Kembali ke atas tidak membawa ke atas (scrollY ${top})`);
  // Saklar tema di footer: klik mengganti tema, dan pilihannya diingat setelah muat ulang.
  expect((await page.locator('sakuga-toggle#tema').count()) === 1, `[${label}] saklar tema tidak ada`);
  await page.locator('#tema').scrollIntoViewIfNeeded();
  await page.locator('#tema').click();
  await page.waitForTimeout(reduced ? 0 : 200);
  expect((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', `[${label}] saklar tema tidak mengganti tema`);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  expect((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', `[${label}] pilihan tema tidak diingat setelah muat ulang`);
  expect((await page.evaluate(() => document.getElementById('tema').checked)) === true, `[${label}] saklar tema tidak menyala setelah muat ulang`);
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

// NvanPlay di /play/: katalog memuat semua game dari games.json, tombol kembali ke hub ada, tidak ada scroll horizontal.
async function visitPlay(browser, base, { width }) {
  const label = `play ${width}px`;
  const total = JSON.parse(fs.readFileSync(path.join(root, 'play/games.json'), 'utf8')).length;
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${label}] error JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] request gagal: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`${base}play/`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  expect((await page.locator('#catalog a[href^="player.html"]').count()) === total, `[${label}] katalog tidak memuat ${total} game`);
  // Halaman data dan pemutar juga punya tombol kembali ke hub, dan tidak melebar di layar sempit.
  for (const pg of ['data.html', 'player.html?id=2048']) {
    await page.goto(`${base}play/${pg}`, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    expect((await page.locator('a[href="../"]').count()) >= 1, `[${label}] ${pg}: tombol kembali ke NvanHub tidak ada`);
    const pageOver = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(pageOver <= 0, `[${label}] ${pg}: ada scroll horizontal (${pageOver}px)`);
  }
  await page.goto(`${base}play/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('a.hub-back').getAttribute('href')) === '../', `[${label}] tombol kembali ke NvanHub tidak ada`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  await ctx.close();
}

// NvanVector di /vector/: halaman utama tampil, tombol kembali ke hub ada, library trace termuat dari repo, tidak ada scroll horizontal.
async function visitVector(browser, base, { width }) {
  const label = `vector ${width}px`;
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${label}] error JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] request gagal: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`${base}vector/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#file').count()) === 1, `[${label}] input gambar tidak ada`);
  expect((await page.locator('a.hub-back').getAttribute('href')) === '../', `[${label}] tombol kembali ke NvanHub tidak ada`);
  expect(await page.evaluate(() => typeof ImageTracer !== 'undefined' && typeof NvanBinary !== 'undefined'), `[${label}] library trace tidak termuat`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  await ctx.close();
}

// NvanQR di /qr/: buat QR dari tautan, tombol kembali ada, tidak melebar. Di 1280px juga pulang-pergi:
// QR dibuat di halaman buat, lalu gambarnya dipindai di /qr/scan.html dan isinya harus sama.
async function visitQr(browser, base, { width }) {
  const label = `qr ${width}px`;
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${label}] error JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] request gagal: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`${base}qr/`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  expect((await page.locator('a.hub-back').getAttribute('href')) === '../', `[${label}] tombol kembali ke NvanHub tidak ada`);
  await page.fill('#link-input', 'contoh.com/halaman');
  await page.waitForTimeout(300);
  expect(await page.locator('#qr-canvas').isVisible(), `[${label}] QR tidak muncul setelah tautan diisi`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  if (width === 1280) {
    const dataUrl = await page.evaluate(() => QRCode.toDataURL('https://contoh.com/tes', { width: 300, margin: 4 }));
    const scan = await ctx.newPage();
    scan.on('pageerror', (e) => problems.push(`[${label}] pindai error JS: ${e.message}`));
    await scan.goto(`${base}qr/scan.html`, { waitUntil: 'load' });
    expect((await scan.locator('a.hub-back').getAttribute('href')) === '../', `[${label}] tombol kembali di halaman pindai tidak ada`);
    await scan.click('#image-tab');
    await scan.setInputFiles('#image-input', { name: 'qr.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
    await scan.waitForFunction(() => /berhasil dibaca/.test(document.getElementById('scan-status').textContent), null, { timeout: 8000 }).catch(() => {});
    const result = (await scan.textContent('#result-text')).trim();
    expect(result === 'https://contoh.com/tes', `[${label}] hasil pindai tidak sama (${result || 'kosong'})`);
    await scan.close();
  }
  await ctx.close();
}

// NvanExif di /exif/: halaman tampil, tombol kembali ada, tidak melebar, modul Leaflet ada di vendor/.
// Alur utama: pilih foto contoh, metadata terbaca, "Hapus semua" menghasilkan tautan unduh (blob:).
async function visitExif(browser, base, { width }) {
  const label = `exif ${width}px`;
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  // Modul yang gagal dimuat (MIME salah, path salah) tidak lewat pageerror, jadi konsol ikut dicek.
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${label}] console error: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${label}] error JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] request gagal: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`${base}exif/`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  expect((await page.locator('a.hub-back').getAttribute('href')) === '../', `[${label}] tombol kembali ke NvanHub tidak ada`);
  expect(await page.locator('#dropzone').isVisible(), `[${label}] area seret foto tidak tampil`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  const leaflet = await page.evaluate(async () => {
    const L = await import(new URL('vendor/leaflet.esm.js', location.href).href);
    return typeof L.map === 'function' && typeof L.tileLayer === 'function' && typeof L.circle === 'function';
  });
  expect(leaflet, `[${label}] modul Leaflet tidak termuat dari vendor/`);
  await page.setInputFiles('#file', path.join(root, 'exif/test/fixtures/sample.jpg'));
  await page.waitForSelector('#result:not([hidden])', { timeout: 8000 }).catch(() => {});
  expect(await page.locator('#result').isVisible(), `[${label}] hasil baca metadata tidak tampil`);
  await page.click('#btn-all');
  await page.waitForSelector('#done:not([hidden])', { timeout: 15000 }).catch(() => {});
  expect(await page.locator('#done').isVisible(), `[${label}] hasil foto bersih tidak tampil`);
  const href = await page.getAttribute('#download', 'href');
  expect(Boolean(href && href.startsWith('blob:')), `[${label}] tautan unduh foto bersih tidak ada`);
  const over2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over2 <= 0, `[${label}] hasil bersih menimbulkan scroll horizontal (${over2}px)`);
  await ctx.close();
}

// NvanCut di /cut/: beranda memuat semua link dari links.json, form ada, tombol kembali ke hub ada, tidak melebar.
async function visitCut(browser, base, { width }) {
  const label = `cut ${width}px`;
  const total = Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'cut/links.json'), 'utf8'))).length;
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${label}] error JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${label}] request gagal: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`${base}cut/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#shortlink-form').count()) === 1, `[${label}] form shortlink tidak ada`);
  expect((await page.locator('#links-list .link-card').count()) === total, `[${label}] daftar link tidak memuat ${total} alias`);
  expect((await page.locator('a.hub-back').getAttribute('href')) === '../', `[${label}] tombol kembali ke NvanHub tidak ada`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over <= 0, `[${label}] ada scroll horizontal (${over}px)`);
  await ctx.close();
}

// Halaman alias NvanCut (cut/<alias>/index.html) harus ada dan mengarah ke tujuan di links.json.
function checkCutPages() {
  const links = JSON.parse(fs.readFileSync(path.join(root, 'cut/links.json'), 'utf8'));
  for (const [alias, destination] of Object.entries(links)) {
    const file = path.join(root, 'cut', alias, 'index.html');
    const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const href = new URL(destination).href.replace(/&/g, '&amp;');
    expect(html.includes(`content="0; url=${href}"`), `[cut] halaman /${alias} tidak ada atau tidak mengarah ke ${destination}`);
  }
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
  const playTotal = JSON.parse(fs.readFileSync(path.join(root, 'play/games.json'), 'utf8')).length;
  await page.goto(`${base}play/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#catalog a[href^="player.html"]').count()) === playTotal, '[offline] katalog NvanPlay tidak tampil tanpa jaringan');
  // NvanVector: halaman dan library trace (termasuk Potrace di vendor/) harus ada di cache
  await page.goto(`${base}vector/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#file').count()) === 1, '[offline] NvanVector tidak tampil tanpa jaringan');
  expect(await page.evaluate(() => typeof ImageTracer !== 'undefined' && typeof NvanBinary !== 'undefined'), '[offline] library trace NvanVector tidak ada tanpa jaringan');
  // NvanQR: halaman buat dan pindai, pustaka QR, dan font ada di cache
  await page.goto(`${base}qr/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#link-input').count()) === 1, '[offline] NvanQR tidak tampil tanpa jaringan');
  expect(await page.evaluate(() => typeof QRCode !== 'undefined'), '[offline] pustaka QR NvanQR tidak ada tanpa jaringan');
  await page.goto(`${base}qr/scan.html`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#camera-button').count()) === 1, '[offline] halaman pindai NvanQR tidak tampil tanpa jaringan');
  // NvanCut: beranda dan daftar link ada di cache
  await page.goto(`${base}cut/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#shortlink-form').count()) === 1, '[offline] NvanCut tidak tampil tanpa jaringan');
  // NvanExif: halaman, modul vendor, dan font ada di cache. Foto diproses di browser, jadi tidak butuh jaringan.
  await page.goto(`${base}exif/`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  expect((await page.locator('#dropzone').count()) === 1, '[offline] NvanExif tidak tampil tanpa jaringan');
  expect(await page.evaluate(async () => {
    const L = await import(new URL('vendor/leaflet.esm.js', location.href).href);
    return typeof L.map === 'function';
  }), '[offline] modul Leaflet NvanExif tidak ada tanpa jaringan');
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
    await visitPlay(browser, base, { width: 375 });
    await visitPlay(browser, base, { width: 1280 });
    await visitVector(browser, base, { width: 375 });
    await visitVector(browser, base, { width: 1280 });
    await visitQr(browser, base, { width: 375 });
    await visitQr(browser, base, { width: 1280 });
    await visitCut(browser, base, { width: 375 });
    await visitCut(browser, base, { width: 1280 });
    await visitExif(browser, base, { width: 375 });
    await visitExif(browser, base, { width: 1280 });
    checkCutPages();
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
