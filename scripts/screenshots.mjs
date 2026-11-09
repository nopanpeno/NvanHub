// Ambil tangkapan layar desktop (1280x720) tiap proyek di data/projects.json.
// Hasil: assets/previews/<nama>.png, lalu kolom "preview" di projects.json diisi.
//
// Jalankan dari akar repo, di komputermu (bukan di sesi Claude, yang tidak bisa buka situs live):
//   npm install --no-save playwright
//   npx playwright install chromium
//   node scripts/screenshots.mjs            # semua proyek
//   node scripts/screenshots.mjs nvanqr     # satu proyek saja
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const FILE = 'data/projects.json';
const DIR = 'assets/previews';
const only = process.argv[2]?.toLowerCase();

const projects = JSON.parse(await readFile(FILE, 'utf8'));
await mkdir(DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

for (const p of projects) {
  const slug = p.name.toLowerCase();
  if (only && slug !== only) continue;
  try {
    await page.goto(p.live, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500); // beri waktu animasi masuk selesai
    await page.screenshot({ path: `${DIR}/${slug}.png` });
    p.preview = `${DIR}/${slug}.png`;
    console.log(`ok     ${p.name}`);
  } catch (err) {
    console.log(`gagal  ${p.name}: ${err.message.split('\n')[0]}`);
  }
}
await browser.close();

// Tulis ulang dengan gaya yang sama: daftar tags tetap satu baris.
const text = JSON.stringify(projects, null, 2)
  .replace(/\[\s+("[^\]]*?")\s+\]/g, (m) => m.replace(/\s*\n\s*/g, ' ').replace('[ ', '[').replace(' ]', ']'));
await writeFile(FILE, text + '\n');
