// Baca data/projects.json, lalu gambar kartu. Bisa dicari dan difilter per tag.
let allProjects = [];
let activeTag = null;

async function loadProjects() {
  const res = await fetch('data/projects.json');
  return res.json();
}

function makeCard(p) {
  const card = document.createElement('article');
  card.className = 'card';

  const title = document.createElement('h2');
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
  links.append(makeLink(p.live, 'Live'), makeLink(p.repo, 'Repo'));

  card.append(title, tagline, desc, tags, links);
  return card;
}

function makeLink(href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function render() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const shown = allProjects.filter((p) => {
    const hay = [p.name, p.tagline, p.desc, ...p.tags].join(' ').toLowerCase();
    const matchText = !q || hay.includes(q);
    const matchTag = !activeTag || p.tags.includes(activeTag);
    return matchText && matchTag;
  });

  const grid = document.getElementById('grid');
  if (shown.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty';
    msg.textContent = 'Tidak ada proyek yang cocok.';
    grid.replaceChildren(msg);
  } else {
    grid.replaceChildren(...shown.map(makeCard));
  }
  updateTagButtons();
}

function renderTags() {
  const box = document.getElementById('tags');
  const all = [...new Set(allProjects.flatMap((p) => p.tags))].sort();
  const buttons = all.map((tag) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter';
    b.textContent = tag;
    b.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      render();
    });
    return b;
  });
  box.replaceChildren(...buttons);
}

function updateTagButtons() {
  for (const b of document.querySelectorAll('#tags .filter')) {
    const on = b.textContent === activeTag;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

document.getElementById('search').addEventListener('input', render);

loadProjects().then((list) => {
  allProjects = list;
  renderTags();
  render();
});
