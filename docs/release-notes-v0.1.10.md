# Absen Kelas v0.1.10

In-app update and desktop layout fix release.

## What's new

- Added the official Tauri updater plugin so future updates can be installed from inside the app.
- Added signed updater metadata support through GitHub Releases `latest.json`.
- Added the official Tauri opener plugin so release and installer links open in the system browser from the desktop app.
- Added the official Tauri process plugin so the app can relaunch after an automatic update.
- Changed the Settings update action to **Install Update** with live download/install progress.
- Kept **Download Installer** and **Buka Release** as manual fallback actions.
- Fixed the app shell scrolling model: the left sidebar stays fixed-height, while only the right content area scrolls.
- Prevented the sidebar footer note from being clipped by long pages on the right.
- Synced package, Tauri, and Rust metadata to version `0.1.10`.

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
