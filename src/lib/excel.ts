import ExcelJS from "exceljs";
import { makeId } from "./ids";
import type { AppData, ImportResult, StudentImportRow } from "./types";
import { buildDailyRows, buildMonthlyRows, classNameById } from "./attendance";

function normalizeCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRow(row: Record<string, unknown>): StudentImportRow {
  const lowered = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/\s+/g, "_"), value])
  );

  return {
    nama_siswa: normalizeCell(lowered.nama_siswa ?? lowered.nama ?? lowered.name),
    kelas: normalizeCell(lowered.kelas ?? lowered.class),
    nis: normalizeCell(lowered.nis),
    jenis_kelamin: normalizeCell(lowered.jenis_kelamin ?? lowered.gender),
    catatan: normalizeCell(lowered.catatan ?? lowered.note)
  };
}

export async function parseStudentWorkbook(file: File): Promise<StudentImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error("File Excel tidak memiliki sheet.");
  }

  const headers: string[] = [];
  const rows: StudentImportRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    const values = row.values as ExcelJS.CellValue[];

    if (rowNumber === 1) {
      values.slice(1).forEach((value) => headers.push(normalizeCell(value)));
      return;
    }

    const rowObject: Record<string, unknown> = {};
    values.slice(1).forEach((value, index) => {
      rowObject[headers[index] ?? `kolom_${index + 1}`] = value;
    });
    rows.push(normalizeRow(rowObject));
  });

  return rows;
}

export function importStudents(data: AppData, rows: StudentImportRow[]): { data: AppData; result: ImportResult } {
  const nextClasses = [...data.classes];
  const nextStudents = [...data.students];
  const errors: string[] = [];
  let createdClasses = 0;
  let importedStudents = 0;
  let skippedRows = 0;

  rows.forEach((row, index) => {
    if (!row.nama_siswa || !row.kelas) {
      skippedRows += 1;
      errors.push(`Baris ${index + 2}: nama_siswa dan kelas wajib diisi.`);
      return;
    }

    let targetClass = nextClasses.find((item) => item.name.toLowerCase() === row.kelas.toLowerCase());
    if (!targetClass) {
      targetClass = { id: makeId("class"), name: row.kelas };
      nextClasses.push(targetClass);
      createdClasses += 1;
    }

    const duplicate = nextStudents.find(
      (student) =>
        student.classId === targetClass?.id &&
        student.name.toLowerCase() === row.nama_siswa.toLowerCase() &&
        (row.nis ? student.nis === row.nis : true)
    );

    if (duplicate) {
      skippedRows += 1;
      return;
    }

    nextStudents.push({
      id: makeId("student"),
      name: row.nama_siswa,
      classId: targetClass.id,
      nis: row.nis || undefined,
      gender: row.jenis_kelamin || undefined,
      note: row.catatan || undefined
    });
    importedStudents += 1;
  });

  return {
    data: {
      ...data,
      classes: nextClasses,
      students: nextStudents,
      updatedAt: new Date().toISOString()
    },
    result: { importedStudents, createdClasses, skippedRows, errors }
  };
}

export function createStudentTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Template Siswa");
  sheet.columns = [
    { header: "nama_siswa", key: "nama_siswa", width: 28 },
    { header: "kelas", key: "kelas", width: 16 },
    { header: "nis", key: "nis", width: 14 },
    { header: "jenis_kelamin", key: "jenis_kelamin", width: 16 },
    { header: "catatan", key: "catatan", width: 28 }
  ];
  sheet.addRows([
    { nama_siswa: "Ahmad Fauzan", kelas: "Kelas 1A", nis: "1001", jenis_kelamin: "L", catatan: "" },
    { nama_siswa: "Aisyah Rahma", kelas: "Kelas 1A", nis: "1002", jenis_kelamin: "P", catatan: "" }
  ]);
  sheet.getRow(1).font = { bold: true };
  return workbook;
}

export function createDailyWorkbook(data: AppData, date: string, classId: string, scheduleId: string) {
  const workbook = new ExcelJS.Workbook();
  addDailyWorksheet(workbook, data, date, classId, scheduleId);
  return workbook;
}

export function createDailyWorkbookForClasses(data: AppData, date: string, classIds: string[], scheduleId: string) {
  const workbook = new ExcelJS.Workbook();
  classIds.forEach((classId) => addDailyWorksheet(workbook, data, date, classId, scheduleId));
  return workbook;
}

function addDailyWorksheet(workbook: ExcelJS.Workbook, data: AppData, date: string, classId: string, scheduleId: string) {
  const rows = buildDailyRows(data, date, classId, scheduleId);
  const sheet = workbook.addWorksheet(sheetName(classNameById(data.classes, classId), workbook.worksheets.length));
  const headers = rows[0] ? Object.keys(rows[0]) : ["nama_siswa", "nis"];
  sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(14, header.length + 4) }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
}

export function createMonthlyWorkbook(data: AppData, monthKey: string, classId: string) {
  const workbook = new ExcelJS.Workbook();
  addMonthlyWorksheet(workbook, data, monthKey, classId);
  return workbook;
}

export function createMonthlyWorkbookForClasses(data: AppData, monthKey: string, classIds: string[]) {
  const workbook = new ExcelJS.Workbook();
  classIds.forEach((classId) => addMonthlyWorksheet(workbook, data, monthKey, classId));
  return workbook;
}

function addMonthlyWorksheet(workbook: ExcelJS.Workbook, data: AppData, monthKey: string, classId: string) {
  const rows = buildMonthlyRows(data, monthKey, classId);
  const sheet = workbook.addWorksheet(sheetName(classNameById(data.classes, classId), workbook.worksheets.length));
  sheet.columns = [
    { header: "nama_siswa", key: "nama_siswa", width: 28 },
    { header: "nis", key: "nis", width: 14 },
    { header: "hadir", key: "hadir", width: 10 },
    { header: "izin", key: "izin", width: 10 },
    { header: "sakit", key: "sakit", width: 10 },
    { header: "alpa", key: "alpa", width: 10 },
    { header: "tugas_piket", key: "tugas_piket", width: 14 },
    { header: "lainnya", key: "lainnya", width: 10 },
    { header: "total_jam", key: "total_jam", width: 12 }
  ];
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function dailyFileName(data: AppData, date: string, classId: string) {
  return `rekap-harian-${classNameById(data.classes, classId).replace(/\s+/g, "-").toLowerCase()}-${date}.xlsx`;
}

export function monthlyFileName(data: AppData, monthKey: string, classId: string) {
  return `rekap-bulanan-${classNameById(data.classes, classId).replace(/\s+/g, "-").toLowerCase()}-${monthKey}.xlsx`;
}

export function dailyFileNameForClasses(data: AppData, date: string, classIds: string[]) {
  return `rekap-harian-${classSelectionSlug(data, classIds)}-${date}.xlsx`;
}

export function monthlyFileNameForClasses(data: AppData, monthKey: string, classIds: string[]) {
  return `rekap-bulanan-${classSelectionSlug(data, classIds)}-${monthKey}.xlsx`;
}

function classSelectionSlug(data: AppData, classIds: string[]) {
  if (classIds.length === data.classes.length) return "semua-kelas";
  if (classIds.length === 1) return classNameById(data.classes, classIds[0]).replace(/\s+/g, "-").toLowerCase();
  return `${classIds.length}-kelas`;
}

function sheetName(name: string, index: number) {
  const cleanName = name.replace(/[\\/?*\[\]:]/g, " ").trim() || `Kelas ${index + 1}`;
  return cleanName.slice(0, 31);
}
