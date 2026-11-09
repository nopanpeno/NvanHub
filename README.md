# NvanHub

Web utama buat semua repo saya. Isinya kartu proyek, cerita singkat, dan tautan.

Dibuat dengan HTML, CSS, dan JS biasa. Hosting di GitHub Pages. Animasi pakai GSAP dari CDN. Tanpa framework dan tanpa build.

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

Semua kolom wajib diisi. Kartu, dropdown topik, dan jumlah proyek per topik dibuat otomatis dari file ini. Tidak ada kode lain yang perlu diubah.

## Tambah fun fact

Buka `data/facts.json`, lalu tambah satu kalimat di akhir daftar. Tombol "Ganti fakta" di bagian Tentang memilih fakta secara acak dan tidak pernah mengulang fakta yang sama dua kali berturut-turut.

Fakta pertama juga tertulis di `index.html` sebagai cadangan kalau JS gagal. Kalau kamu ubah fakta pertama di JSON, ubah juga yang di HTML.

## Struktur

- `index.html`: kerangka halaman
- `css/style.css`: gaya dan palet
- `js/main.js`: render kartu, cari, dan filter topik
- `js/motion.js`: animasi (hormati `prefers-reduced-motion`)
- `js/fact.js`: fun fact acak di bagian Tentang
- `data/projects.json`: daftar proyek
- `data/facts.json`: daftar fun fact
- `assets/icons/`: ikon pixel 8×8
- `.ux-profile.md`: aturan tampilan dan gaya proyek
