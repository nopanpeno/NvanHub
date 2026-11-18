// Baca data/projects.json, gambar kartu, lalu filter lewat tab kategori (elemen sakuga-tabs).
// Kategori tiap proyek ada di kolom "kategori" di data/projects.json.
const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
const toast = document.getElementById('toast');
const cta = document.getElementById('cta');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const cards = [];

async function loadProjects() {
  const res = await fetch('data/projects.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeLink(href, label, text, cls) {
  const a = el('a', cls, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', `${label}, di tab baru`);
  return a;
}

// Cerita opsional ("kenapa aku bikin ini"). Pakai <details> asli, jadi Enter dan Space jalan sendiri.
function makeStory(p) {
  const box = el('details', 'story');
  const sum = el('summary');
  const open = el('span', 's-open', 'Baca ceritanya');
  const close = el('span', 's-close', 'Tutup cerita');
  const who = el('span', 'sr-only', ` ${p.name}`);
  open.append(who.cloneNode(true));
  close.append(who);
  sum.append(open, close);
  box.append(sum, el('p', null, p.story));
  return box;
}

// Salin tautan: tanda selesai hanya kalau benar-benar tersalin.
async function copyLink(btn, p) {
  try {
    await navigator.clipboard.writeText(p.live);
    btn.done();
    toast.show(`Tautan ${p.name} disalin`);
  } catch {
    toast.show('Belum bisa menyalin. Coba lagi.');
  }
}

function makeCard(p, no) {
  const card = el('article', 'card');
  card.dataset.kategori = p.kategori ?? '';

  // Nomor urut di daftar asli, jadi tetap sama saat kartu difilter. Hiasan saja.
  const badge = el('span', 'no', String(no).padStart(2, '0'));
  badge.setAttribute('aria-hidden', 'true');

  const actions = el('div', 'actions');
  const copy = document.createElement('sakuga-button');
  copy.setAttribute('variant', 'secondary');
  copy.className = 'copy';
  copy.textContent = 'Salin tautan';
  copy.addEventListener('click', () => copyLink(copy, p));
  actions.append(
    makeLink(p.live, `Buka website ${p.name}`, 'Buka', 'open'),
    makeLink(p.repo, `Lihat kode ${p.name}`, 'Lihat kode', 'code'),
    copy,
  );

  card.append(
    badge,
    el('h3', null, p.name),
    el('p', 'tagline', p.tagline),
    el('p', 'desc', p.desc),
    el('p', 'meta', p.tags.join(' · ')),
  );
  if (p.story) card.append(makeStory(p));
  card.append(actions);
  return card;
}

// Tampilkan kartu sesuai kategori. Kembalikan jumlah yang tampil.
function applyFilter(value) {
  let n = 0;
  for (const c of cards) {
    const show = value === 'semua' || c.dataset.kategori === value;
    c.hidden = !show;
    if (show) n++;
  }
  return n;
}

function showError() {
  const box = el('div', 'empty');
  box.append(el('p', null, 'Proyek belum bisa dimuat. Coba muat ulang.'));
  const btn = el('button', 'btn', 'Muat ulang');
  btn.type = 'button';
  btn.addEventListener('click', () => location.reload());
  box.append(btn);
  grid.replaceChildren(box);
}

tabs.addEventListener('change', (e) => {
  const { value, label } = e.detail;
  const n = applyFilter(value);
  toast.show(`${n} proyek di ${label}`);
});

// Tombol hero: turun ke daftar proyek.
cta.addEventListener('click', () => {
  document.getElementById('proyek').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
});

loadProjects()
  .then((list) => {
    list.forEach((p, i) => {
      const card = makeCard(p, i + 1);
      cards.push(card);
      grid.append(card);
    });
  })
  .catch(showError);
