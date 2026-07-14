import type { AttendanceStatus, CustomStatus } from "./types";

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

export function statusLabel(
  status: string,
  customStatusesOrCustomStatusLabel?: CustomStatus[] | string,
  maybeCustomStatusLabel?: string
) {
  let customStatuses: CustomStatus[] = [];
  let customStatusLabel: string | undefined = undefined;

  if (Array.isArray(customStatusesOrCustomStatusLabel)) {
    customStatuses = customStatusesOrCustomStatusLabel;
    customStatusLabel = maybeCustomStatusLabel;
  } else if (typeof customStatusesOrCustomStatusLabel === "string") {
    customStatusLabel = customStatusesOrCustomStatusLabel;
  }

  const matchedCustom = customStatuses.find((item) => item.id === status);
  if (matchedCustom) {
    return matchedCustom.label;
  }

  if (status === "other" && customStatusLabel?.trim()) {
    return customStatusLabel.trim();
  }

  return ATTENDANCE_STATUS_LABELS[status as AttendanceStatus] || status;
}
