# Absen Kelas v0.1.11

Updater artifact release.

## What's new

- Enabled Tauri `createUpdaterArtifacts` so GitHub Releases includes signed updater metadata.
- Keeps the in-app updater, opener, and relaunch support added in v0.1.10.
- Keeps the fixed app shell scrolling behavior where only the right content pane scrolls.
- Synced package, Tauri, and Rust metadata to version `0.1.11`.

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
