import type { AttendanceStatus } from "./types";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Hadir",
  permission: "Izin",
  sick: "Sakit",
  absent: "Alpa",
  duty: "Tugas/Piket",
  other: "Lainnya"
};

export const ATTENDANCE_STATUS_OPTIONS: AttendanceStatus[] = [
  "present",
  "permission",
  "sick",
  "absent",
  "duty",
  "other"
];

export function statusLabel(status: AttendanceStatus, customStatus?: string) {
  if (status === "other" && customStatus?.trim()) {
    return customStatus.trim();
  }

  return ATTENDANCE_STATUS_LABELS[status];
}
