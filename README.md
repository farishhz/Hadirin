![Absen Kelas GitHub banner](assets/brand/github-banner.png)

# Absen Kelas

Absen Kelas adalah aplikasi desktop offline untuk membantu tim operasional sekolah atau pesantren
menginput dan merekap absensi siswa per jam pelajaran.

Tujuan proyek ini sederhana: operator bisa menyalin data dari buku absen fisik ke aplikasi dengan cepat,
tanpa backend, tanpa akun, dan tanpa biaya server.

## Fitur Utama

- Aplikasi desktop untuk Windows dan macOS melalui Tauri.
- Data tersimpan lokal di perangkat operator.
- Kelola data kelas dan siswa.
- Tambah siswa manual atau import dari Excel.
- Atur pola jam pelajaran yang bisa dicustom admin.
- Slot jam bisa ditandai sebagai wajib absen atau pemisah saja.
- Input absensi per tanggal, kelas, siswa, dan jam pelajaran.
- Tombol **Hadir Semua** untuk mempercepat input harian.
- Edit status spesifik per siswa per jam.
- Status bawaan: Hadir, Izin, Sakit, Alpa, Tugas/Piket, dan Lainnya.
- Catatan opsional untuk detail seperti sakit, tugas, atau kegiatan khusus.
- Export rekap harian dan bulanan ke Excel.
- Backup dan restore data lokal.

## Kenapa Open Source?

Banyak sekolah kecil masih merekap absensi dari buku fisik ke spreadsheet manual. Proyek ini memberi
alternatif gratis yang bisa dijalankan di satu komputer operator tanpa layanan berbayar. Sekolah,
developer lokal, dan komunitas pendidikan bisa memakai, memodifikasi, menerjemahkan, atau menyesuaikan
alur absensi sesuai kebutuhan masing-masing.

## Download dan Install

Download installer terbaru dari halaman
[GitHub Releases](https://github.com/farishhz/absen-kelas/releases/latest).

### Windows

Download file `.exe` atau `.msi`, lalu jalankan installer seperti aplikasi Windows biasa.
Jika Windows SmartScreen menampilkan peringatan karena aplikasi ini masih baru, pastikan file berasal
dari halaman release resmi, lalu pilih opsi untuk tetap menjalankan installer.

### macOS

Download file `.dmg`, buka, lalu drag **Absen Kelas.app** ke folder **Applications**.

Catatan penting: build macOS v0.1.x belum ditandatangani dan belum dinotarize oleh Apple karena proyek
ini masih open source awal dan belum memakai akun Apple Developer berbayar. Karena itu macOS Gatekeeper
bisa menampilkan pesan seperti **"Absen Kelas" Not Opened** atau **Apple could not verify "Absen Kelas"
is free of malware**.

Ini bukan berarti GitHub menemukan malware. Peringatan tersebut muncul karena macOS belum bisa
memverifikasi identitas developer aplikasi. Lihat panduan lengkap di
[docs/install-macos.md](docs/install-macos.md).

## Format Import Excel Siswa

Kolom wajib:

| nama_siswa | kelas |
| --- | --- |
| Ahmad Fauzan | Kelas 1A |

Kolom opsional:

| nis | jenis_kelamin | catatan |
| --- | --- | --- |
| 1001 | L | Ketua kelas |

Aplikasi juga menyediakan tombol download template dari halaman **Data Siswa**.

## Menjalankan di Mode Development

```bash
npm install
npm run dev
```

Untuk menjalankan shell desktop Tauri:

```bash
npm run tauri dev
```

## Build

Build web assets:

```bash
npm run build
```

Build installer desktop:

```bash
npm run tauri build
```

Catatan: build Tauri membutuhkan Rust toolchain dan dependency platform untuk Windows/macOS.

## Membuat Installer Windows/macOS

Repo ini sudah menyiapkan GitHub Actions di `.github/workflows/release.yml`.

Cara release:

```bash
git tag v0.1.13
git push origin v0.1.13
```

GitHub Actions akan membangun installer macOS dan Windows, menerbitkan release publik, lalu memakai
`docs/release-notes-vX.Y.Z.md` sebagai update log. Pastikan file release notes dibuat sebelum tag
dipush supaya user bisa langsung melihat perubahan dan download asset terbaru.

## Roadmap Singkat

- v0.1: Offline single-computer app, input absensi per jam, import siswa, export harian/bulanan.
- v0.2: Bulk edit, filter siswa, dan format rekap tambahan.
- v0.3: Opsi database lokal yang lebih kuat atau sync opsional tanpa mengubah prinsip offline-first.

## Lisensi

MIT. Lihat [LICENSE](LICENSE).
