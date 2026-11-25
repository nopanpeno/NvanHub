
const $ = (selector) => document.querySelector(selector);
const canvas = $('#qr-canvas');
let contentType = 'link';
let exportSize = 512;
let currentPayload = '';
let renderId = 0;

function escapeWifi(value) {
  return value.replace(/[\\;:,\"]/g, (character) => `\\${character}`);
}

// Input punya awalan "https://" di layar, jadi pengguna boleh mengetik tanpa skema.
// Skema lain (javascript:, mailto:, dll) tetap ditolak.
function normalizeLink(raw) {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(javascript|data|vbscript|file|ftp|mailto|tel|sms|blob):/i.test(raw) || /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return '';
  return `https://${raw.replace(/^\/+/, '')}`;
}

function getPayload() {
  if (contentType === 'link') {
    const value = $('#link-input').value.trim();
    if (!value) return { error: 'Masukkan URL untuk membuat QR code.' };
    try {
      const url = new URL(normalizeLink(value));
      const host = url.hostname;
      if (!['http:', 'https:'].includes(url.protocol) || !host || !(host.includes('.') || host === 'localhost')) throw new Error();
      return { value: url.href };
    } catch {
      return { error: 'URL tidak valid. Contoh: contoh.com/halaman atau https://contoh.com.' };
    }
  }
  if (contentType === 'text') {
    const value = $('#text-input').value;
    if (!value.trim()) return { error: 'Tulis teks untuk membuat QR code.' };
    if (value.length > 1200) return { error: 'Teks terlalu panjang. Batasi hingga 1.200 karakter.' };
    return { value };
  }
  const ssid = $('#ssid-input').value;
  const security = $('#security-input').value;
  if (!ssid.trim()) return { error: 'Masukkan nama jaringan Wi-Fi.' };
  const password = $('#password-input').value;
  if (security !== 'nopass' && !password) return { error: 'Masukkan kata sandi Wi-Fi.' };
  const value = `WIFI:T:${security};S:${escapeWifi(ssid)};${security === 'nopass' ? '' : `P:${escapeWifi(password)};`}H:${$('#hidden-input').checked ? 'true' : 'false'};;`;
  return { value };
}

function channelToLinear(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexLuminance(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

function contrastRatio(foreground, background) {
  const a = hexLuminance(foreground);
  const b = hexLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function setStatus(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}

function setDownloadState(enabled) {
  $('#download-png').disabled = !enabled;
  $('#download-svg').disabled = !enabled;
}

// Hasil aksi juga tampil sebagai teks (toast), tidak hanya lewat animasi sakuga.
function notify(message) {
  $('#toast').show(message);
}

// Galat validasi hanya tampil setelah kolom ditinggalkan (blur). Saat mengetik atau fokus lagi, galat hilang.
async function refresh(showErrors = false) {
  const thisRender = ++renderId;
  const result = getPayload();
  if (result.error) {
    currentPayload = '';
    canvas.hidden = true;
    $('#qr-placeholder').hidden = false;
    setDownloadState(false);
    if (showErrors) setStatus(result.error, true);
    else setStatus('Isi data untuk melihat QR code.');
    return;
  }
  try {
    await QRCode.toCanvas(canvas, result.value, {
      width: 360,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: $('#foreground-input').value, light: $('#background-input').value }
    });
    // qrcode.js menulis lebar 360px sebagai style inline. Hapus, supaya CSS (.qr-frame canvas) yang mengatur ukuran.
    canvas.style.width = '';
    canvas.style.height = '';
    if (thisRender !== renderId) return;
    currentPayload = result.value;
    canvas.hidden = false;
    $('#qr-placeholder').hidden = true;
    setDownloadState(true);
    const ratio = contrastRatio($('#foreground-input').value, $('#background-input').value);
    if (ratio < 4) {
      setStatus('Kontras warna rendah. Pilih warna yang lebih kontras agar QR mudah dipindai.', true);
    } else {
      setStatus('QR code siap dipindai.');
    }
  } catch {
    if (thisRender !== renderId) return;
    currentPayload = '';
    canvas.hidden = true;
    $('#qr-placeholder').hidden = false;
    setDownloadState(false);
    setStatus('Konten terlalu panjang untuk QR code. Persingkat teks atau tautannya.', true);
  }
}

// Tab jenis konten (sakuga-tabs) memberi tahu lewat event "change" dengan detail.value.
function updateActiveType(type) {
  contentType = type;
  document.querySelectorAll('.form-panel').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== type;
  });
  refresh();
}

$('#content-tabs').addEventListener('change', (event) => updateActiveType(event.detail.value));
['#link-input', '#text-input', '#ssid-input', '#password-input', '#security-input', '#hidden-input', '#foreground-input', '#background-input'].forEach((selector) => $(selector).addEventListener('input', () => refresh(false)));
const textFields = ['#link-input', '#text-input', '#ssid-input', '#password-input'];
textFields.forEach((selector) => $(selector).addEventListener('blur', () => refresh(true)));
textFields.forEach((selector) => $(selector).addEventListener('focus', () => refresh(false)));
// Klik label harus memindahkan fokus ke kolom sakuga-input (label for= tidak selalu membawa fokus ke elemen custom).
document.querySelectorAll('label[for]').forEach((label) => {
  const target = document.getElementById(label.htmlFor);
  if (target && target.tagName === 'SAKUGA-INPUT') label.addEventListener('click', () => target.focus());
});
$('#security-input').addEventListener('change', () => {
  const hasPassword = $('#security-input').value !== 'nopass';
  $('#password-field').hidden = !hasPassword;
  refresh();
});
$('#text-input').addEventListener('input', () => { $('#char-count').textContent = `${$('#text-input').value.length} / 1.200`; });

for (const [id, output] of [['foreground-input', 'foreground-value'], ['background-input', 'background-value']]) {
  $(`#${id}`).addEventListener('input', (event) => {
    $(`#${output}`).textContent = event.target.value.toUpperCase();
    refresh();
  });
}

document.querySelectorAll('.size-option').forEach((button) => button.addEventListener('click', () => {
  exportSize = Number(button.dataset.size);
  document.querySelectorAll('.size-option').forEach((item) => {
    const selected = item === button;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
}));

$('#download-png').addEventListener('click', async () => {
  if (!currentPayload) return;
  const data = await QRCode.toDataURL(currentPayload, {
    width: exportSize,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: $('#foreground-input').value, light: $('#background-input').value }
  });
  download(data, 'nvanqr.png');
  notify('PNG sudah diunduh');
});

$('#download-svg').addEventListener('click', async () => {
  if (!currentPayload) return;
  const svg = await QRCode.toString(currentPayload, {
    type: 'svg',
    width: exportSize,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: $('#foreground-input').value, light: $('#background-input').value }
  });
  download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'nvanqr.svg');
  notify('SVG sudah diunduh');
});

function download(href, filename) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

refresh();
