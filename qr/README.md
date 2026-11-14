# NvanQR

Generator dan pembaca QR code berbasis browser. QR dibuat dan dipindai di perangkat pengguna; konten QR tidak dikirim ke server.

## Fitur

- Membuat QR untuk tautan HTTP/HTTPS, teks, dan jaringan Wi-Fi.
- Mengubah warna QR dan latar, lalu mengunduh sebagai PNG atau SVG.
- Memindai QR lewat kamera atau gambar yang dipilih.
- Antarmuka berbahasa Indonesia dan desain responsif.

## Menjalankan

Buka lewat NvanHub di `/qr/`. Atau dari root repo jalankan server lokal, lalu buka `/qr/`:

```
python3 -m http.server 8000
```

Halaman memuat file lewat `<script>` dan `fetch`, jadi sebaiknya lewat server, bukan `file://`. Kamera hanya jalan di HTTPS atau `localhost`.

Tidak ada build dan tidak ada `npm install`. Ubah file di folder ini langsung.

## Isi folder

- `index.html`: halaman pembuat QR.
- `scan.html`: halaman pemindai QR.
- `css/style.css`: gaya dan palet.
- `js/main.js`: pembuat QR.
- `js/scanner.js`: pemindai (kamera dan gambar).
- `vendor/qrcode.js`: pustaka `qrcode` 1.5.4 (MIT). Diambil dari `lib/browser.js` lalu dibundel jadi satu file dengan esbuild (`--bundle --format=iife --global-name=QRCode --minify`).
- `vendor/jsQR.js`: pustaka `jsQR` 1.4.0 (Apache-2.0), disalin apa adanya dari npm.
- `fonts/`: DM Sans dan Space Grotesk (SIL OFL 1.1), dari paket `@fontsource-variable`.
- `logo.svg`: logo.

Lisensi pustaka ada di `vendor/LICENSE-*.txt` dan `fonts/LICENSE-*.txt`.

## Pemindaian dan dukungan browser

Pemindaian memakai `BarcodeDetector` kalau tersedia. Di browser lain otomatis pakai `jsQR` sebagai cadangan. Kamera hanya diaktifkan setelah pengguna menekan tombol pindai.

## Privasi

Konten yang dimasukkan dan hasil pindai diproses di browser. Pustaka sudah ada di folder `vendor/`, tidak ada yang dimuat dari CDN. Konten QR tidak dikirim ke layanan mana pun oleh kode aplikasi.

QR Wi-Fi menyimpan nama jaringan dan, jika diisi, kata sandi di dalam gambar QR. Bagikan dengan hati-hati.
