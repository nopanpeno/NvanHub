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
  links.append(makeLink(p.live, `Buka demo ${p.name}`, 'Buka demo'), makeLink(p.repo, `Lihat kode ${p.name}`, 'Lihat kode'));

  card.append(title, tagline, desc, tags, links);
  return card;
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

// animate=false: dipakai saat mengetik di kolom cari, kartu ganti tanpa gerak.
function render(animate = true) {
  const raw = document.getElementById('search').value;
  document.getElementById('clear').hidden = raw === '';
  const q = raw.trim().toLowerCase();
  const shown = allProjects.filter((p) => {
    const hay = [p.name, p.tagline, p.desc, ...p.tags].join(' ').toLowerCase();
    const matchText = !q || hay.includes(q);
    const matchTag = !activeTag || p.tags.includes(activeTag);
    return matchText && matchTag;
  });

  if (shown.length === 0) {
    showMessage('Tidak ada proyek yang cocok. Coba kata kunci lain atau hapus filter.', 'Hapus filter', clearFilters);
  } else {
    const cards = shown.map(makeCard);
    document.getElementById('grid').replaceChildren(...cards);
    window.NvanMotion?.revealCards(cards, animate);
  }
  updateTagButtons();
}

function renderTags() {
  const box = document.getElementById('tags');
  const all = [...new Set(allProjects.flatMap((p) => p.tags))].sort();

  const makeTag = (label, tag) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter';
    b.dataset.tag = tag ?? '';
    b.textContent = label;
    b.addEventListener('click', () => {
      activeTag = tag === null || activeTag === tag ? null : tag;
      render();
    });
    return b;
  };

  box.replaceChildren(makeTag('Semua', null), ...all.map((t) => makeTag(t, t)));
}

function updateTagButtons() {
  for (const b of document.querySelectorAll('#tags .filter')) {
    const on = (activeTag ?? '') === b.dataset.tag;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

document.getElementById('search').addEventListener('input', () => render(false));

// Hapus teks pencarian saja. Filter tag tetap.
document.getElementById('clear').addEventListener('click', () => {
  const search = document.getElementById('search');
  search.value = '';
  render(false);
  search.focus();
});

loadProjects()
  .then((list) => {
    allProjects = list;
    renderTags();
    render();
  })
  .catch(() => {
    showMessage('Proyek belum bisa dimuat. Coba muat ulang.', 'Muat ulang', () => location.reload());
  });
