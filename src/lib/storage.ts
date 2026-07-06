import { seedData } from "./seed";
import type { AppData } from "./types";

export const STORAGE_KEY = "absen-kelas:v1";
export const BACKUP_FORMAT = "JSON";

export function backupFileNameForDate(date: string) {
  return `backup-absen-kelas-${date}.json`;
}

export function buildStorageInfo(dataDirectory = "") {
  return {
    storageType: "Penyimpanan lokal aplikasi",
    storageKey: STORAGE_KEY,
    backupFormat: BACKUP_FORMAT,
    backupFileExample: backupFileNameForDate("2026-06-01"),
    dataDirectory
  };
}

export function loadAppData(): AppData {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return seedData;
  }

  try {
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...seedData,
      ...parsed,
      institutionName: parsed.institutionName ?? seedData.institutionName,
      studentOrderByClass: parsed.studentOrderByClass ?? {},
      studentSortModeByClass: parsed.studentSortModeByClass ?? {},
      attendance: parsed.attendance ?? {}
    };
  } catch {
    return seedData;
  }
}

export function saveAppData(data: AppData) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString()
    })
  );
}

export function resetAppData() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function createBackupPayload(data: AppData) {
  return JSON.stringify(
    {
      app: "absen-kelas",
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    },
    null,
    2
  );
}

export function parseBackupPayload(payload: string): AppData {
  const parsed = JSON.parse(payload) as { app?: string; data?: AppData };

  if (parsed.app !== "absen-kelas" || !parsed.data) {
    throw new Error("File backup tidak dikenali sebagai data Absen Kelas.");
  }

  return {
    ...seedData,
    ...parsed.data,
    institutionName: parsed.data.institutionName ?? seedData.institutionName,
    studentOrderByClass: parsed.data.studentOrderByClass ?? {},
    studentSortModeByClass: parsed.data.studentSortModeByClass ?? {},
    attendance: parsed.data.attendance ?? {}
  };
}
