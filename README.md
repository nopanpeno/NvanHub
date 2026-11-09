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

Semua kolom di atas wajib diisi. Kartu, dropdown topik, dan jumlah proyek per topik dibuat otomatis dari file ini. Tidak ada kode lain yang perlu diubah.

### Cerita di kartu (opsional)

Tambah kolom `story` kalau mau cerita "kenapa aku bikin ini":

```json
"story": "Dua tiga kalimat. Kenapa dibuat, apa yang dipelajari."
```

Kartu yang punya `story` dapat tombol "Baca ceritanya" yang membuka teks di tempat. Kartu tanpa `story` tampil seperti biasa. Teks cerita ikut dicari di kolom cari. Jaga tetap pendek (sekitar 200 karakter), supaya kartu tidak terlalu panjang di HP.

## Ubah ucapan robot

Buka `data/mascot.json`, lalu tambah satu kalimat di akhir daftar. Klik robot di bagian atas halaman, dia mengucapkan satu sapaan acak dan tidak pernah mengulang sapaan yang sama dua kali berturut-turut. Jaga tiap kalimat tetap pendek (sekitar 90 karakter), supaya balon muat di layar HP.

Satu sapaan juga tertulis di `js/mascot.js` sebagai cadangan kalau JSON gagal dimuat.

Fun fact di bagian Tentang berupa paragraf biasa di `index.html`. Ubah langsung di sana.

## Struktur

- `index.html`: kerangka halaman
- `css/style.css`: gaya dan palet
- `js/main.js`: render kartu, cari, dan filter topik
- `js/motion.js`: animasi (hormati `prefers-reduced-motion`)
- `js/mascot.js`: balon ucapan robot
- `data/projects.json`: daftar proyek
- `data/mascot.json`: daftar sapaan robot
- `assets/icons/`: ikon pixel 8×8
- `.ux-profile.md`: aturan tampilan dan gaya proyek
