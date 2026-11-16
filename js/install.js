// Tombol "Pasang aplikasi" di header. Hanya muncul kalau aplikasi bisa dipasang.
// Android, Chrome, dan Edge: tombol memanggil dialog pasang asli browser (satu tap).
// iPhone: Safari tidak punya event pemasangan, jadi tombol membuka panduan manual.
// Tersembunyi kalau aplikasi sudah terpasang atau browser tidak mendukung.

const btn = document.getElementById('btn-install');
const help = document.getElementById('install-help');
let deferredPrompt = null;

// Sudah dibuka dari layar utama, bukan dari tab browser.
const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// iPadOS mengaku sebagai Mac, jadi juga dicek lewat layar sentuh.
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function hideButton() {
  btn.hidden = true;
  deferredPrompt = null;
}

if (btn && !isStandalone()) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // dialog bawaan ditahan, dipanggil lewat tombol ini
    deferredPrompt = e;
    btn.hidden = false;
  });
  window.addEventListener('appinstalled', hideButton);
  if (isIOS()) btn.hidden = false;
}

btn?.addEventListener('click', () => {
  if (deferredPrompt) {
    // Prompt cuma bisa dipakai sekali. Tombol disembunyikan, muncul lagi di kunjungan berikutnya.
    const prompt = deferredPrompt;
    hideButton();
    prompt.prompt();
    return;
  }
  help?.showModal();
});
