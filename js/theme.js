// Saklar tema di footer (elemen sakuga-toggle). Tanpa pilihan, tema ikut sistem.
// Pilihan pengguna disimpan di perangkat dan dipasang lagi sebelum halaman tampil (lihat script di head).
const KEY = 'nvanhub-theme';
const root = document.documentElement;
const saklar = document.getElementById('tema');
const sysDark = matchMedia('(prefers-color-scheme: dark)');

const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : sysDark.matches);

saklar.checked = isDark();

saklar.addEventListener('change', () => {
  const v = saklar.checked ? 'dark' : 'light';
  root.dataset.theme = v;
  try { localStorage.setItem(KEY, v); } catch { /* penyimpanan mati: tema tetap jalan sampai halaman ditutup */ }
});

// Tanpa pilihan tersimpan, saklar ikut berubah saat sistem ganti tema.
sysDark.addEventListener('change', () => {
  if (!root.dataset.theme) saklar.checked = sysDark.matches;
});
