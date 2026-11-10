// Baca data/projects.json, lalu gambar kartu. Bisa dicari dan difilter per tag.
let allProjects = [];
let activeTag = null;

async function loadProjects() {
  const res = await fetch('data/projects.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function makeCard(p) {
  const card = document.createElement('article');
  card.className = 'card';

  const title = document.createElement('h3');
  title.textContent = p.name;

  const tagline = document.createElement('p');
  tagline.className = 'tagline';
  tagline.textContent = p.tagline;

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = p.desc;

  const tags = document.createElement('ul');
  tags.className = 'tags';
  for (const t of p.tags) {
    const li = document.createElement('li');
    li.textContent = t;
    tags.append(li);
  }

  const links = document.createElement('div');
  links.className = 'links';
  links.append(makeLink(p.live, `Buka website ${p.name}`, 'Buka website'), makeLink(p.repo, `Lihat kode ${p.name}`, 'Lihat kode'));

  card.append(title, tagline, desc, tags);
  if (p.story) card.append(makeStory(p));
  card.append(links);
  return card;
}

// Cerita opsional ("kenapa aku bikin ini"). Pakai <details> asli: Enter dan Space jalan sendiri,
// tanpa JS tambahan. Proyek tanpa kolom story tidak punya tombol.
function makeStory(p) {
  const box = document.createElement('details');
  box.className = 'story';

  const sum = document.createElement('summary');
  // Nama accessible = teks yang terlihat + nama proyek (tersembunyi). Tanpa aria-label, jadi cocok
  // dengan kontrol suara, dan label ikut berganti saat terbuka.
  const label = (cls, text) => {
    const s = document.createElement('span');
    s.className = cls;
    s.append(text);
    const who = document.createElement('span');
    who.className = 'sr-only';
    who.textContent = ` ${p.name}`;
    s.append(who);
    return s;
  };
  sum.append(label('story-open', 'Baca ceritanya'), label('story-close', 'Tutup cerita'));

  const text = document.createElement('p');
  text.textContent = p.story;

  box.append(sum, text);
  return box;
}

function makeLink(href, label, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  a.setAttribute('aria-label', `${label}, di tab baru`);
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function clearFilters() {
  document.getElementById('search').value = '';
  activeTag = null;
  render();
}

// Tampilkan satu pesan dengan satu tombol aksi di area grid.
function showMessage(text, buttonText, onClick) {
  const box = document.createElement('div');
  box.className = 'empty';

  const msg = document.createElement('p');
  msg.textContent = text;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'filter';
  btn.textContent = buttonText;
  btn.addEventListener('click', onClick);

  box.append(msg, btn);
  document.getElementById('grid').replaceChildren(box);
  window.NvanMotion?.revealCards([]); // hentikan animasi kartu yang tersisa
  window.NvanMotion?.fadeIn(box);
}

// Ganti isi grid. Saat animate, isi lama pudar dulu (kartu atau pesan), baru build() jalan.
// swapId menjaga urutan: kalau filter berganti cepat, hanya yang terakhir yang dijalankan.
let swapId = 0;
function swapGrid(build, animate) {
  const id = ++swapId;
  const old = [...document.getElementById('grid').children];
  const run = () => { if (id === swapId) build(); };
  if (animate && old.length && window.NvanMotion?.fadeOut) window.NvanMotion.fadeOut(old, run);
  else run();
}

// animate=false: dipakai saat mengetik di kolom cari, kartu ganti tanpa gerak.
function render(animate = true) {
  const raw = document.getElementById('search').value;
  document.getElementById('clear').hidden = raw === '';
  const q = raw.trim().toLowerCase();
  const shown = allProjects.filter((p) => {
    const hay = [p.name, p.tagline, p.desc, p.story ?? '', ...p.tags].join(' ').toLowerCase();
    const matchText = !q || hay.includes(q);
    const matchTag = !activeTag || p.tags.includes(activeTag);
    return matchText && matchTag;
  });

  swapGrid(() => {
    if (shown.length === 0) {
      showMessage('Tidak ada proyek yang cocok. Coba kata kunci lain atau hapus filter.', 'Hapus filter', clearFilters);
    } else {
      const cards = shown.map(makeCard);
      document.getElementById('grid').replaceChildren(...cards);
      window.NvanMotion?.revealCards(cards, animate);
    }
  }, animate);
  document.getElementById('tag').value = activeTag ?? ''; // dropdown selalu ikut keadaan filter
}

// Isi dropdown topik. Tiap pilihan menunjukkan jumlah proyeknya, jadi tidak ada topik kosong.
function renderTopics() {
  const select = document.getElementById('tag');
  const count = new Map();
  for (const t of allProjects.flatMap((p) => p.tags)) count.set(t, (count.get(t) ?? 0) + 1);

  const options = [...count.keys()].sort().map((t) => {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = `${t} (${count.get(t)})`;
    return o;
  });
  const all = select.options[0]; // "Semua topik" sudah ada di HTML
  select.replaceChildren(all, ...options);
}

document.getElementById('tag').addEventListener('change', (e) => {
  activeTag = e.target.value || null;
  render();
});

document.getElementById('search').addEventListener('input', () => render(false));

// Hapus teks pencarian saja. Topik tetap.
document.getElementById('clear').addEventListener('click', () => {
  const search = document.getElementById('search');
  search.value = '';
  render(false);
  search.focus();
});

loadProjects()
  .then((list) => {
    allProjects = list;
    renderTopics();
    render();
  })
  .catch(() => {
    showMessage('Proyek belum bisa dimuat. Coba muat ulang.', 'Muat ulang', () => location.reload());
  });
