// Pakai (dari root repo NvanHub):
//   node cut/scripts/links.mjs check
//   LINK_ALIAS=nama LINK_URL=https://... node cut/scripts/links.mjs add
//   LINK_ALIAS=nama node cut/scripts/links.mjs remove
//   node cut/scripts/links.mjs pages
// Setelah add atau remove, jalankan "pages" supaya cut/<alias>/index.html ikut berubah.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Folder ini (cut/) dicari dari lokasi script, jadi jalan dari folder mana pun.
const CUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = process.env.LINKS_FILE || join(CUT_DIR, "links.json");
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{1,48}$/;
const GOOGLE_HOSTS = ["docs.google.com", "drive.google.com"];
const GOOGLE_NOISE = ["ouid", "rtpof", "sd"];
const TRACKING = [/^utm_/i, /^fbclid$/i, /^gclid$/i];

// Nama folder isi cut/ yang tidak boleh jadi alias.
const RESERVED = ["fonts", "logo", "scripts"];
// Penanda halaman alias yang dibuat script. Folder tanpa penanda ini tidak pernah dihapus.
const MARKER = "Mengalihkan ke";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

// Buang parameter pelacak dan ID akun Google dari link tujuan.
function cleanUrl(value) {
  const url = new URL(value);
  const google = GOOGLE_HOSTS.includes(url.hostname);
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.some((pattern) => pattern.test(key)) || (google && GOOGLE_NOISE.includes(key))) {
      url.searchParams.delete(key);
    }
  }
  return url.href;
}

function loadLinks() {
  let links;
  try {
    links = JSON.parse(readFileSync(FILE, "utf8"));
  } catch (error) {
    fail(`${FILE} tidak bisa dibaca sebagai JSON: ${error.message}`);
  }
  if (!links || Array.isArray(links) || typeof links !== "object") {
    fail(`${FILE} harus berupa objek JSON { "alias": "url" }.`);
  }
  return links;
}

function validate(links) {
  const seen = new Map();
  const errors = [];
  const warnings = [];
  for (const [alias, destination] of Object.entries(links)) {
    if (!ALIAS_PATTERN.test(alias)) {
      errors.push(`Alias "${alias}" tidak valid (huruf, angka, - dan _, maksimal 48).`);
    }
    const lower = alias.toLowerCase();
    if (RESERVED.includes(lower)) {
      errors.push(`Alias "${alias}" dipakai oleh folder situs. Pilih nama lain.`);
    }
    if (seen.has(lower)) {
      errors.push(`Alias "${alias}" bentrok dengan "${seen.get(lower)}" (huruf besar/kecil dianggap sama).`);
    }
    seen.set(lower, alias);
    if (typeof destination !== "string" || !isWebUrl(destination)) {
      errors.push(`Tujuan untuk "${alias}" bukan URL http(s) yang valid.`);
      continue;
    }
    if (cleanUrl(destination) !== new URL(destination).href) {
      warnings.push(`"${alias}" punya parameter pelacak atau ID akun Google. Hapus parameter itu dari links.json secara manual.`);
    }
  }
  return { errors, warnings };
}

function report({ errors, warnings }) {
  for (const message of warnings) console.log(`::warning::${message}`);
  if (errors.length) {
    for (const message of errors) console.error(`::error::${message}`);
    process.exit(1);
  }
}

function check() {
  const links = loadLinks();
  report(validate(links));
  console.log(`OK: ${Object.keys(links).length} link valid.`);
}

function add() {
  const alias = (process.env.LINK_ALIAS || "").trim();
  const destination = (process.env.LINK_URL || "").trim();
  if (!ALIAS_PATTERN.test(alias)) {
    fail("Alias hanya boleh huruf, angka, tanda hubung, dan garis bawah (maksimal 48 karakter).");
  }
  if (RESERVED.includes(alias.toLowerCase())) fail(`Alias "${alias}" dipakai oleh folder situs. Pilih nama lain.`);
  if (!isWebUrl(destination)) fail("Link tujuan harus URL http:// atau https:// yang valid.");

  const links = loadLinks();
  const clash = Object.keys(links).find((key) => key.toLowerCase() === alias.toLowerCase());
  if (clash) fail(`Alias "${alias}" sudah dipakai (sebagai "${clash}").`);

  const cleaned = cleanUrl(destination);
  links[alias] = cleaned;
  writeFileSync(FILE, `${JSON.stringify(links, null, 2)}\n`);

  const note = cleaned === new URL(destination).href ? "" : " (parameter pelacak dibuang)";
  console.log(`Ditambahkan: /${alias} -> ${cleaned}${note}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Ditambahkan \`/${alias}\` → ${cleaned}${note}\n`);
  }
}

function remove() {
  const alias = (process.env.LINK_ALIAS || "").trim();
  if (!alias) fail("Alias wajib diisi.");
  const links = loadLinks();
  const key = Object.keys(links).find((item) => item.toLowerCase() === alias.toLowerCase());
  if (!key) fail(`Alias "${alias}" tidak ditemukan di links.json.`);

  const destination = links[key];
  delete links[key];
  writeFileSync(FILE, `${JSON.stringify(links, null, 2)}\n`);

  console.log(`Dihapus: /${key} -> ${destination}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Dihapus \`/${key}\` (dari ${destination})\n`);
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Halaman kecil yang langsung mengalihkan. Disajikan dengan status 200.
function redirectPage(destination) {
  const href = new URL(destination).href;
  const url = escapeHtml(href);
  const script = JSON.stringify(href).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Mengalihkan…</title>
  <meta http-equiv="refresh" content="0; url=${url}">
  <script>window.location.replace(${script});</script>
</head>
<body>
  <p>${MARKER} <a href="${url}">${url}</a>…</p>
</body>
</html>
`;
}

function isAliasPage(folder) {
  const file = join(folder, "index.html");
  return existsSync(file) && readFileSync(file, "utf8").includes(MARKER);
}

// Buat cut/<alias>/index.html untuk tiap link, dan hapus folder alias yang sudah tidak ada di links.json.
function pages() {
  const links = loadLinks();
  report(validate(links));

  for (const [alias, destination] of Object.entries(links)) {
    const folder = join(CUT_DIR, alias);
    if (existsSync(folder) && !isAliasPage(folder)) fail(`Alias "${alias}" bentrok dengan isi situs.`);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "index.html"), redirectPage(destination));
  }

  for (const name of readdirSync(CUT_DIR)) {
    const folder = join(CUT_DIR, name);
    if (!ALIAS_PATTERN.test(name) || RESERVED.includes(name.toLowerCase())) continue;
    if (!statSync(folder).isDirectory() || Object.hasOwn(links, name)) continue;
    if (isAliasPage(folder)) rmSync(folder, { recursive: true, force: true });
  }
  console.log(`Halaman link: ${Object.keys(links).length} alias di ${CUT_DIR}`);
}

const command = process.argv[2];
if (command === "check") check();
else if (command === "add") add();
else if (command === "remove") remove();
else if (command === "pages") pages();
else fail("Pakai: node cut/scripts/links.mjs check|add|remove|pages");
