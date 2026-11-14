# NvanCut

Shortlink sederhana: membagikan URL panjang dengan nama pendek. Halaman ini ada di NvanHub, di `/cut/`. Repo NvanCut yang lama masih jalan sendiri, jadi link lama tetap aman.

## Cara kerja

Tidak ada backend atau database. Pasangan alias dan link tujuan disimpan di `links.json`. Setiap alias punya satu halaman kecil di `cut/<alias>/index.html` yang langsung mengalihkan ke tujuan. Halaman itu dibuat oleh script, jadi tidak perlu ditulis tangan.

```json
{
  "notulen-rapat": "https://docs.google.com/document/d/ID-DOKUMEN",
  "materi_tim": "https://drive.google.com/file/d/ID-FILE"
}
```

Alias hanya boleh huruf, angka, `-`, dan `_` (maksimal 48). Alias tidak boleh sama walau beda huruf besar/kecil. Nama `fonts`, `logo`, dan `scripts` dipakai folder situs, jadi tidak bisa jadi alias. Tujuan harus `http://` atau `https://`.

## Tambah dan hapus lewat GitHub Actions

- **Tambah shortlink** (`cut-add-link.yml`): Actions → Run workflow, isi alias dan link tujuan. Parameter pelacak (`utm_*`, `fbclid`, `gclid`) dan ID akun Google (`ouid`, `rtpof`, `sd`) dibuang otomatis.
- **Hapus shortlink** (`cut-delete-link.yml`): Actions → Run workflow, isi alias.

Kedua workflow menulis `links.json`, membuat ulang halaman alias, lalu commit ke `main`. Workflow ini butuh izin tulis ke `main`. Kalau `main` dilindungi, izinkan push dari GitHub Actions.

Pengecekan di CI (`check.yml`) memastikan `cut/<alias>/` cocok dengan `links.json`.

## Menjalankan dan memeriksa lokal

Dari root repo:

```
node cut/scripts/links.mjs check
LINK_ALIAS=nama LINK_URL=https://contoh.com node cut/scripts/links.mjs add
LINK_ALIAS=nama node cut/scripts/links.mjs remove
node cut/scripts/links.mjs pages
```

Jalankan `pages` setelah `add` atau `remove`. Halaman `/cut/` juga butuh server lokal, bukan `file://`, karena `links.json` dibaca lewat `fetch`.

## Isi folder

- `index.html`, `styles.css`, `app.js`: halaman beranda dan form.
- `links.json`: daftar alias.
- `scripts/links.mjs`: cek, tambah, hapus, dan buat halaman alias.
- `<alias>/index.html`: halaman alihkan per alias (dibuat script).
- `fonts/`: DM Sans dan Space Grotesk (SIL OFL 1.1), teks lisensinya ada di folder yang sama.
- `logo/`, `favicon.svg`, `apple-touch-icon.png`: logo dan ikon.
