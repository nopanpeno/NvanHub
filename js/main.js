// Baca data/projects.json, lalu gambar kartu. Bisa difilter per topik.
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

  // Nomor urut di daftar asli, jadi tetap sama saat kartu difilter. Hiasan saja.
  const no = document.createElement('span');
  no.className = 'card-no';
  no.setAttribute('aria-hidden', 'true');
  no.textContent = String(allProjects.indexOf(p) + 1).padStart(2, '0');

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
    // Tag = tombol filter. Klik lagi di tag yang aktif untuk melepas filter.
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = t;
    btn.dataset.tag = t;
    btn.setAttribute('aria-pressed', String(t === activeTag));
    btn.addEventListener('click', () => pickTag(t, p.name));
    li.append(btn);
    tags.append(li);
  }

  const links = document.createElement('div');
  links.className = 'links';
  links.append(makeLink(p.live, `Buka website ${p.name}`, 'Buka'), makeLink(p.repo, `Lihat kode ${p.name}`, 'Lihat kode'));

  card.append(no, title, tagline, desc, tags);
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
  activeTag = null;
  render();
}

// Tag di kartu diklik. Kartu dibangun ulang, jadi fokus dikembalikan ke tag yang sama
// (di kartu yang sama) setelah grid selesai diganti.
let focusAfter = null;
function pickTag(tag, name) {
  activeTag = activeTag === tag ? null : tag;
  focusAfter = { tag, name };
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

// Kabar untuk pembaca layar tiap filter berganti. Render pertama tidak diumumkan.
let rendered = false;
function announce(n) {
  const status = document.getElementById('status');
  if (rendered && status) status.textContent = `${n} proyek${activeTag ? `, topik ${activeTag}` : ''}`;
  rendered = true;
}

function render(animate = true) {
  const shown = allProjects.filter((p) => !activeTag || p.tags.includes(activeTag));
  announce(shown.length);

  swapGrid(() => {
    if (shown.length === 0) {
      showMessage('Tidak ada proyek di topik ini. Pilih topik lain atau hapus filter.', 'Hapus filter', clearFilters);
    } else {
      const cards = shown.map(makeCard);
      document.getElementById('grid').replaceChildren(...cards);
      window.NvanMotion?.revealCards(cards, animate);
      if (focusAfter) {
        const card = cards.find((c) => c.querySelector('h3')?.textContent === focusAfter.name);
        card?.querySelector(`[data-tag="${CSS.escape(focusAfter.tag)}"]`)?.focus({ preventScroll: true });
        focusAfter = null;
      }
    }
  }, animate);
  topicSync(); // dropdown selalu ikut keadaan filter
}

// Dropdown topik buatan sendiri (pola ARIA listbox). Tiap pilihan menunjukkan jumlah proyeknya, jadi tidak
// ada topik kosong. Tombol: Enter, Space, panah buka daftar. Di daftar: panah, Home, End, huruf (cari),
// Enter atau Space pilih, Escape atau Tab tutup tanpa memilih. Fokus kembali ke tombol saat tutup.
const topic = {
  btn: document.getElementById('tag'),
  list: document.getElementById('tag-list'),
  value: document.getElementById('tag-value'),
  items: [], // { value, label, el }
  active: 0, // indeks opsi yang menyala
  typed: '',
  typedTimer: 0,
};

function renderTopics() {
  const count = new Map();
  for (const t of allProjects.flatMap((p) => p.tags)) count.set(t, (count.get(t) ?? 0) + 1);

  topic.items = [{ value: '', label: 'Semua topik' }, ...[...count.keys()].sort().map((t) => ({ value: t, label: `${t} (${count.get(t)})` }))];
  topic.items.forEach((it, i) => {
    const el = document.createElement('li');
    el.id = `tag-opt-${i}`;
    el.style.setProperty('--i', i); // urutan masuk opsi (CSS)
    el.className = 'dropdown-opt';
    el.setAttribute('role', 'option');
    el.textContent = it.label;
    el.addEventListener('click', () => topicPick(i));
    el.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') topicHighlight(i); });
    it.el = el;
  });
  topic.list.replaceChildren(...topic.items.map((it) => it.el));
  topicSync();
}

// Samakan teks tombol dan pilihan terpilih dengan filter yang aktif.
function topicSync() {
  const sel = Math.max(0, topic.items.findIndex((it) => it.value === (activeTag ?? '')));
  if (topic.items.length) topic.value.textContent = topic.items[sel].label;
  topic.items.forEach((it, i) => it.el.setAttribute('aria-selected', String(i === sel)));
}

function topicHighlight(i, scroll = false) {
  topic.active = i;
  topic.items.forEach((it, j) => it.el.classList.toggle('is-active', j === i));
  topic.list.setAttribute('aria-activedescendant', topic.items[i].el.id);
  if (scroll) topic.items[i].el.scrollIntoView({ block: 'nearest' });
}

const topicIsOpen = () => topic.list.classList.contains('open');

function topicOpen() {
  if (!topic.items.length || topicIsOpen()) return;
  topic.list.classList.add('open');
  topic.btn.setAttribute('aria-expanded', 'true');
  topicHighlight(Math.max(0, topic.items.findIndex((it) => it.value === (activeTag ?? ''))));
  topic.list.focus({ preventScroll: true });
  topic.items[topic.active].el.scrollIntoView({ block: 'nearest' });
  topic.list.scrollIntoView({ block: 'nearest' }); // daftar tidak terpotong di tepi bawah layar
}

function topicClose(refocus = true) {
  if (!topicIsOpen()) return;
  topic.list.classList.remove('open');
  topic.btn.setAttribute('aria-expanded', 'false');
  topic.list.removeAttribute('aria-activedescendant');
  if (refocus) topic.btn.focus({ preventScroll: true });
}

function topicPick(i) {
  topicClose();
  const next = topic.items[i].value || null;
  if (next === activeTag) return;
  activeTag = next;
  render();
}

topic.btn.addEventListener('click', () => (topicIsOpen() ? topicClose() : topicOpen()));
topic.btn.addEventListener('keydown', (e) => {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault();
    topicOpen();
  }
});

topic.list.addEventListener('keydown', (e) => {
  const last = topic.items.length - 1;
  const move = { ArrowDown: Math.min(topic.active + 1, last), ArrowUp: Math.max(topic.active - 1, 0), Home: 0, End: last }[e.key];
  if (move !== undefined) {
    e.preventDefault();
    topicHighlight(move, true);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    topicPick(topic.active);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    topicClose();
  } else if (e.key === 'Tab') {
    topicClose(); // fokus pindah ke tombol, lalu Tab lanjut dari sana
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // Cari: ketik huruf awal opsi. Huruf yang sama berulang menggilir opsi yang cocok.
    clearTimeout(topic.typedTimer);
    topic.typed += e.key.toLowerCase();
    topic.typedTimer = setTimeout(() => { topic.typed = ''; }, 600);
    const order = topic.items.map((_, i) => (topic.active + 1 + i) % topic.items.length);
    const same = [...topic.typed].every((c) => c === topic.typed[0]);
    const hit = order.find((i) => topic.items[i].label.toLowerCase().startsWith(same ? topic.typed[0] : topic.typed));
    if (hit !== undefined) topicHighlight(hit, true);
  }
});

// Klik atau sentuh di luar dropdown menutup daftar, tanpa memindah fokus.
document.addEventListener('pointerdown', (e) => {
  if (topicIsOpen() && !e.target.closest('.dropdown')) topicClose(false);
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
