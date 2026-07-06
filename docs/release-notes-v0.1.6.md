# Absen Kelas v0.1.6

UI refresh and workflow release.

## What's new

- Refreshed the app interface with shadcn/ui components for buttons, cards, selects, checkboxes, tables, badges, and toast notifications.
- Added in-app notifications for import, export, backup, reset, attendance, class, student, and schedule actions.
- Added export options for all classes or selected classes in daily and monthly reports.
- Added a class filter on the Data Siswa screen so admins can focus on one class at a time.
- Updated the app logo and regenerated the Tauri icon bundle.
- Switched the app typography to Inter.
- Removed the "offline desktop" label from the sidebar.
- App version metadata is now `0.1.6`.

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
