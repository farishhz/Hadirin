import { makeId } from "./ids";
import { statusLabel } from "./status";
import type {
  AppData,
  AttendanceRecord,
  AttendanceRecordKey,
  AttendanceStatus,
  ClassGroup,
  DailyExportRow,
  MonthlyExportRow,
  SchedulePattern,
  Student
} from "./types";

export function attendanceRecordKey(
  date: string,
  classId: string,
  studentId: string,
  slotId: string
): AttendanceRecordKey {
  return `${date}:${classId}:${studentId}:${slotId}`;
}

export function trackedSlots(schedule: SchedulePattern) {
  return schedule.slots.filter((slot) => slot.isAttendanceTracked);
}

export function studentsForClass(students: Student[], classId: string) {
  return students
    .filter((student) => student.classId === classId)
    .sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
}

export function markAllPresent(data: AppData, date: string, classId: string, scheduleId: string): AppData {
  const schedule = data.schedulePatterns.find((item) => item.id === scheduleId);
  if (!schedule) return data;

  const nextAttendance = { ...data.attendance };
  const now = new Date().toISOString();

  for (const student of studentsForClass(data.students, classId)) {
    for (const slot of trackedSlots(schedule)) {
      const id = attendanceRecordKey(date, classId, student.id, slot.id);
      nextAttendance[id] = {
        id,
        date,
        classId,
        studentId: student.id,
        slotId: slot.id,
        status: "present",
        updatedAt: now
      };
    }
  }

  return { ...data, attendance: nextAttendance, activeSchedulePatternId: scheduleId, updatedAt: now };
}

export function upsertAttendanceRecord(
  data: AppData,
  params: {
    date: string;
    classId: string;
    studentId: string;
    slotId: string;
    status: AttendanceStatus;
    customStatus?: string;
    note?: string;
  }
): AppData {
  const id = attendanceRecordKey(params.date, params.classId, params.studentId, params.slotId);
  const now = new Date().toISOString();
  const record: AttendanceRecord = {
    id,
    date: params.date,
    classId: params.classId,
    studentId: params.studentId,
    slotId: params.slotId,
    status: params.status,
    customStatus: params.customStatus?.trim() || undefined,
    note: params.note?.trim() || undefined,
    updatedAt: now
  };

  return {
    ...data,
    attendance: { ...data.attendance, [id]: record },
    updatedAt: now
  };
}

export function addClass(data: AppData, name: string): AppData {
  const cleanName = name.trim();
  if (!cleanName) return data;

  const existing = data.classes.find((item) => item.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) return data;

  return {
    ...data,
    classes: [...data.classes, { id: makeId("class"), name: cleanName }],
    updatedAt: new Date().toISOString()
  };
}

export function updateClassName(data: AppData, classId: string, name: string): AppData {
  const cleanName = name.trim();
  if (!cleanName) return data;

  const duplicate = data.classes.some(
    (item) => item.id !== classId && item.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (duplicate) return data;

  return {
    ...data,
    classes: data.classes.map((item) => (item.id === classId ? { ...item, name: cleanName } : item)),
    updatedAt: new Date().toISOString()
  };
}

export function deleteClassGroup(data: AppData, classId: string): AppData {
  const deletedStudentIds = new Set(data.students.filter((student) => student.classId === classId).map((student) => student.id));
  const attendance = Object.fromEntries(
    Object.entries(data.attendance).filter(
      ([, record]) => record.classId !== classId && !deletedStudentIds.has(record.studentId)
    )
  ) as AppData["attendance"];
  const { [classId]: _deletedOrder, ...studentOrderByClass } = data.studentOrderByClass;
  const { [classId]: _deletedSortMode, ...studentSortModeByClass } = data.studentSortModeByClass;

  return {
    ...data,
    classes: data.classes.filter((item) => item.id !== classId),
    students: data.students.filter((student) => student.classId !== classId),
    studentOrderByClass,
    studentSortModeByClass,
    attendance,
    updatedAt: new Date().toISOString()
  };
}

export function addStudent(
  data: AppData,
  input: Pick<Student, "name" | "classId" | "nis" | "gender" | "note">
): AppData {
  const cleanName = input.name.trim();
  if (!cleanName || !input.classId) return data;

  return {
    ...data,
    students: [
      ...data.students,
      {
        id: makeId("student"),
        name: cleanName,
        classId: input.classId,
        nis: input.nis?.trim() || undefined,
        gender: input.gender?.trim() || undefined,
        note: input.note?.trim() || undefined
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

export function updateStudent(data: AppData, studentId: string, input: Partial<Pick<Student, "name" | "nis" | "gender" | "note">>): AppData {
  const current = data.students.find((student) => student.id === studentId);
  if (!current) return data;

  const cleanName = input.name?.trim() ?? current.name;
  if (!cleanName) return data;

  return {
    ...data,
    students: data.students.map((student) =>
      student.id === studentId
        ? {
            ...student,
            name: cleanName,
            nis: input.nis?.trim() || undefined,
            gender: input.gender?.trim() || undefined,
            note: input.note?.trim() || undefined
          }
        : student
    ),
    updatedAt: new Date().toISOString()
  };
}

export function deleteStudent(data: AppData, studentId: string): AppData {
  const attendance = Object.fromEntries(
    Object.entries(data.attendance).filter(([, record]) => record.studentId !== studentId)
  ) as AppData["attendance"];

  return {
    ...data,
    students: data.students.filter((student) => student.id !== studentId),
    attendance,
    updatedAt: new Date().toISOString()
  };
}

export function addSchedulePattern(data: AppData, name: string): AppData {
  const cleanName = name.trim();
  if (!cleanName) return data;

  const pattern: SchedulePattern = {
    id: makeId("schedule"),
    name: cleanName,
    slots: [
      { id: makeId("slot"), name: "Jam 1", isAttendanceTracked: true },
      { id: makeId("slot"), name: "Jam 2", isAttendanceTracked: true }
    ]
  };

  return {
    ...data,
    schedulePatterns: [...data.schedulePatterns, pattern],
    activeSchedulePatternId: pattern.id,
    updatedAt: new Date().toISOString()
  };
}

export function updateSchedulePattern(data: AppData, pattern: SchedulePattern): AppData {
  return {
    ...data,
    schedulePatterns: data.schedulePatterns.map((item) => (item.id === pattern.id ? pattern : item)),
    updatedAt: new Date().toISOString()
  };
}

export function buildDailyRows(
  data: AppData,
  date: string,
  classId: string,
  scheduleId: string
): DailyExportRow[] {
  const schedule = data.schedulePatterns.find((item) => item.id === scheduleId);
  if (!schedule) return [];

  return studentsForClass(data.students, classId).map((student) => {
    const row: DailyExportRow = {
      nama_siswa: student.name,
      nis: student.nis ?? ""
    };

    for (const slot of schedule.slots) {
      if (!slot.isAttendanceTracked) {
        row[slot.name] = "-";
        continue;
      }

      const record = data.attendance[attendanceRecordKey(date, classId, student.id, slot.id)];
      const note = record?.note ? ` (${record.note})` : "";
      row[slot.name] = record ? `${statusLabel(record.status, record.customStatus)}${note}` : "Belum diisi";
    }

    return row;
  });
}

export function buildMonthlyRows(
  data: AppData,
  monthKey: string,
  classId: string
): MonthlyExportRow[] {
  return studentsForClass(data.students, classId).map((student) => {
    const records = Object.values(data.attendance).filter(
      (record) => record.classId === classId && record.studentId === student.id && record.date.startsWith(`${monthKey}-`)
    );

    return {
      nama_siswa: student.name,
      nis: student.nis ?? "",
      hadir: records.filter((record) => record.status === "present").length,
      izin: records.filter((record) => record.status === "permission").length,
      sakit: records.filter((record) => record.status === "sick").length,
      alpa: records.filter((record) => record.status === "absent").length,
      tugas_piket: records.filter((record) => record.status === "duty").length,
      lainnya: records.filter((record) => record.status === "other").length,
      total_jam: records.length
    };
  });
}

export function classNameById(classes: ClassGroup[], classId: string) {
  return classes.find((item) => item.id === classId)?.name ?? "Kelas";
}
