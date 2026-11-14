// Cek statis, tanpa dependensi. Jalankan: node scripts/check.mjs
// Memeriksa data JSON, syntax JS, file yang dirujuk halaman, dan memastikan tidak ada
// ketergantungan ke CDN. Keluar dengan kode 1 kalau ada yang salah.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (msg) => problems.push(msg);
const read = (p) => readFileSync(join(root, p), 'utf8');

function json(path) {
  try {
    return JSON.parse(read(path));
  } catch (e) {
    fail(`${path}: JSON tidak valid (${e.message})`);
    return null;
  }
}

const isHttps = (s) => typeof s === 'string' && /^https:\/\/[^\s]+$/.test(s);
const text = (v) => typeof v === 'string' && v.trim().length > 0;

// ---- data/projects.json: kolom wajib, tipe, dan nama unik ----
const projects = json('data/projects.json');
if (projects) {
  if (!Array.isArray(projects) || projects.length === 0) fail('data/projects.json: harus berupa daftar berisi minimal satu proyek');
  else {
    const names = new Set();
    projects.forEach((p, i) => {
      const at = `data/projects.json #${i + 1} (${p?.name ?? 'tanpa nama'})`;
      for (const k of ['name', 'tagline', 'desc']) if (!text(p[k])) fail(`${at}: kolom "${k}" kosong`);
      for (const k of ['repo', 'live']) if (!isHttps(p[k])) fail(`${at}: kolom "${k}" harus tautan https`);
      if (!Array.isArray(p.tags) || p.tags.length === 0 || !p.tags.every(text)) fail(`${at}: "tags" harus daftar teks, minimal satu`);
      if ('story' in p && !text(p.story)) fail(`${at}: "story" kalau ada tidak boleh kosong`);
      if (p.story && p.story.length > 300) fail(`${at}: "story" ${p.story.length} karakter, jaga di bawah 300 supaya kartu tidak kepanjangan`);
      if (names.has(p.name)) fail(`${at}: nama proyek dobel`);
      names.add(p.name);
    });
  }
}

// ---- data/mascot.json: daftar kalimat pendek (balon harus muat di HP) ----
const mascot = json('data/mascot.json');
if (mascot) {
  if (!Array.isArray(mascot) || mascot.length < 2) fail('data/mascot.json: butuh daftar minimal dua sapaan (satu sapaan tidak bisa berganti)');
  else mascot.forEach((s, i) => {
    if (!text(s)) fail(`data/mascot.json #${i + 1}: kalimat kosong`);
    else if (s.length > 120) fail(`data/mascot.json #${i + 1}: ${s.length} karakter, jaga sekitar 90 supaya balon muat di HP`);
  });
}

// ---- syntax semua file JS ----
const jsFiles = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js'));
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', join(root, 'js', f)], { stdio: 'pipe' });
  } catch (e) {
    fail(`js/${f}: syntax salah\n${String(e.stderr).trim().split('\n').slice(0, 4).join('\n')}`);
  }
}

// ---- index.html: file yang dirujuk harus ada, tidak ada CDN, semua js dimuat ----
const html = read('index.html');
const refs = [...html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
for (const r of refs) {
  if (/^https?:\/\//.test(r) || r.startsWith('//')) fail(`index.html: "${r}" dimuat dari luar. Simpan filenya di repo (assets/vendor atau assets/fonts).`);
  else if (!r.startsWith('data:') && !r.startsWith('#') && !existsSync(join(root, r.split(/[?#]/)[0]))) fail(`index.html: file "${r}" tidak ada`);
}
for (const f of jsFiles) if (!html.includes(`src="js/${f}"`)) fail(`index.html: js/${f} ada di repo tapi tidak dimuat`);

// ---- CSS: url() lokal harus ada, tanpa @import atau url luar ----
const css = read('css/style.css');
if (/@import/.test(css)) fail('css/style.css: jangan pakai @import (muat lewat <link> di index.html, atau simpan lokal)');
for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
  const u = m[1];
  if (u.startsWith('data:')) continue;
  if (/^https?:\/\//.test(u) || u.startsWith('//')) fail(`css/style.css: url(${u}) dimuat dari luar`);
  else if (!existsSync(join(root, 'css', u.split(/[?#]/)[0]))) fail(`css/style.css: file "${u}" tidak ada`);
}

// ---- manifest.json: ikon yang didaftar harus ada ----
const manifest = json('manifest.json');
for (const ic of manifest?.icons ?? []) {
  if (!existsSync(join(root, ic.src))) fail(`manifest.json: ikon "${ic.src}" tidak ada`);
}

// ---- sw.js: syntax, semua aset yang didaftar harus ada, tiap tool punya folder dan cache sendiri.
// Hub gagal dipasang kalau satu aset hub hilang, jadi ini dicek di sini, bukan di browser. ----
try {
  execFileSync(process.execPath, ['--check', join(root, 'sw.js')], { stdio: 'pipe' });
} catch (e) {
  fail(`sw.js: syntax salah\n${String(e.stderr).trim().split('\n').slice(0, 4).join('\n')}`);
}
const sw = read('sw.js');
const hubBody = sw.match(/const HUB = \{[\s\S]*?assets:\s*\[([\s\S]*?)\]/)?.[1];
const hubCache = sw.match(/const HUB = \{\s*cache:\s*'([^']+)'/)?.[1];
const tools = [...sw.matchAll(/(\w+):\s*\{\s*cache:\s*'([^']+)',\s*assets:\s*\[([\s\S]*?)\]/g)];
if (hubBody === undefined || !hubCache) fail('sw.js: blok HUB (cache dan assets) tidak terbaca');
const lists = [['hub', hubBody ?? ''], ...tools.map((m) => [m[1], m[3]])];
for (const [owner, body] of lists) {
  for (const [, p] of body.matchAll(/'([^']+)'/g)) {
    const file = p.endsWith('/') ? `${p}index.html` : p;
    if (!existsSync(join(root, file))) fail(`sw.js (${owner}): aset "${p}" tidak ada`);
  }
}
const cacheNames = [hubCache, ...tools.map((m) => m[2])];
if (cacheNames.some((c) => !c) || new Set(cacheNames).size !== cacheNames.length) {
  fail('sw.js: nama cache harus ada dan tidak boleh dobel (tiap tool punya cache sendiri)');
}
for (const [, tool] of tools) {
  if (!existsSync(join(root, tool, 'index.html'))) fail(`sw.js: tool "${tool}" tidak punya ${tool}/index.html`);
}

// ---- pass/index.html: punya link manifest, dan file manifest-nya ada ----
const passManifest = read('pass/index.html').match(/<link rel="manifest" href="([^"]+)"/);
if (!passManifest) fail('pass/index.html: link manifest tidak ada');
else if (!existsSync(join(root, 'pass', passManifest[1]))) fail(`pass/index.html: manifest "${passManifest[1]}" tidak ada`);

if (problems.length) {
  console.error(`Cek gagal (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Cek lolos: ${projects?.length ?? 0} proyek, ${mascot?.length ?? 0} sapaan, ${jsFiles.length} file JS, ${refs.length} rujukan di index.html.`);
