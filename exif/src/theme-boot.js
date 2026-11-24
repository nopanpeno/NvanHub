// Tema pilihan pengguna dipasang sebelum halaman tampil, supaya tidak berkedip.
// Berkas terpisah (bukan inline), karena CSP exif tidak mengizinkan script inline.
// Kunci localStorage sama dengan NvanHub, jadi pilihan tema ikut ke exif.
try {
  var t = localStorage.getItem('nvanhub-theme');
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
} catch (e) { /* penyimpanan mati: tema ikut sistem */ }
