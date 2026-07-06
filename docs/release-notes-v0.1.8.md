# Absen Kelas v0.1.8

Complete workflow polish release for school attendance operators.

## What's new

- Added a visible **Simpan** button on every page so admins can manually confirm that local data and settings are saved.
- Added a saved-state indicator with the latest saved time.
- Added student numbering and flexible sorting options: A-Z, custom order, male-first A-Z, and female-first A-Z.
- Added custom ordering controls for student lists when schools need to match their existing attendance-book format.
- Added a **Check for Update** panel in Settings that checks GitHub Releases and opens the matching installer.
- Replaced the app logo with a simpler product-style mark and regenerated the Tauri icon bundle.
- Improved the sidebar menu alignment and polished the dashboard UI.
- Synced package, Tauri, and Rust metadata to version `0.1.8`.

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
