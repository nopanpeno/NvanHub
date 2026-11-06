// Baca data/projects.json lalu gambar satu kartu per proyek.
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

loadProjects().then((list) => {
  const grid = document.getElementById('grid');
  grid.replaceChildren(...list.map(makeCard));
});
