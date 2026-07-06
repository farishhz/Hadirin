# Absen Kelas v0.1.9

Data management release for school attendance operators.

## What's new

- Added institution identity settings so admins can enter the school, pesantren, or organization name.
- Show the institution name in the sidebar and dashboard summary to make the app feel personal to each school.
- Added inline class-name editing on the Data Kelas page.
- Added class deletion with a clear warning that all students in that class and their attendance data will also be deleted.
- Added inline student editing for name, NIS, gender, and note fields.
- Added row-level save buttons for student edits.
- Added helper tests for renaming classes, editing students, and deleting a class with related data cleanup.
- Synced package, Tauri, and Rust metadata to version `0.1.9`.
- Updated the release workflow so every tag publishes a public GitHub Release with this update log and downloadable installer assets.

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
