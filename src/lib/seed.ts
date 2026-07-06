import { todayIso } from "./dates";
import type { AppData } from "./types";

const now = new Date().toISOString();

export const seedData: AppData = {
  classes: [
    { id: "class_1a", name: "Kelas 1A", description: "Contoh kelas awal" },
    { id: "class_2a", name: "Kelas 2A", description: "Contoh kelas awal" }
  ],
  students: [
    { id: "student_ahmad", name: "Ahmad Fauzan", classId: "class_1a", nis: "1001", gender: "L" },
    { id: "student_aisyah", name: "Aisyah Rahma", classId: "class_1a", nis: "1002", gender: "P" },
    { id: "student_bilal", name: "Bilal Hannan", classId: "class_1a", nis: "1003", gender: "L" },
    { id: "student_nadia", name: "Nadia Zahra", classId: "class_2a", nis: "2001", gender: "P" },
    { id: "student_zaki", name: "Zaki Mubarak", classId: "class_2a", nis: "2002", gender: "L" }
  ],
  studentOrderByClass: {
    class_1a: ["student_ahmad", "student_aisyah", "student_bilal"],
    class_2a: ["student_nadia", "student_zaki"]
  },
  studentSortModeByClass: {
    class_1a: "az",
    class_2a: "az"
  },
  schedulePatterns: [
    {
      id: "schedule_regular",
      name: "Hari Biasa",
      slots: [
        { id: "slot_1", name: "Jam 1", isAttendanceTracked: true },
        { id: "slot_2", name: "Jam 2", isAttendanceTracked: true },
        { id: "slot_break", name: "Istirahat", isAttendanceTracked: false },
        { id: "slot_3", name: "Jam 3", isAttendanceTracked: true },
        { id: "slot_4", name: "Jam 4", isAttendanceTracked: true },
        { id: "slot_5", name: "Jam 5", isAttendanceTracked: true },
        { id: "slot_6", name: "Jam 6", isAttendanceTracked: true },
        { id: "slot_7", name: "Jam 7", isAttendanceTracked: true }
      ]
    },
    {
      id: "schedule_friday",
      name: "Jumat",
      slots: [
        { id: "slot_f1", name: "Jam 1", isAttendanceTracked: true },
        { id: "slot_f2", name: "Jam 2", isAttendanceTracked: true },
        { id: "slot_dhuha", name: "Dhuha", isAttendanceTracked: false },
        { id: "slot_f3", name: "Jam 3", isAttendanceTracked: true },
        { id: "slot_f4", name: "Jam 4", isAttendanceTracked: true }
      ]
    }
  ],
  attendance: {},
  activeSchedulePatternId: "schedule_regular",
  updatedAt: now
};

for (const student of seedData.students.filter((item) => item.classId === "class_1a")) {
  for (const slot of seedData.schedulePatterns[0].slots.filter((item) => item.isAttendanceTracked)) {
    const id = `${todayIso()}:class_1a:${student.id}:${slot.id}` as const;
    seedData.attendance[id] = {
      id,
      date: todayIso(),
      classId: "class_1a",
      studentId: student.id,
      slotId: slot.id,
      status: student.id === "student_bilal" && slot.id === "slot_1" ? "duty" : "present",
      note: student.id === "student_bilal" && slot.id === "slot_1" ? "Piket gerbang" : undefined,
      updatedAt: now
    };
  }
}
