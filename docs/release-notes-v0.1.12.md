# Absen Kelas v0.1.12

Student gender input release.

## What's new

- Changed student gender fields into dropdown choices so admins can only select `L` or `P`.
- Updated the add-student form to default to `L` instead of leaving gender empty.
- Updated editable student table rows so saved gender values stay normalized as `L` or `P`.
- Migrated demo seed data and helper tests to use `L` and `P`.
- Synced package, Tauri, and Rust metadata to version `0.1.12`.

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
