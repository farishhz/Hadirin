# Install Hadirin di macOS

Panduan ini menjelaskan kenapa macOS bisa menolak membuka Hadirin dan bagaimana cara membukanya
dengan aman.

## Kenapa muncul peringatan?

Build macOS Hadirin v0.1.x belum ditandatangani dan belum dinotarize oleh Apple. macOS Gatekeeper
akan menolak aplikasi seperti ini dengan pesan:

> "Hadirin" Not Opened

atau:

> Apple could not verify "Hadirin" is free of malware.

Peringatan ini muncul karena Apple belum memverifikasi identitas developer dan paket aplikasinya.
Untuk menghilangkan peringatan ini secara permanen pada build publik, proyek perlu akun Apple Developer,
sertifikat Developer ID, hardened runtime, dan proses notarization.

## Cara install yang disarankan

1. Download file `.dmg` dari halaman resmi:
   <https://github.com/farhsvvn/hadirin/releases/latest>
2. Buka file `.dmg`.
3. Drag **Hadirin.app** ke folder **Applications**.
4. Coba buka aplikasi sekali. Jika macOS menolak, klik **Done**.
5. Buka **System Settings** > **Privacy & Security**.
6. Di bagian **Security**, cari pesan tentang **Hadirin**, lalu klik **Open Anyway**.
7. Konfirmasi dengan **Open**.

Di beberapa versi macOS, cara alternatifnya adalah klik kanan **Hadirin.app**, pilih **Open**,
lalu pilih **Open** lagi pada dialog berikutnya.

## Opsi terminal untuk pengguna teknis

Jika Anda paham risikonya dan file berasal dari release resmi, atribut quarantine bisa dihapus dengan:

```bash
xattr -dr com.apple.quarantine "/Applications/Hadirin.app"
```

Setelah itu buka aplikasi dari folder **Applications**.

## Catatan keamanan

Jalankan cara di atas hanya untuk build yang Anda download dari release resmi atau build sendiri dari
source code repo ini. Jangan gunakan perintah terminal tersebut untuk aplikasi dari sumber yang tidak
jelas.

## Rencana jangka panjang

Solusi permanen untuk distribusi macOS adalah menambahkan code signing dan notarization di pipeline
release. Itu membutuhkan:

- Apple Developer Program.
- Sertifikat **Developer ID Application**.
- Konfigurasi signing dan hardened runtime untuk Tauri.
- Apple notarization credentials di GitHub Actions secrets.

Sampai itu tersedia, build macOS akan diberi label sebagai unsigned build.
