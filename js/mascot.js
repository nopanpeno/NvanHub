// Maskot robot di hero: klik, balon ucapan memuat sapaan acak dari data/mascot.json.
// Satu sapaan juga tertulis di sini, jadi maskot tetap bisa bicara kalau JSON gagal dimuat.
(() => {
  const mascot = document.getElementById('mascot');
  const bubble = document.getElementById('bubble');
  const bubbleLive = document.getElementById('bubble-live');
  if (!mascot || !bubble || !bubbleLive) return;

  const FALLBACK = 'Halo! Aku robot penjaga NvanHub.';

  let lines = [];
  let said = -1; // sapaan terakhir yang diucapkan (-1: belum pernah)

  // Acak, tapi tidak pernah sama dengan yang sebelumnya.
  function pick(prev, n) {
    if (n < 2) return 0;
    if (prev < 0) return Math.floor(Math.random() * n);
    const i = Math.floor(Math.random() * (n - 1));
    return i >= prev ? i + 1 : i;
  }

  const pool = () => (lines.length ? lines : [FALLBACK]);

  function say() {
    const list = pool();
    said = pick(said, list.length);
    const text = list[said];
    bubble.textContent = text;
    bubble.hidden = false;
    window.NvanMotion?.fadeIn(bubble);
    // Balon disembunyikan dari pembaca layar. Ucapan dikabarkan lewat wilayah live yang selalu ada.
    // Dikosongkan dulu supaya sapaan yang sama tetap terbaca ulang.
    bubbleLive.textContent = '';
    setTimeout(() => { bubbleLive.textContent = text; }, 50);
  }

  function hide() {
    bubble.hidden = true;
  }

  mascot.addEventListener('click', say);
  // Balon menutup saat klik di luar maskot, atau tekan Escape. Tidak ada timer yang menutupnya sendiri.
  document.addEventListener('click', (ev) => {
    if (!bubble.hidden && !ev.target.closest('.mascot-wrap')) hide();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !bubble.hidden) hide();
  });

  fetch('data/mascot.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((list) => {
      lines = list.filter((t) => typeof t === 'string' && t.trim());
    })
    .catch(() => {
      // Gagal: sapaan bawaan di atas tetap dipakai.
    });
})();
