export type AttendanceStatus =
  | "present"
  | "permission"
  | "sick"
  | "absent"
  | "duty"
  | "other";

export type StudentSortMode = "az" | "custom" | "male-first" | "female-first";

export type AttendanceRecordKey = `${string}:${string}:${string}:${string}`;

export interface ClassGroup {
  id: string;
  name: string;
  description?: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  nis?: string;
  gender?: string;
  note?: string;
}

export interface LessonSlot {
  id: string;
  name: string;
  isAttendanceTracked: boolean;
}

export interface SchedulePattern {
  id: string;
  name: string;
  slots: LessonSlot[];
}

export interface AttendanceRecord {
  id: AttendanceRecordKey;
  date: string;
  classId: string;
  studentId: string;
  slotId: string;
  status: AttendanceStatus;
  customStatus?: string;
  note?: string;
  updatedAt: string;
}

export interface AppData {
  institutionName?: string;
  classes: ClassGroup[];
  students: Student[];
  studentOrderByClass: Record<string, string[]>;
  studentSortModeByClass: Record<string, StudentSortMode>;
  schedulePatterns: SchedulePattern[];
  attendance: Record<AttendanceRecordKey, AttendanceRecord>;
  activeSchedulePatternId: string;
  updatedAt: string;
}

export interface StudentImportRow {
  nama_siswa: string;
  kelas: string;
  nis?: string;
  jenis_kelamin?: string;
  catatan?: string;
}

export interface ImportResult {
  importedStudents: number;
  createdClasses: number;
  skippedRows: number;
  errors: string[];
}

export interface DailyExportRow {
  nama_siswa: string;
  nis: string;
  [slotName: string]: string;
}

export interface MonthlyExportRow {
  nama_siswa: string;
  nis: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  tugas_piket: number;
  lainnya: number;
  total_jam: number;
}
