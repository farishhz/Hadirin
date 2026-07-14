# Hadirin v0.2.0

Penambahan fitur kustomisasi status absensi sekolah dan kartu laporan kehadiran siswa (Student Report Card) dengan kalender interaktif yang dapat dicetak langsung.

## What's new

- **Kustomisasi Status Absensi**: Guru kini dapat menambahkan status absensi khusus (seperti Terlambat, Dispensasi, Skorsing) lengkap dengan singkatan dan tema warna. Status ini terintegrasi penuh ke dalam pengisian harian, rekap bulanan, dan ekspor Excel.
- **Kartu Laporan Kehadiran Siswa**: Rincian riwayat siswa baru yang menampilkan ringkasan kumulatif kehadiran siswa, statistik per status kehadiran, dan daftar log absensi bulanan.
- **Fitur Cetak Laporan**: Cetak lembar laporan kehadiran siswa secara rapi dalam format A4 langsung dari aplikasi untuk diserahkan kepada orang tua atau bimbingan konseling.
- **Dukungan Ekspor Excel Dinamis**: Sheet rekap bulanan Excel kini otomatis menyesuaikan dan menambahkan kolom khusus untuk setiap status kustom yang diaktifkan.
- **Pengaturan Status Kustom**: Kelola, buat, dan hapus status khusus langsung dari menu Pengaturan dengan visualisasi badge warna.
- **Navigasi Info Pengembang**: Halaman khusus baru untuk mengenalkan tim pengembang dan tautan organisasi GitHub.

## Download

- Windows: download file `.exe` or `.msi`.
- macOS: download file `.dmg`.
- Android: download file `.apk` or `.aab`.

## Important macOS note

The macOS build is still unsigned and not notarized by Apple. Gatekeeper may show:

- `"Hadirin" Not Opened`
- `Apple could not verify "Hadirin" is free of malware`

This is expected for the current open-source build because the project does not yet use Apple Developer signing and notarization.

macOS install guide:
<https://github.com/farishhz/Hadirin/blob/main/docs/install-macos.md>
