# NvanExif

Alat web statis untuk melihat metadata EXIF foto, memilih bagian yang mau dibuang, lalu mengunduh foto bersih. Semua proses jalan di browser. Foto tidak pernah diunggah ke server.

Ini salinan dari repo [NvanExif](https://github.com/nopanpeno/NvanExif), dipindah ke folder `exif/` di NvanHub. Repo lama tetap hidup. Spesifikasi lengkap: [docs/PRD.md](docs/PRD.md).

Status: dalam pengembangan.

## Jalankan

Tanpa build. Pakai server lokal dari folder NvanHub, lalu buka `/exif/`:

```bash
python3 -m http.server 8000
# buka http://localhost:8000/exif/
```

Halaman memuat modul ES dari `src/` dan `vendor/`, jadi tidak bisa dibuka langsung dari `file://`.

## Tes

```bash
cd exif
npm ci
npm test
```

Butuh Node 22. `test/exiftool.test.js` juga butuh Perl (ada di Linux dan macOS).

## Cara hapus metadata

- **JPEG**: segmen metadata dibuang langsung dari file (EXIF, GPS, XMP, IPTC, komentar, thumbnail). Piksel tidak berubah. Orientasi foto bisa dipertahankan.
- **Hapus terpilih** (JPEG): buang field EXIF yang dicentang. XMP dan IPTC hanya hilang lewat Hapus semua.
- **PNG, WebP**: chunk metadata dibuang langsung dari file (PNG: teks, eXIf, tIME, chunk tak dikenal; WebP: EXIF, XMP, chunk tak dikenal). Piksel dan profil warna tidak berubah, tanpa gambar ulang.
- Hanya JPEG, PNG, dan WebP yang diterima. HEIC dan TIFF belum didukung.
- Setelah proses, alat memindai struktur file hasil (segmen JPEG, chunk PNG dan WebP) untuk mencari wadah metadata yang tersisa, lalu membaca ulang EXIF dengan `exifr`. Ini bukan jaminan bahwa setiap jenis metadata lain sudah hilang. Untuk kebutuhan privasi sensitif, verifikasi hasil dengan alat metadata independen.

## GPS dan peta

Jika foto memuat lokasi, panel merah "Foto ini memuat lokasi" muncul paling atas: koordinat, ketinggian, arah kamera, kecepatan, akurasi, dan waktu GPS (yang ada di file), tombol salin koordinat, serta tautan buka di OpenStreetMap atau Google Maps. Tautan baru mengirim koordinat ke situs itu saat diklik.

Peta di halaman mati bawaan. Tombol "Tampilkan di peta" memuat Leaflet dari `vendor/` dan ubin OpenStreetMap, dengan lingkaran akurasi dan skala. Hanya saat itu browser menghubungi `tile.openstreetmap.org`, dan yang terkirim hanya nomor ubin, bukan foto.

Setelah pembersihan, jika file hasil masih memuat lokasi, panel Hasil memperingatkan lengkap dengan koordinatnya.

## Pustaka di vendor/

- `exifr.esm.js`: exifr 7.1.3 (MIT), membaca EXIF. Lisensi: `vendor/LICENSE-exifr.txt`.
- `piexifjs.esm.js`: piexifjs 1.0.6 (MIT), membaca dan menulis segmen JPEG. Sumber aslinya dibungkus jadi modul ES dengan esbuild (`export default` objek `piexif`). Lisensi: `vendor/LICENSE-piexifjs.txt`.
- `leaflet.esm.js` dan `leaflet.css`: Leaflet 1.9.4 (BSD-2-Clause), untuk peta. Lisensi: `vendor/LICENSE-leaflet.txt`.
- Font DM Sans dan Space Grotesk (SIL OFL) di `src/fonts/`, lisensinya ikut di folder itu.

Tidak ada yang dimuat dari CDN.

## Keamanan jaringan

`index.html` memasang Content-Security-Policy lewat `<meta>`: browser hanya boleh memuat berkas dari situs sendiri, dan gambar dari `tile.openstreetmap.org`. `connect-src` hanya `'self'`, jadi skrip tidak bisa mengirim foto ke luar.

## Verifikasi dengan ExifTool

`npm test` ikut menjalankan `test/exiftool.test.js`. ExifTool (dipasang lewat devDependency `exiftool-vendored`, versi dikunci) membaca file hasil dan harus menemukan nol metadata foto. Data uji disisipi XMP, IPTC, komentar, dan data setelah akhir gambar. Ini pembanding independen dari kode alat ini sendiri.

## Data uji

`python3 test/fixtures/make.py` (butuh Pillow) membuat ulang foto di `test/fixtures/`.

## Di NvanHub

- Tombol "Kembali ke NvanHub" ada di bagian atas halaman.
- Tes asap di `scripts/smoke.cjs` memilih `test/fixtures/sample.jpg`, menghapus metadata, dan memastikan tautan unduh foto bersih muncul. Jalan di 375px dan 1280px, dan halaman tetap terbuka offline.
- Job `Tes NvanExif` di `.github/workflows/check.yml` menjalankan `npm test`.
- Perubahan di repo NvanExif tidak otomatis masuk ke sini. Salin ulang file yang berubah kalau mau disinkronkan.
