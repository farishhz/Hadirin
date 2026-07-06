# Absen Kelas Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline desktop app for inputting and exporting student attendance per lesson slot.

**Architecture:** Tauri wraps a React + Vite app. Domain helpers own attendance calculation, import/export, and storage boundaries so the UI remains focused on operator workflows.

**Tech Stack:** Tauri, React, TypeScript, Vite, SheetJS xlsx, Vitest.

---

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `vite.config.ts`
- Create: `tsconfig.json`

- [x] Create the Vite + Tauri configuration.
- [x] Add npm scripts for dev, build, test, and tauri.
- [x] Add minimal Rust Tauri entrypoint.

### Task 2: Domain Model and Helpers

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/attendance.ts`
- Create: `src/lib/excel.ts`
- Create: `src/lib/storage.ts`
- Create: `src/lib/attendance.test.ts`

- [x] Define classes, students, schedule patterns, slots, and attendance records.
- [x] Implement Hadir Semua.
- [x] Implement per-slot record edits.
- [x] Implement daily and monthly recap rows.
- [x] Implement Excel import and export helpers.
- [x] Add tests for the critical attendance path.

### Task 3: Operator UI

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/styles.css`

- [x] Build sidebar navigation.
- [x] Build dashboard summary.
- [x] Build input attendance grid.
- [x] Build student manual entry and Excel import.
- [x] Build class management.
- [x] Build schedule slot management.
- [x] Build daily/monthly export.
- [x] Build backup and restore settings.

### Task 4: OSS Readiness

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `LICENSE`

- [x] Explain the project purpose.
- [x] Document install, dev, and build commands.
- [x] Document import Excel format.
- [x] Add contribution and security guidance.

### Task 5: Verification

**Files:**
- Validate current repo state.

- [x] Run `npm install`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run the app in a browser preview or Tauri dev shell.
- [x] Add GitHub Actions release workflow for Windows/macOS bundles.
- [x] Initialize git and commit the first version.
