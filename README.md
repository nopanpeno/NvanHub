# NvanHub

Web utama buat semua repo saya. Isinya kartu proyek dan tautan.

Dibuat dengan HTML, CSS, dan JS biasa. Hosting di GitHub Pages. Font Anton dan Onest disimpan di repo, tanpa CDN. Tanpa framework dan tanpa build.

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
  "kategori": "alat",
  "repo": "https://github.com/nopanpeno/NamaProyek",
  "live": "https://nopanpeno.github.io/NamaProyek/"
}
```

Semua kolom di atas wajib diisi. `kategori` harus salah satu dari `alat`, `foto`, atau `game`, sesuai tab kategori di halaman. Kartu dan filter dibuat otomatis dari file ini. Tidak ada kode lain yang perlu diubah.

## Ubah teks halaman

Fun fact di bagian Tentang, judul hero, dan daftar peran ada langsung di `index.html`. Ubah di sana.

## Struktur

- `index.html`: kerangka halaman (hero, ticker, proyek, tentang, footer)
- `css/style.css`: gaya, palet, dan animasi (token durasi ada di bagian atas)
- `js/main.js`: render kartu dan filter kategori lewat tab
- `js/sakuga/`: elemen sakuga-vfx (tombol, tab, toast), MIT. Lisensi ada di folder itu
- `js/install.js`: tombol "Pasang aplikasi" di header
- `data/projects.json`: daftar proyek
- `manifest.json` dan `sw.js`: bikin web bisa dipasang sebagai app (PWA) dan terbuka offline. Tiap tool punya cache sendiri di `sw.js` (objek `TOOLS`)
- `pass/`: NvanPass, kirim file lewat WebRTC. Berdiri sendiri, tidak import file hub. Tes sendiri: `cd pass && npm test`
- `play/`: NvanPlay, katalog game kecil dan pemutarnya. Berdiri sendiri, tidak import file hub. Cek kontrak game: `cd play && node scripts/check-games.mjs`
- `vector/`: NvanVector, gambar jadi SVG lalu XML Alight Motion. Berdiri sendiri, tidak import file hub. Library ada di `vector/vendor/` (Potrace GPL-2.0, lihat `vector/LICENSE`). Tes sendiri: `cd vector && npm test`
- `qr/`: NvanQR, buat dan pindai QR code di browser. Berdiri sendiri, tidak import file hub. Tanpa build, pustaka ada di `qr/vendor/`. Lihat `qr/README.md`
- `cut/`: NvanCut, shortlink. Alias di `cut/links.json`, halaman per alias dibuat `node cut/scripts/links.mjs pages`. Workflow tambah dan hapus ada di `.github/workflows/cut-*.yml`. Lihat `cut/README.md`
- `exif/`: NvanExif, lihat dan hapus metadata foto di browser. Berdiri sendiri, tidak import file hub. Tanpa build, library ada di `exif/vendor/` (lisensi di sana). Tes sendiri: `cd exif && npm ci && npm test`. Lihat `exif/README.md`
- `assets/icons/`: ikon aplikasi (`icon-*.png`) untuk manifest dan apple-touch-icon
- `assets/fonts/`: Anton dan Onest (woff2, latin) dan lisensinya (OFL)
- `scripts/`: cek otomatis (`check.mjs`, `smoke.cjs`)
- `.github/workflows/check.yml`: menjalankan cek tiap PR
- `.ux-profile.md`: aturan tampilan, gerak, dan gaya proyek

## Tambah file JS atau animasi baru

Semua file di `js/` harus dimuat di `index.html` (dicek otomatis). Animasi baru hanya memakai `transform` dan `opacity`, dengan durasi dari token di `css/style.css`, dan harus mati di `prefers-reduced-motion: reduce`. Aturan lengkapnya ada di `.ux-profile.md`.

## Cek otomatis

Cek jalan di GitHub Actions tiap PR dan push ke `main`: cek statis, cek kontrak game NvanPlay, tes codec NvanPass, tes NvanVector, tes NvanQR, tes NvanExif, cek shortlink NvanCut, dan tes asap di browser. Bisa dijalankan sendiri di komputer:

```
node scripts/check.mjs
```

Memeriksa `projects.json` (kolom wajib, tautan https), syntax semua file JS, file yang dirujuk `index.html` dan CSS harus ada, dan tidak ada yang dimuat dari CDN.

```
npm install --no-save playwright
node scripts/smoke.cjs
```

Membuka halaman di browser pada 1280px, 375px, dan reduced-motion, lalu `/pass/`, `/play/`, `/vector/`, `/qr/` (termasuk pulang-pergi buat QR lalu pindai), `/cut/`, dan `/exif/` (pilih foto, hapus metadata, unduh hasil). Memeriksa tidak ada error JS atau request gagal, jumlah kartu sama dengan jumlah proyek, tidak ada scroll horizontal, font Anton dan Onest termuat, dan tombol kembali ke hub ada. Juga memastikan hub, NvanPass, NvanPlay, NvanVector, NvanQR, NvanExif, dan NvanCut tetap tampil saat offline.

## Lisensi

Kode di repo ini pakai lisensi MIT (lihat `LICENSE`), kecuali `vector/` yang pakai GPL-2.0 (lihat `vector/LICENSE`). Library pihak ketiga di folder `vendor/` tetap pakai lisensinya sendiri.
