# Absen Kelas Desktop Design

## Goal

Build a free, open source, offline-first desktop app for school or pesantren operators who input student
attendance from physical attendance books and need daily or monthly Excel recaps.

## Target User

The first version is for one operator using one computer. It does not require login, backend sync, server
hosting, or a paid account.

## Core Workflow

1. Admin creates classes.
2. Admin adds students manually or imports an Excel student list.
3. Admin configures schedule patterns, such as Hari Biasa, Jumat, Ujian, or Ramadhan.
4. Operator opens Input Absensi.
5. Operator chooses date, class, and schedule pattern.
6. Operator clicks Hadir Semua.
7. Operator edits specific student/lesson slots for Izin, Sakit, Alpa, Tugas/Piket, or Lainnya.
8. Operator adds optional notes when needed.
9. Operator exports daily or monthly Excel recap.

## Feature Scope

- Local-only data persistence.
- Sidebar desktop layout.
- Dashboard summary.
- Input attendance per date, class, student, and lesson slot.
- Custom schedule slots with active attendance or separator mode.
- Built-in statuses plus an optional Lainnya status.
- Optional notes for every attendance record.
- Manual student entry.
- Excel import for student lists.
- Excel export for daily and monthly recaps.
- Backup and restore local data.

## Out of Scope

- Multi-user sync.
- Cloud backend.
- Login and roles.
- Mobile app.
- Real-time collaboration.
- Payroll, billing, grading, or full school management features.

## Architecture

The app uses Tauri for the downloadable desktop shell, React for UI, and browser local storage for v0.1
offline persistence. The data layer is isolated behind helper functions so a future SQLite-backed store can
replace local storage without rewriting UI workflows.

## Data Model

- Class: id, name, optional description.
- Student: id, name, classId, optional NIS, gender, note.
- SchedulePattern: id, name, lesson slots.
- LessonSlot: id, name, isAttendanceTracked.
- AttendanceRecord: date, classId, studentId, slotId, status, optional customStatus, optional note.

## Testing

The first test coverage targets the attendance helpers:

- Hadir Semua creates one present record for every student and tracked slot.
- A specific student slot can be edited after Hadir Semua.
- Monthly recap counts status totals per student.
