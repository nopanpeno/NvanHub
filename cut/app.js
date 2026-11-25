const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;
const RESERVED_ALIASES = ["fonts", "logo", "scripts"];
const WORKFLOW_URL = "https://github.com/nopanpeno/NvanHub/actions/workflows/cut-add-link.yml";
const DELETE_WORKFLOW_URL = "https://github.com/nopanpeno/NvanHub/actions/workflows/cut-delete-link.yml";
const form = document.querySelector("#shortlink-form");
const aliasField = document.querySelector("#alias");
const destinationField = document.querySelector("#destination");
const message = document.querySelector("#form-message");
const list = document.querySelector("#links-list");
const count = document.querySelector("#link-count");
const empty = document.querySelector("#links-empty");
const aliasPreview = document.querySelector("#alias-preview");
const toast = document.querySelector("#toast");

const siteBase = new URL("./", window.location.href);

function shortUrl(alias) {
  return new URL(encodeURIComponent(alias), siteBase).href;
}

function updateAliasPreview() {
  const alias = aliasField.value.trim();
  aliasPreview.textContent = alias ? shortUrl(alias) : `${siteBase.host}${siteBase.pathname}nama-link`;
}
updateAliasPreview();
aliasField.addEventListener("input", updateAliasPreview);

// Pesan galat: kalau dari validasi kolom, dicatat di dataset.field supaya bisa dihapus saat kolom difokus.
function showMessage(text, type = "error", field = "") {
  message.textContent = text;
  message.className = `form-message ${type}`;
  message.dataset.field = field;
  message.hidden = false;
}

function clearFieldError(fieldId) {
  if (message.dataset.field === fieldId && message.classList.contains("error")) message.hidden = true;
}

function validDestination(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function destinationError(value) {
  if (!value) return "Link tujuan wajib diisi.";
  if (!validDestination(value)) return "Masukkan URL yang valid dengan protokol http:// atau https://.";
  return "";
}

function aliasError(value) {
  if (!value) return "Nama pendek wajib diisi.";
  if (!ALIAS_PATTERN.test(value)) return "Nama pendek hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.";
  if (RESERVED_ALIASES.includes(value.toLowerCase())) return "Nama pendek ini dipakai oleh situs. Coba alias lain.";
  return "";
}

// Validasi saat kolom ditinggalkan (blur). Saat kolom difokus lagi atau diketik, galatnya hilang.
function checkOnBlur(field, errorText) {
  const error = errorText(field.value.trim());
  if (error) showMessage(error, "error", field.id);
  else clearFieldError(field.id);
}
destinationField.addEventListener("blur", () => checkOnBlur(destinationField, destinationError));
aliasField.addEventListener("blur", () => checkOnBlur(aliasField, aliasError));
for (const field of [destinationField, aliasField]) {
  field.addEventListener("focus", () => clearFieldError(field.id));
  field.addEventListener("input", () => clearFieldError(field.id));
}

// Enter di kolom teks langsung kirim, karena form ini tidak punya tombol submit asli.
form.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.tagName === "INPUT") {
    event.preventDefault();
    form.requestSubmit();
  }
});

function notify(text) {
  toast.show(text);
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const temporary = document.createElement("textarea");
  temporary.value = value;
  temporary.style.position = "fixed";
  temporary.style.opacity = "0";
  document.body.append(temporary);
  temporary.select();
  const copied = document.execCommand("copy");
  temporary.remove();
  if (!copied) throw new Error("copy_failed");
}

// Tombol salin: sakuga-button. Label terlihat, dan teks tersembunyi menyebut alias untuk pembaca layar.
function setButtonLabel(button, visible, hidden = "") {
  const parts = [document.createTextNode(visible)];
  if (hidden) {
    const note = document.createElement("span");
    note.className = "visually-hidden";
    note.textContent = hidden;
    parts.push(note);
  }
  button.replaceChildren(...parts);
}

function copyButton(label, value, hidden = "") {
  const button = document.createElement("sakuga-button");
  button.setAttribute("variant", "secondary");
  button.setAttribute("type", "button");
  setButtonLabel(button, label, hidden);
  button.addEventListener("click", async () => {
    try {
      await copyText(value);
      setButtonLabel(button, "Tersalin", hidden);
      notify("Teks sudah disalin");
    } catch {
      setButtonLabel(button, "Gagal menyalin", hidden);
    }
    window.setTimeout(() => setButtonLabel(button, label, hidden), 1500);
  });
  return button;
}

function renderLinks(links) {
  const entries = Object.entries(links);
  count.textContent = `${entries.length} link tersedia`;
  empty.hidden = entries.length > 0;
  list.replaceChildren();

  for (const [alias, destination] of entries) {
    const card = document.createElement("article");
    card.className = "link-card";
    const link = document.createElement("a");
    link.className = "link-alias";
    link.href = shortUrl(alias);
    link.textContent = `/${alias}`;
    const target = document.createElement("span");
    target.className = "link-url";
    target.textContent = destination;
    target.title = destination;
    const actions = document.createElement("div");
    actions.className = "link-actions";
    actions.append(
      copyButton("Salin", link.href, `shortlink /${alias}`),
    );
    const remove = document.createElement("button");
    remove.className = "text-button";
    remove.type = "button";
    remove.setAttribute("aria-label", `Hapus shortlink ${alias}`);
    remove.title = "Hapus shortlink";
    remove.textContent = "Hapus";
    remove.addEventListener("click", () => showDeleteHelp(alias));
    actions.append(remove);
    card.append(link, target, actions);
    list.append(card);
  }
}

function showDeleteHelp(alias) {
  const title = document.createElement("strong");
  title.textContent = `Siap dihapus: /${alias}`;
  const steps = document.createElement("span");
  steps.textContent = "Buka workflow “Hapus shortlink” di GitHub, tekan Run workflow, lalu tempel alias (tombol salin ada di bawah). Link mati sekitar 1–2 menit kemudian.";
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const workflow = document.createElement("a");
  workflow.className = "btn";
  workflow.href = DELETE_WORKFLOW_URL;
  workflow.target = "_blank";
  workflow.rel = "noopener noreferrer";
  workflow.textContent = "Buka workflow";
  actions.append(copyButton("Salin alias", alias), workflow);
  message.replaceChildren(title, steps, actions);
  message.className = "form-message success";
  message.dataset.field = "";
  message.hidden = false;
  message.scrollIntoView({ block: "nearest" });
}

async function loadLinks() {
  try {
    const response = await fetch(new URL("links.json", siteBase));
    if (!response.ok) throw new Error("links_unavailable");
    const links = await response.json();
    if (!links || Array.isArray(links) || typeof links !== "object") throw new Error("invalid_config");
    renderLinks(links);
    return links;
  } catch {
    renderLinks({});
    showMessage("Daftar link belum dapat dimuat. Coba muat ulang halaman atau hubungi pemilik situs.");
    return null;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const alias = aliasField.value.trim();
  const destination = destinationField.value.trim();

  // Fokus dulu, baru tampilkan pesan: fokus ikut menghapus galat kolom itu.
  const destinationProblem = destinationError(destination);
  if (destinationProblem) {
    destinationField.focus();
    showMessage(destinationProblem, "error", "destination");
    return;
  }
  const aliasProblem = aliasError(alias);
  if (aliasProblem) {
    aliasField.focus();
    showMessage(aliasProblem, "error", "alias");
    return;
  }

  const links = await loadLinks();
  if (!links) {
    // Daftar tidak termuat, jadi cek alias ganda tidak bisa dipercaya. Pesan sudah tampil.
    return;
  }
  if (Object.keys(links).some((registered) => registered.toLowerCase() === alias.toLowerCase())) {
    aliasField.focus();
    showMessage("Nama pendek ini sudah dipakai. Coba alias lain.", "error", "alias");
    return;
  }

  const title = document.createElement("strong");
  title.textContent = `Siap ditambahkan: ${shortUrl(alias)}`;
  const steps = document.createElement("span");
  steps.textContent = "Buka workflow “Tambah shortlink” di GitHub, tekan Run workflow, lalu tempel alias dan link tujuan (tombol salin ada di bawah). Link aktif sekitar 1–2 menit kemudian.";
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const workflow = document.createElement("a");
  workflow.className = "btn";
  workflow.href = WORKFLOW_URL;
  workflow.target = "_blank";
  workflow.rel = "noopener noreferrer";
  workflow.textContent = "Buka workflow";
  actions.append(copyButton("Salin alias", alias), copyButton("Salin link tujuan", destination), workflow);
  message.replaceChildren(title, steps, actions);
  message.className = "form-message success";
  message.dataset.field = "";
  message.hidden = false;
});

loadLinks();
