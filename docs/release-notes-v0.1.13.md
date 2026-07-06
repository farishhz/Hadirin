# Absen Kelas v0.1.13

Save file visibility release.

## What's new

- Added a "Lokasi Data Tersimpan" panel in Pengaturan so admins can understand where app data lives.
- Shows the internal storage type, internal key `absen-kelas:v1`, backup format, and an example backup file name.
- Added a desktop-only "Buka Folder Data" action that opens the app data folder in Finder on macOS or File Explorer on Windows.
- Reused the same JSON backup filename helper for every backup download action.
- Added storage info tests for the save-location explanation and backup filename pattern.
- Synced package, Tauri, and Rust metadata to version `0.1.13`.

## Download

- Windows: download file `.exe` or `.msi`.
- macOS: download file `.dmg`.

## Important macOS note

The macOS build is still unsigned and not notarized by Apple. Gatekeeper may show:

- `"Absen Kelas" Not Opened`
- `Apple could not verify "Absen Kelas" is free of malware`

This is expected for the current open-source build because the project does not yet use Apple Developer
signing and notarization.

macOS install guide:
<https://github.com/farishhz/absen-kelas/blob/main/docs/install-macos.md>
