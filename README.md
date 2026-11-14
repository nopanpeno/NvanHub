# NvanHub

Web utama buat semua repo saya. Isinya kartu proyek, cerita singkat, dan tautan.

Dibuat dengan HTML, CSS, dan JS biasa. Hosting di GitHub Pages. Animasi pakai GSAP, font pakai Jersey 10. Keduanya disimpan di repo, tanpa CDN. Tanpa framework dan tanpa build.

## Jalankan di komputer sendiri

Halaman memuat `data/projects.json` lewat `fetch`, jadi tidak bisa dibuka langsung dari `file://`. Pakai server lokal:

```
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Tambah proyek

Buka `data/projects.json`, lalu tambah satu objek di akhir daftar:

```json
{
  "name": "NamaProyek",
  "tagline": "Satu kalimat singkat tentang proyek.",
  "desc": "Penjelasan sedikit lebih panjang.",
  "tags": ["JavaScript", "Vite"],
  "repo": "https://github.com/nopanpeno/NamaProyek",
  "live": "https://nopanpeno.github.io/NamaProyek/"
}
```

Semua kolom di atas wajib diisi. Kartu, dropdown topik, dan jumlah proyek per topik dibuat otomatis dari file ini. Tidak ada kode lain yang perlu diubah.

### Cerita di kartu (opsional)

Tambah kolom `story` kalau mau cerita "kenapa aku bikin ini":

```json
"story": "Dua tiga kalimat. Kenapa dibuat, apa yang dipelajari."
```

Kartu yang punya `story` dapat tombol "Baca ceritanya" yang membuka teks di tempat. Kartu tanpa `story` tampil seperti biasa. Jaga tetap pendek (sekitar 200 karakter), supaya kartu tidak terlalu panjang di HP.

## Ubah ucapan robot

Buka `data/mascot.json`, lalu tambah satu kalimat di akhir daftar. Klik robot di bagian atas halaman, dia mengucapkan satu sapaan acak dan tidak pernah mengulang sapaan yang sama dua kali berturut-turut. Jaga tiap kalimat tetap pendek (sekitar 90 karakter), supaya balon muat di layar HP.

Satu sapaan juga tertulis di `js/mascot.js` sebagai cadangan kalau JSON gagal dimuat.

Fun fact di bagian Tentang berupa paragraf biasa di `index.html`. Ubah langsung di sana.

## Struktur

- `index.html`: kerangka halaman
- `css/style.css`: gaya dan palet
- `js/main.js`: render kartu dan filter topik
- `js/motion.js`: inti animasi (token gerak, elemen muncul saat scroll, scroll mulus, pembersihan reduced-motion)
- `js/motion-hero.js`: judul masuk dan maskot (loop, lompat, mata mengikuti kursor)
- `js/motion-scroll.js`: efek saat scroll (parallax, garis kemajuan, kata jadi putih, kotak nama)
- `js/motion-glow.js`: kotak grid menyala di bawah mouse
- `js/mascot.js`: balon ucapan robot
- `data/projects.json`: daftar proyek
- `data/mascot.json`: daftar sapaan robot
- `manifest.json` dan `sw.js`: bikin web bisa dipasang sebagai app (PWA) dan terbuka offline. Tiap tool punya cache sendiri di `sw.js` (objek `TOOLS`)
- `pass/`: NvanPass, kirim file lewat WebRTC. Berdiri sendiri, tidak import file hub. Tes sendiri: `cd pass && npm test`
- `play/`: NvanPlay, katalog game kecil dan pemutarnya. Berdiri sendiri, tidak import file hub. Cek kontrak game: `cd play && node scripts/check-games.mjs`
- `vector/`: NvanVector, gambar jadi SVG lalu XML Alight Motion. Berdiri sendiri, tidak import file hub. Library ada di `vector/vendor/` (Potrace GPL-2.0, lihat `vector/LICENSE`). Tes sendiri: `cd vector && npm test`
- `assets/icons/`: ikon pixel 8×8 (`icon-*.png` adalah ikon app, bukan ikon tampilan)
- `assets/fonts/`: font Jersey 10 dan lisensinya (OFL)
- `assets/vendor/`: GSAP 3.12.5
- `scripts/`: cek otomatis (`check.mjs`, `smoke.cjs`)
- `.github/workflows/check.yml`: menjalankan cek tiap PR
- `.ux-profile.md`: aturan tampilan dan gaya proyek

## Tambah file JS atau animasi baru

Semua file di `js/` harus dimuat di `index.html` (dicek otomatis). Animasi baru ikut aturan reduced-motion: pakai `window.NvanMotion` dari `js/motion.js`, mulai file dengan cek `M.canMotion()`, dan daftarkan pembersihan lewat `M.onReduce(() => { ... })`.

## Cek otomatis

Cek jalan di GitHub Actions tiap PR dan push ke `main`: cek statis, cek kontrak game NvanPlay, tes codec NvanPass, tes NvanVector, dan tes asap di browser. Bisa dijalankan sendiri di komputer:

```
node scripts/check.mjs
```

Memeriksa `projects.json` dan `mascot.json` (kolom wajib, tautan https, panjang), syntax semua file JS, file yang dirujuk `index.html` dan CSS harus ada, dan tidak ada yang dimuat dari CDN.

```
npm install --no-save playwright
node scripts/smoke.cjs
```

Membuka halaman di browser pada 1280px, 375px, dan reduced-motion, lalu `/pass/`, `/play/`, dan `/vector/`. Memeriksa tidak ada error JS atau request gagal, jumlah kartu sama dengan jumlah proyek, tidak ada scroll horizontal, font termuat, dan tombol kembali ke hub ada. Juga memastikan hub, NvanPass, NvanPlay, dan NvanVector tetap tampil saat offline.
