# Bot WhatsApp Akademik

Bot WhatsApp untuk keperluan akademik menggunakan Baileys.

## Fitur

- Sistem perintah modular dengan kategori
- Perintah bantuan dinamis
- Notifikasi pembatalan KRS
- Arsitektur yang mudah dipelihara

## Instalasi

1. Clone repositori ini
2. Install dependensi:
   ```bash
   npm install
   ```
3. Jalankan bot:
   ```bash
   npm start
   ```

## Struktur Perintah

Perintah diorganisir dalam kategori:
- academic: Perintah terkait akademik
- general: Perintah umum

## Penggunaan

1. Scan kode QR yang muncul di terminal
2. Bot siap digunakan dengan prefix "!"

### Perintah Tersedia

- !help - Menampilkan daftar perintah
- !help <nama_perintah> - Menampilkan detail perintah spesifik
- !krs - Mengirim notifikasi pembatalan KRS

## Pengembangan

Untuk menambah perintah baru:
1. Buat file JavaScript baru di folder kategori yang sesuai
2. Ekspor objek dengan properti yang diperlukan
3. Perintah akan dimuat secara otomatis