# Hadirin v0.1.20

Update logo, repository URL migration, Android build architecture fix, and CI signing configuration.

## What's new

- Updated the application logo across all platforms (Windows, macOS, iOS, Android) to use the new branding.
- Migrated release check URL to the new repository under https://github.com/farishhz/Hadirin.
- Fixed Android build issue by splitting `main.rs` into `lib.rs` and `main.rs`, and configuring a library target in `Cargo.toml`.
- Configured Tauri CI release workflow (`.github/workflows/release.yml`) to support `TAURI_SIGNING_PRIVATE_KEY` for secure updater signature generation.
- Synced package, Tauri, and Rust metadata to version `0.1.20`.

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
