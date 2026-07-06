# Absen Kelas v0.1.4

Release awal yang menyediakan installer desktop untuk Windows dan macOS.

## Download

- Windows: download file `.exe` atau `.msi`.
- macOS: download file `.dmg`.

## Catatan penting untuk macOS

Build macOS v0.1.4 belum ditandatangani dan belum dinotarize oleh Apple. macOS Gatekeeper bisa
menampilkan pesan seperti:

- `"Absen Kelas" Not Opened`
- `Apple could not verify "Absen Kelas" is free of malware`

Ini terjadi karena aplikasi belum memakai Apple Developer signing/notarization, bukan karena GitHub
menemukan malware pada release ini.

Cara buka di macOS:

1. Drag **Absen Kelas.app** ke **Applications**.
2. Coba buka aplikasi sekali, lalu klik **Done** jika ditolak.
3. Buka **System Settings** > **Privacy & Security**.
4. Klik **Open Anyway** untuk **Absen Kelas**.
5. Konfirmasi dengan **Open**.

Panduan lengkap: <https://github.com/farishhz/absen-kelas/blob/main/docs/install-macos.md>

## Fitur utama

- Input absensi per tanggal, kelas, siswa, dan jam pelajaran.
- Tombol **Hadir Semua** untuk mempercepat input.
- Edit status per siswa per jam pelajaran.
- Catatan opsional.
- Kelola siswa manual atau import Excel.
- Export rekap harian dan bulanan ke Excel.
- Backup dan restore data lokal.
