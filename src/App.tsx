import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DatabaseBackup,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  GraduationCap,
  HardDrive,
  ArrowDown,
  ArrowUp,
  LayoutDashboard,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  Users,
  Code2
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import packageJson from "../package.json";
import appLogoUrl from "./assets/app-logo-ui.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  addClass,
  addSchedulePattern,
  addStudent,
  attendanceRecordKey,
  buildMonthlyRows,
  classNameById,
  deleteClassGroup,
  deleteStudent,
  markAllPresent,
  studentsForClass,
  trackedSlots,
  updateClassName,
  updateSchedulePattern,
  updateStudent,
  upsertAttendanceRecord
} from "./lib/attendance";
import { monthKeyFromDate, todayIso, formatIndonesianDate, getDaysInMonth } from "./lib/dates";
import {
  createDailyWorkbookForClasses,
  createMonthlyWorkbookForClasses,
  createStudentTemplateWorkbook,
  dailyFileNameForClasses,
  downloadWorkbook,
  importStudents,
  monthlyFileNameForClasses,
  parseStudentWorkbook
} from "./lib/excel";
import { makeId } from "./lib/ids";
import { ATTENDANCE_STATUS_OPTIONS, statusLabel } from "./lib/status";
import {
  backupFileNameForDate,
  buildStorageInfo,
  createBackupPayload,
  loadAppData,
  parseBackupPayload,
  resetAppData,
  saveAppData
} from "./lib/storage";
import type { AppData, AttendanceStatus, ClassGroup, LessonSlot, SchedulePattern, Student, StudentSortMode } from "./lib/types";

type ViewKey = "dashboard" | "attendance" | "students" | "classes" | "schedules" | "exports" | "settings" | "developer";
type ToastKind = "success" | "error" | "info";
type SaveStatus = "saving" | "saved";
type UpdateCheckStatus = "idle" | "checking" | "available" | "installing" | "current" | "error";
type GithubReleaseAsset = { name: string; browser_download_url: string };
type GithubRelease = {
  tag_name: string;
  html_url: string;
  name?: string;
  published_at?: string;
  assets: GithubReleaseAsset[];
};
type UpdateState = {
  status: UpdateCheckStatus;
  message: string;
  release?: GithubRelease;
  asset?: GithubReleaseAsset;
};
type GenderCode = "L" | "P";

const navItems: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "attendance", label: "Input Absensi", icon: ClipboardList },
  { key: "students", label: "Data Siswa", icon: Users },
  { key: "classes", label: "Data Kelas", icon: GraduationCap },
  { key: "schedules", label: "Pengaturan Jam", icon: CalendarDays },
  { key: "exports", label: "Rekap & Export", icon: FileSpreadsheet },
  { key: "settings", label: "Pengaturan", icon: Settings },
  { key: "developer", label: "Info Pengembang", icon: Code2 }
];

const GITHUB_LATEST_RELEASE_URL = "https://api.github.com/repos/farishhz/Hadirin/releases/latest";
const CURRENT_APP_VERSION = packageJson.version;

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeGender(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (["l", "lk", "laki", "laki-laki", "putra", "ikhwan", "male"].includes(normalized)) return "male";
  if (["p", "pr", "perempuan", "putri", "akhwat", "female"].includes(normalized)) return "female";
  return "unknown";
}

function genderCodeFromValue(value?: string): GenderCode {
  return normalizeGender(value) === "female" ? "P" : "L";
}

function compareStudentsByName(first: Student, second: Student) {
  return first.name.localeCompare(second.name, "id-ID");
}

function sortStudentsForView(students: Student[], mode: StudentSortMode, customOrder: string[]) {
  if (mode === "custom") {
    const rank = new Map(customOrder.map((id, index) => [id, index]));
    return [...students].sort((first, second) => {
      const firstRank = rank.get(first.id) ?? Number.MAX_SAFE_INTEGER;
      const secondRank = rank.get(second.id) ?? Number.MAX_SAFE_INTEGER;
      if (firstRank !== secondRank) return firstRank - secondRank;
      return compareStudentsByName(first, second);
    });
  }

  if (mode === "male-first" || mode === "female-first") {
    const preferred = mode === "male-first" ? "male" : "female";
    const secondary = mode === "male-first" ? "female" : "male";
    const rankGender = (student: Student) => {
      const gender = normalizeGender(student.gender);
      if (gender === preferred) return 0;
      if (gender === secondary) return 1;
      return 2;
    };

    return [...students].sort((first, second) => {
      const genderDiff = rankGender(first) - rankGender(second);
      return genderDiff || compareStudentsByName(first, second);
    });
  }

  return [...students].sort(compareStudentsByName);
}

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, "").split("-")[0];
}

function compareVersions(firstVersion: string, secondVersion: string) {
  const first = normalizeVersion(firstVersion).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const second = normalizeVersion(secondVersion).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(first.length, second.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (first[index] ?? 0) - (second[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function formatSavedTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function selectInstallerAsset(assets: GithubReleaseAsset[]) {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  const isMac = platform.includes("mac") || userAgent.includes("mac os");
  const isWindows = platform.includes("win") || userAgent.includes("windows");

  if (isMac) {
    return assets.find((asset) => asset.name.endsWith(".dmg")) ?? assets.find((asset) => asset.name.includes(".app"));
  }

  if (isWindows) {
    return (
      assets.find((asset) => asset.name.endsWith("-setup.exe")) ??
      assets.find((asset) => asset.name.endsWith(".exe")) ??
      assets.find((asset) => asset.name.endsWith(".msi"))
    );
  }

  return assets.find((asset) => asset.name.endsWith(".dmg") || asset.name.endsWith(".exe") || asset.name.endsWith(".msi"));
}

async function openExternalDownload(url: string) {
  try {
    await openUrl(url);
  } catch {
    const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!openedWindow) {
      window.location.assign(url);
    }
  }
}

function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedClassId, setSelectedClassId] = useState(data.classes[0]?.id ?? "");
  const [selectedScheduleId, setSelectedScheduleId] = useState(data.activeSchedulePatternId);
  const [studentForm, setStudentForm] = useState({ name: "", nis: "", gender: "L", note: "" });
  const [className, setClassName] = useState("");
  const [scheduleName, setScheduleName] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [customStatusForm, setCustomStatusForm] = useState({ label: "", abbreviation: "", color: "slate" });
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [reportMonthKey, setReportMonthKey] = useState(() => monthKeyFromDate(todayIso()));
  const [exportClassIds, setExportClassIds] = useState<string[]>(() => data.classes.map((item) => item.id));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState(data.updatedAt);
  const [dataDirectory, setDataDirectory] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: "idle",
    message: "Cek release terbaru dari GitHub saat perangkat terhubung internet."
  });

  useEffect(() => {
    const savedAt = new Date().toISOString();
    setSaveStatus("saving");
    saveAppData(data);
    setLastSavedAt(savedAt);

    const timer = window.setTimeout(() => {
      setSaveStatus("saved");
    }, 220);

    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    let isMounted = true;

    invoke<string>("get_app_data_dir")
      .then((directory) => {
        if (isMounted) setDataDirectory(directory);
      })
      .catch(() => {
        if (isMounted) setDataDirectory("");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setExportClassIds((current) => {
      const validIds = data.classes.map((item) => item.id);
      const next = current.filter((id) => validIds.includes(id));
      const normalized = next.length > 0 ? next : validIds;

      if (normalized.length === current.length && normalized.every((id, index) => id === current[index])) {
        return current;
      }

      return normalized;
    });
  }, [data.classes]);

  const selectedClass = data.classes.find((item) => item.id === selectedClassId) ?? data.classes[0];
  const selectedSchedule =
    data.schedulePatterns.find((item) => item.id === selectedScheduleId) ?? data.schedulePatterns[0];
  const studentSortMode = (data.studentSortModeByClass[selectedClass?.id ?? ""] ?? "az") as StudentSortMode;
  const selectedStudents = useMemo(
    () => studentsForClass(data.students, selectedClass?.id ?? ""),
    [data.students, selectedClass?.id]
  );
  const displayedStudents = useMemo(
    () =>
      sortStudentsForView(
        selectedStudents,
        studentSortMode,
        data.studentOrderByClass[selectedClass?.id ?? ""] ?? []
      ),
    [data.studentOrderByClass, selectedClass?.id, selectedStudents, studentSortMode]
  );
  const monthlyRows = useMemo(
    () => buildMonthlyRows(data, monthKeyFromDate(selectedDate), selectedClass?.id ?? ""),
    [data, selectedDate, selectedClass?.id]
  );
  const exportClasses = useMemo(
    () => data.classes.filter((item) => exportClassIds.includes(item.id)),
    [data.classes, exportClassIds]
  );
  const trackedSlotCount = selectedSchedule ? trackedSlots(selectedSchedule).length : 0;
  const filledToday = Object.values(data.attendance).filter(
    (record) => record.date === selectedDate && record.classId === selectedClass?.id
  ).length;
  const institutionName = data.institutionName?.trim() || "Nama sekolah belum diatur";
  const storageInfo = useMemo(() => buildStorageInfo(dataDirectory), [dataDirectory]);

  function updateData(nextData: AppData) {
    setData(nextData);
  }

  function handleSaveNow() {
    const savedAt = new Date().toISOString();
    setSaveStatus("saving");
    saveAppData(data);
    setLastSavedAt(savedAt);

    window.setTimeout(() => {
      setSaveStatus("saved");
    }, 220);
    notify("Semua data dan pengaturan sudah tersimpan di perangkat ini.");
  }

  function notify(message: string, kind: ToastKind = "success") {
    window.setTimeout(() => {
      let stack = document.querySelector<HTMLDivElement>("#absen-toast-root");
      if (!stack) {
        stack = document.createElement("div");
        stack.id = "absen-toast-root";
        stack.className = "toast-stack";
        stack.setAttribute("aria-live", "polite");
        stack.setAttribute("aria-relevant", "additions");
        document.body.append(stack);
      }

      const notice = document.createElement("div");
      notice.className = `app-toast ${kind}`;
      notice.setAttribute("role", "status");

      const text = document.createElement("span");
      text.textContent = message;

      const dismiss = document.createElement("button");
      dismiss.className = "toast-dismiss";
      dismiss.type = "button";
      dismiss.setAttribute("aria-label", "Tutup notifikasi");
      dismiss.textContent = "x";
      dismiss.addEventListener("click", () => notice.remove());

      notice.append(text, dismiss);
      stack.append(notice);

      while (stack.children.length > 3) {
        stack.firstElementChild?.remove();
      }

      window.setTimeout(() => notice.remove(), 3600);
    }, 0);
  }

  function downloadBackup() {
    downloadTextFile(backupFileNameForDate(todayIso()), createBackupPayload(data));
    notify("Backup data JSON berhasil didownload.");
  }

  async function openAppDataDirectory() {
    try {
      const directory = await invoke<string>("open_app_data_dir");
      setDataDirectory(directory);
      notify("Folder data aplikasi dibuka.");
    } catch {
      notify("Folder data hanya bisa dibuka dari aplikasi desktop.", "error");
    }
  }

  function handleMarkAllPresent() {
    if (!selectedClass || !selectedSchedule) return;
    updateData(markAllPresent(data, selectedDate, selectedClass.id, selectedSchedule.id));
    notify(`${selectedStudents.length} siswa ditandai hadir untuk ${trackedSlotCount} jam pelajaran.`);
  }

  function handleAttendanceChange(
    studentId: string,
    slotId: string,
    status: AttendanceStatus,
    customStatus?: string,
    note?: string,
    shouldNotify = false
  ) {
    if (!selectedClass) return;
    updateData(
      upsertAttendanceRecord(data, {
        date: selectedDate,
        classId: selectedClass.id,
        studentId,
        slotId,
        status,
        customStatus,
        note
      })
    );
    if (shouldNotify) {
      const student = data.students.find((item) => item.id === studentId);
      notify(`Absensi ${student?.name ?? "siswa"} diperbarui.`);
    }
  }

  async function handleImportStudents(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const rows = await parseStudentWorkbook(file);
      const imported = importStudents(data, rows);
      updateData(imported.data);
      setImportMessage(
        `${imported.result.importedStudents} siswa masuk, ${imported.result.createdClasses} kelas baru, ${imported.result.skippedRows} baris dilewati.`
      );
      notify(`${imported.result.importedStudents} siswa berhasil diimport dari Excel.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Import gagal.");
      notify(error instanceof Error ? error.message : "Import gagal.", "error");
    } finally {
      event.currentTarget.value = "";
    }
  }

  function handleRestoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        updateData(parseBackupPayload(String(reader.result)));
        notify("Backup berhasil direstore.");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Restore backup gagal.", "error");
      }
    };
    reader.readAsText(file);
    event.currentTarget.value = "";
  }

  function setScheduleSlots(pattern: SchedulePattern, slots: LessonSlot[]) {
    updateData(updateSchedulePattern(data, { ...pattern, slots }));
  }

  function toggleExportClass(classId: string) {
    setExportClassIds((current) =>
      current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId]
    );
  }

  function updateStudentSortMode(mode: StudentSortMode) {
    if (!selectedClass) return;
    updateData({
      ...data,
      studentSortModeByClass: {
        ...data.studentSortModeByClass,
        [selectedClass.id]: mode
      },
      updatedAt: new Date().toISOString()
    });
  }

  function moveStudentInCustomOrder(studentId: string, direction: "up" | "down") {
    if (!selectedClass) return;

    const orderedIds = displayedStudents.map((student) => student.id);
    const currentIndex = orderedIds.indexOf(studentId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedIds.length) return;

    const nextIds = [...orderedIds];
    [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

    updateData({
      ...data,
      studentOrderByClass: {
        ...data.studentOrderByClass,
        [selectedClass.id]: nextIds
      },
      updatedAt: new Date().toISOString()
    });
    notify("Urutan siswa diperbarui.");
  }

  function handleInstitutionNameChange(name: string) {
    updateData({
      ...data,
      institutionName: name,
      updatedAt: new Date().toISOString()
    });
  }

  function handleUpdateClassName(classGroup: ClassGroup, name: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      notify("Nama kelas tidak boleh kosong.", "error");
      return;
    }
    if (cleanName === classGroup.name) return;

    const duplicate = data.classes.some(
      (item) => item.id !== classGroup.id && item.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      notify(`Kelas ${cleanName} sudah ada.`, "error");
      return;
    }

    updateData(updateClassName(data, classGroup.id, cleanName));
    notify(`Nama kelas diperbarui menjadi ${cleanName}.`);
  }

  function handleDeleteClass(classGroup: ClassGroup) {
    const studentCount = data.students.filter((student) => student.classId === classGroup.id).length;
    const confirmed = window.confirm(
      `Hapus ${classGroup.name}?\n\nPeringatan: seluruh ${studentCount} siswa di kelas ini dan semua data absensinya akan ikut terhapus. Aksi ini tidak bisa dibatalkan kecuali dari backup.`
    );

    if (!confirmed) return;

    const nextData = deleteClassGroup(data, classGroup.id);
    updateData(nextData);
    if (selectedClassId === classGroup.id) {
      setSelectedClassId(nextData.classes[0]?.id ?? "");
    }
    notify(`${classGroup.name} dan ${studentCount} siswa di dalamnya dihapus.`);
  }

  function handleUpdateStudentDetails(student: Student, nextStudent: Pick<Student, "name" | "nis" | "gender" | "note">) {
    const cleanName = nextStudent.name.trim();
    if (!cleanName) {
      notify("Nama siswa tidak boleh kosong.", "error");
      return;
    }

    updateData(updateStudent(data, student.id, nextStudent));
    notify(`Data ${cleanName} diperbarui.`);
  }

  async function exportDailyForSelectedClasses() {
    const classIds = exportClasses.map((item) => item.id);
    if (classIds.length === 0 || !selectedSchedule) {
      notify("Pilih minimal satu kelas untuk export.", "error");
      return;
    }

    await downloadWorkbook(
      createDailyWorkbookForClasses(data, selectedDate, classIds, selectedSchedule.id),
      dailyFileNameForClasses(data, selectedDate, classIds)
    );
    notify(`Rekap harian ${classIds.length} kelas berhasil didownload.`);
  }

  async function exportMonthlyForSelectedClasses() {
    const classIds = exportClasses.map((item) => item.id);
    if (classIds.length === 0) {
      notify("Pilih minimal satu kelas untuk export.", "error");
      return;
    }

    const monthKey = monthKeyFromDate(selectedDate);
    await downloadWorkbook(
      createMonthlyWorkbookForClasses(data, monthKey, classIds),
      monthlyFileNameForClasses(data, monthKey, classIds)
    );
    notify(`Rekap bulanan ${classIds.length} kelas berhasil didownload.`);
  }

  async function checkForUpdates() {
    setUpdateState({
      status: "checking",
      message: "Mengecek release terbaru di GitHub..."
    });

    try {
      const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub mengembalikan status ${response.status}.`);
      }

      const release = (await response.json()) as GithubRelease;
      const latestVersion = normalizeVersion(release.tag_name);
      const hasUpdate = compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;
      const asset = selectInstallerAsset(release.assets);

      if (!hasUpdate) {
        setUpdateState({
          status: "current",
          message: `Aplikasi sudah versi terbaru (${CURRENT_APP_VERSION}).`,
          release,
          asset
        });
        notify("Aplikasi sudah versi terbaru.", "info");
        return;
      }

      setUpdateState({
        status: "available",
        message: `Update ${release.tag_name} tersedia. Klik Install Update untuk memperbarui aplikasi dari dalam app.`,
        release,
        asset
      });
      notify(`Update ${release.tag_name} tersedia.`, "info");
    } catch (error) {
      setUpdateState({
        status: "error",
        message: error instanceof Error ? error.message : "Gagal mengecek update."
      });
      notify("Gagal mengecek update dari GitHub.", "error");
    }
  }

  async function installAvailableUpdate() {
    setUpdateState((current) => ({
      ...current,
      status: "installing",
      message: "Menyiapkan update otomatis..."
    }));

    try {
      const update = await check();

      if (!update) {
        setUpdateState((current) => ({
          ...current,
          status: "current",
          message: `Aplikasi sudah versi terbaru (${CURRENT_APP_VERSION}).`
        }));
        notify("Aplikasi sudah versi terbaru.", "info");
        return;
      }

      let downloadedBytes = 0;
      let totalBytes = 0;
      const updateProgressMessage = (event: DownloadEvent) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? 0;
          downloadedBytes = 0;
          setUpdateState((current) => ({
            ...current,
            status: "installing",
            message: "Mengunduh update..."
          }));
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const percentage = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          setUpdateState((current) => ({
            ...current,
            status: "installing",
            message: percentage > 0 ? `Mengunduh update... ${percentage}%` : "Mengunduh update..."
          }));
        }

        if (event.event === "Finished") {
          setUpdateState((current) => ({
            ...current,
            status: "installing",
            message: "Update selesai diunduh. Menginstall..."
          }));
        }
      };

      await update.downloadAndInstall(updateProgressMessage);
      setUpdateState((current) => ({
        ...current,
        status: "installing",
        message: "Update berhasil diinstall. Aplikasi akan dibuka ulang..."
      }));
      notify("Update berhasil diinstall. Aplikasi akan dibuka ulang.", "success");
      await relaunch();
    } catch (error) {
      setUpdateState((current) => ({
        ...current,
        status: "error",
        message:
          error instanceof Error
            ? `Instal otomatis gagal: ${error.message}`
            : "Instal otomatis gagal. Silakan download installer manual."
      }));
      notify("Instal otomatis gagal. Coba download installer manual.", "error");
    }
  }

  const saveHeaderProps = {
    lastSavedAt,
    onSave: handleSaveNow,
    saveStatus
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img className="brand-mark" src={appLogoUrl} alt="" aria-hidden="true" />
          <div>
            <strong>Hadirin</strong>
            <small>{institutionName}</small>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                className={activeView === item.key ? "nav-item active" : "nav-item"}
                variant="ghost"
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key)}
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <CheckCircle2 size={18} />
          Data tersimpan lokal di perangkat ini.
        </div>
      </aside>

      <main className="main-panel">
        {activeView === "dashboard" && (
          <section className="view-stack">
            <PageHeader
              title="Dashboard"
              description={`Ringkasan data ${institutionName} dan pintasan kerja operator absensi.`}
              {...saveHeaderProps}
            />
            <div className="metric-grid">
              <MetricCard label="Kelas" value={data.classes.length} />
              <MetricCard label="Siswa" value={data.students.length} />
              <MetricCard label="Pola Jam" value={data.schedulePatterns.length} />
              <MetricCard label="Entri Hari Ini" value={filledToday} />
            </div>
            <div className="workspace-card hero-card">
              <div>
                <h2>Mulai input absensi hari ini</h2>
                <p>
                  Pilih kelas, pilih pola jam, klik Hadir Semua, lalu ubah status siswa yang berbeda dari buku
                  absen.
                </p>
              </div>
              <Button type="button" onClick={() => setActiveView("attendance")}>
                <ClipboardList data-icon="inline-start" />
                Buka Input Absensi
              </Button>
            </div>
          </section>
        )}

        {activeView === "attendance" && selectedClass && selectedSchedule && (
          <section className="view-stack">
            <PageHeader
              title="Input Absensi"
              description="Isi absensi per siswa dan per jam pelajaran. Slot pemisah tidak dihitung absensi."
              {...saveHeaderProps}
            />
            <div className="toolbar-card">
              <label>
                Tanggal
                <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              </label>
              <label>
                Kelas
                <ClassSelect
                  classes={data.classes}
                  value={selectedClass.id}
                  onValueChange={setSelectedClassId}
                />
              </label>
              <label>
                Pola Jam
                <ScheduleSelect
                  schedules={data.schedulePatterns}
                  value={selectedSchedule.id}
                  onValueChange={setSelectedScheduleId}
                />
              </label>
              <Button type="button" onClick={handleMarkAllPresent}>
                <CheckCircle2 data-icon="inline-start" />
                Hadir Semua
              </Button>
            </div>

            <AttendanceGrid
              data={data}
              date={selectedDate}
              classId={selectedClass.id}
              students={selectedStudents}
              schedule={selectedSchedule}
              onChange={handleAttendanceChange}
            />
          </section>
        )}

        {activeView === "students" && selectedClass && (
          <section className="view-stack">
            <PageHeader
              title="Data Siswa"
              description="Tambah siswa manual atau import Excel dengan kolom nama_siswa dan kelas."
              {...saveHeaderProps}
            />
            <div className="split-grid">
              <div className="workspace-card">
                <h2>Tambah Siswa</h2>
                <div className="form-grid">
                  <Input
                    placeholder="Nama siswa"
                    value={studentForm.name}
                    onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })}
                  />
                  <Input
                    placeholder="NIS (opsional)"
                    value={studentForm.nis}
                    onChange={(event) => setStudentForm({ ...studentForm, nis: event.target.value })}
                  />
                  <ClassSelect
                    classes={data.classes}
                    value={selectedClass.id}
                    onValueChange={setSelectedClassId}
                  />
                  <GenderSelect
                    value={studentForm.gender}
                    onValueChange={(gender) => setStudentForm({ ...studentForm, gender })}
                  />
                  <Input
                    className="span-2"
                    placeholder="Catatan (opsional)"
                    value={studentForm.note}
                    onChange={(event) => setStudentForm({ ...studentForm, note: event.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!studentForm.name.trim()) {
                      notify("Nama siswa wajib diisi.", "error");
                      return;
                    }
                    updateData(addStudent(data, { ...studentForm, classId: selectedClass.id }));
                    setStudentForm({ name: "", nis: "", gender: "L", note: "" });
                    notify(`Siswa ditambahkan ke ${selectedClass.name}.`);
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Tambah Siswa
                </Button>
              </div>

              <div className="workspace-card">
                <h2>Import Excel</h2>
                <p className="muted-text">Gunakan template agar format kolom konsisten.</p>
                <div className="button-row">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={async () => {
                      await downloadWorkbook(createStudentTemplateWorkbook(), "template-siswa-hadirin.xlsx");
                      notify("Template siswa berhasil didownload.");
                    }}
                  >
                    <Download data-icon="inline-start" />
                    Download Template
                  </Button>
                  <label className="file-button">
                    <Upload data-icon="inline-start" />
                    Import Excel
                    <input accept=".xlsx,.xls" type="file" onChange={handleImportStudents} />
                  </label>
                </div>
                {importMessage && <p className="inline-message">{importMessage}</p>}
              </div>
            </div>

            <div className="toolbar-card student-toolbar">
              <label>
                Tampilkan kelas
                <ClassSelect
                  classes={data.classes}
                  value={selectedClass.id}
                  onValueChange={setSelectedClassId}
                />
              </label>
              <label>
                Urutkan
                <StudentSortSelect value={studentSortMode} onValueChange={updateStudentSortMode} />
              </label>
              <span className="toolbar-summary">{selectedStudents.length} siswa di {selectedClass.name}</span>
            </div>

            <StudentDataTable
              students={displayedStudents}
              sortMode={studentSortMode}
              onMove={moveStudentInCustomOrder}
              onSave={handleUpdateStudentDetails}
              onDelete={(student) => {
                updateData(deleteStudent(data, student.id));
                notify(`${student.name} dihapus dari data siswa.`);
              }}
              onOpenReport={(student) => {
                setReportStudent(student);
              }}
            />
          </section>
        )}

        {activeView === "classes" && (
          <section className="view-stack">
            <PageHeader
              title="Data Kelas"
              description="Kelola daftar kelas yang dipakai untuk input absensi."
              {...saveHeaderProps}
            />
            <div className="toolbar-card compact">
              <Input
                placeholder="Nama kelas, contoh: Kelas 3B"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
              />
              <Button
                type="button"
                onClick={() => {
                  if (!className.trim()) {
                    notify("Nama kelas wajib diisi.", "error");
                    return;
                  }
                  notify(`${className.trim()} ditambahkan.`);
                  updateData(addClass(data, className));
                  setClassName("");
                }}
              >
                <Plus data-icon="inline-start" />
                Tambah Kelas
              </Button>
            </div>
            <ClassDataTable
              classes={data.classes}
              students={data.students}
              onDelete={handleDeleteClass}
              onRename={handleUpdateClassName}
            />
          </section>
        )}

        {activeView === "schedules" && selectedSchedule && (
          <section className="view-stack">
            <PageHeader
              title="Pengaturan Jam"
              description="Buat pola jam yang bisa dipilih saat input absensi, termasuk slot pemisah seperti istirahat."
              {...saveHeaderProps}
            />
            <div className="toolbar-card compact">
              <Input
                placeholder="Nama pola baru, contoh: Ramadhan"
                value={scheduleName}
                onChange={(event) => setScheduleName(event.target.value)}
              />
              <Button
                type="button"
                onClick={() => {
                  if (!scheduleName.trim()) {
                    notify("Nama pola jam wajib diisi.", "error");
                    return;
                  }
                  updateData(addSchedulePattern(data, scheduleName));
                  notify(`Pola jam ${scheduleName.trim()} ditambahkan.`);
                  setScheduleName("");
                }}
              >
                <Plus data-icon="inline-start" />
                Tambah Pola
              </Button>
            </div>
            <div className="workspace-card">
              <div className="section-title-row">
                <label>
                  Pola aktif
                  <ScheduleSelect
                    schedules={data.schedulePatterns}
                    value={selectedSchedule.id}
                    onValueChange={setSelectedScheduleId}
                  />
                </label>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setScheduleSlots(selectedSchedule, [
                      ...selectedSchedule.slots,
                      { id: makeId("slot"), name: `Jam ${selectedSchedule.slots.length + 1}`, isAttendanceTracked: true }
                    ]);
                    notify("Slot jam pelajaran ditambahkan.");
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Tambah Slot
                </Button>
              </div>
              <div className="slot-list">
                {selectedSchedule.slots.map((slot, index) => (
                  <div className="slot-row" key={slot.id}>
                    <span className="slot-number">{index + 1}</span>
                    <Input
                      value={slot.name}
                      onChange={(event) => {
                        const slots = selectedSchedule.slots.map((item) =>
                          item.id === slot.id ? { ...item, name: event.target.value } : item
                        );
                        setScheduleSlots(selectedSchedule, slots);
                      }}
                    />
                    <label className="toggle-row">
                      <Checkbox
                        checked={slot.isAttendanceTracked}
                        onCheckedChange={(checked) => {
                          const slots = selectedSchedule.slots.map((item) =>
                            item.id === slot.id ? { ...item, isAttendanceTracked: checked === true } : item
                          );
                          setScheduleSlots(selectedSchedule, slots);
                          notify("Pengaturan slot diperbarui.");
                        }}
                      />
                      Wajib absen
                    </label>
                    <Button
                      className="text-destructive"
                      size="icon"
                      variant="outline"
                      type="button"
                      title="Hapus slot"
                      onClick={() => {
                        setScheduleSlots(
                          selectedSchedule,
                          selectedSchedule.slots.filter((item) => item.id !== slot.id)
                        );
                        notify(`${slot.name} dihapus dari pola jam.`);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === "exports" && selectedClass && selectedSchedule && (
          <section className="view-stack">
            <PageHeader
              title="Rekap & Export"
              description="Export rekap harian atau bulanan ke Excel untuk arsip dan laporan sekolah."
              {...saveHeaderProps}
            />
            <div className="workspace-card">
              <div className="section-title-row">
                <div>
                  <h2>Kelas yang diexport</h2>
                  <p className="muted-text">
                    Pilih satu, beberapa, atau semua kelas. Setiap kelas akan dibuat sebagai sheet terpisah di Excel.
                  </p>
                </div>
                <div className="button-row no-margin">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setExportClassIds(data.classes.map((item) => item.id));
                      notify("Semua kelas dipilih untuk export.", "info");
                    }}
                  >
                    Semua Kelas
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setExportClassIds([selectedClass.id]);
                      notify(`${selectedClass.name} dipilih untuk export.`, "info");
                    }}
                  >
                    Kelas Aktif
                  </Button>
                </div>
              </div>
              <div className="class-picker-grid">
                {data.classes.map((item) => (
                  <label className="class-check" key={item.id}>
                    <Checkbox
                      checked={exportClassIds.includes(item.id)}
                      onCheckedChange={() => toggleExportClass(item.id)}
                    />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{data.students.filter((student) => student.classId === item.id).length} siswa</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className={exportClasses.length === 0 ? "inline-message error" : "inline-message"}>
                {exportClasses.length === 0
                  ? "Pilih minimal satu kelas sebelum export."
                  : `${exportClasses.length} kelas dipilih untuk export.`}
              </p>
            </div>
            <div className="split-grid">
              <div className="workspace-card">
                <h2>Rekap Harian</h2>
                <p className="muted-text">
                  {formatIndonesianDate(selectedDate)} - {exportClasses.length} kelas dipilih
                </p>
                <Button
                  disabled={exportClasses.length === 0}
                  type="button"
                  onClick={exportDailyForSelectedClasses}
                >
                  <Download data-icon="inline-start" />
                  Export Harian
                </Button>
              </div>
              <div className="workspace-card">
                <h2>Rekap Bulanan</h2>
                <p className="muted-text">
                  {monthKeyFromDate(selectedDate)} - {exportClasses.length} kelas dipilih
                </p>
                <Button
                  disabled={exportClasses.length === 0}
                  type="button"
                  onClick={exportMonthlyForSelectedClasses}
                >
                  <Download data-icon="inline-start" />
                  Export Bulanan
                </Button>
              </div>
            </div>
            <p className="muted-text">Preview di bawah menampilkan rekap bulanan kelas aktif: {selectedClass.name}.</p>
            <DataTable
              headers={[
                "Nama",
                "Hadir",
                "Izin",
                "Sakit",
                "Alpa",
                "Tugas/Piket",
                "Lainnya",
                ...(data.customStatuses ?? []).map((cs) => cs.label),
                "Total Jam"
              ]}
              rows={monthlyRows.map((row) => [
                row.nama_siswa,
                row.hadir.toString(),
                row.izin.toString(),
                row.sakit.toString(),
                row.alpa.toString(),
                row.tugas_piket.toString(),
                row.lainnya.toString(),
                ...(data.customStatuses ?? []).map((cs) => (row[cs.label.toLowerCase()] ?? 0).toString()),
                row.total_jam.toString()
              ])}
            />
          </section>
        )}

        {activeView === "settings" && (
          <section className="view-stack">
            <PageHeader
              title="Pengaturan"
              description="Backup, restore, dan reset data lokal aplikasi."
              {...saveHeaderProps}
            />
            <div className="workspace-card">
              <h2>Identitas Lembaga</h2>
              <p className="muted-text">
                Isi nama sekolah, pesantren, atau lembaga agar tampilan aplikasi terasa milik institusi sendiri.
              </p>
              <label className="settings-field">
                Nama lembaga / sekolah
                <Input
                  placeholder="Contoh: Pondok Pesantren Nurul Ilmi"
                  value={data.institutionName ?? ""}
                  onChange={(event) => handleInstitutionNameChange(event.target.value)}
                />
              </label>
            </div>

            {/* Custom Status Card */}
            <div className="workspace-card">
              <h2>Kustomisasi Status Absensi</h2>
              <p className="muted-text">
                Tambahkan status absensi khusus untuk sekolah Anda (misal: Terlambat, Dispensasi, Skorsing). Status ini akan muncul di pilihan absen siswa dan direkap terpisah.
              </p>
              
              {/* Form to add custom status */}
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end", gap: "10px", marginTop: "16px" }}>
                <label>
                  Nama Status
                  <Input
                    placeholder="Contoh: Dispensasi"
                    value={customStatusForm.label}
                    onChange={(e) => setCustomStatusForm({ ...customStatusForm, label: e.target.value })}
                  />
                </label>
                <label>
                  Singkatan (1-2 huruf)
                  <Input
                    placeholder="Contoh: D"
                    maxLength={2}
                    value={customStatusForm.abbreviation}
                    onChange={(e) => setCustomStatusForm({ ...customStatusForm, abbreviation: e.target.value.toUpperCase() })}
                  />
                </label>
                <label>
                  Warna Tampilan
                  <Select
                    value={customStatusForm.color}
                    onValueChange={(color) => setCustomStatusForm({ ...customStatusForm, color })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih warna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emerald">Hijau (Emerald)</SelectItem>
                      <SelectItem value="blue">Biru (Blue)</SelectItem>
                      <SelectItem value="yellow">Kuning (Yellow)</SelectItem>
                      <SelectItem value="red">Merah (Red)</SelectItem>
                      <SelectItem value="purple">Ungu (Purple)</SelectItem>
                      <SelectItem value="orange">Jingga (Orange)</SelectItem>
                      <SelectItem value="pink">Merah Muda (Pink)</SelectItem>
                      <SelectItem value="slate">Abu-abu (Slate)</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <Button
                  type="button"
                  onClick={() => {
                    const label = customStatusForm.label.trim();
                    const abbreviation = customStatusForm.abbreviation.trim();
                    if (!label || !abbreviation) {
                      notify("Nama status dan singkatan wajib diisi.", "error");
                      return;
                    }
                    
                    const existingList = data.customStatuses ?? [];
                    if (existingList.some(item => item.label.toLowerCase() === label.toLowerCase() || item.id === label.toLowerCase().replace(/\s+/g, "_"))) {
                      notify("Status dengan nama tersebut sudah ada.", "error");
                      return;
                    }

                    const newStatus = {
                      id: label.toLowerCase().replace(/\s+/g, "_"),
                      label,
                      abbreviation,
                      color: customStatusForm.color
                    };

                    updateData({
                      ...data,
                      customStatuses: [...existingList, newStatus],
                      updatedAt: new Date().toISOString()
                    });
                    setCustomStatusForm({ label: "", abbreviation: "", color: "slate" });
                    notify(`Status kustom "${label}" berhasil ditambahkan.`);
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Tambah
                </Button>
              </div>

              {/* List of custom statuses */}
              <div style={{ marginTop: "20px" }}>
                <h3 className="text-sm font-semibold mb-2">Daftar Status Kustom Aktif</h3>
                {(data.customStatuses ?? []).length === 0 ? (
                  <p className="muted-text text-xs">Belum ada status kustom. Gunakan formulir di atas untuk menambahkan.</p>
                ) : (
                  <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                    {(data.customStatuses ?? []).map((cs) => {
                      const colors = {
                        emerald: "bg-emerald-100 border-emerald-300 text-emerald-800",
                        blue: "bg-blue-100 border-blue-300 text-blue-800",
                        yellow: "bg-yellow-100 border-yellow-300 text-yellow-800",
                        red: "bg-red-100 border-red-300 text-red-800",
                        purple: "bg-purple-100 border-purple-300 text-purple-800",
                        orange: "bg-orange-100 border-orange-300 text-orange-800",
                        pink: "bg-pink-100 border-pink-300 text-pink-800",
                        slate: "bg-slate-100 border-slate-300 text-slate-800"
                      }[cs.color || "slate"] || "bg-slate-100 border-slate-300 text-slate-800";

                      return (
                        <div key={cs.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surface)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold ${colors}`}>
                              {cs.abbreviation}
                            </span>
                            <div>
                              <strong className="text-sm text-slate-800 dark:text-slate-200">{cs.label}</strong>
                              <span className="text-xs text-slate-400 block">ID: {cs.id}</span>
                            </div>
                          </div>
                          <Button
                            className="text-destructive"
                            variant="outline"
                            size="icon-sm"
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(`Hapus status kustom "${cs.label}"? Data kehadiran yang sudah terekam dengan status ini akan tetap ada tetapi statusnya akan dirujuk secara umum.`);
                              if (!confirmed) return;
                              
                              updateData({
                                ...data,
                                customStatuses: (data.customStatuses ?? []).filter(item => item.id !== cs.id),
                                updatedAt: new Date().toISOString()
                              });
                              notify(`Status "${cs.label}" berhasil dihapus.`);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="workspace-card update-card">
              <div>
                <Badge variant="outline">Versi {CURRENT_APP_VERSION}</Badge>
                <h2>Check for Update</h2>
                <p className="muted-text">{updateState.message}</p>
                {updateState.release && (
                  <p className="update-meta">
                    Latest release: {updateState.release.tag_name}
                    {updateState.release.published_at
                      ? ` - ${new Date(updateState.release.published_at).toLocaleDateString("id-ID")}`
                      : ""}
                  </p>
                )}
              </div>
              <div className="update-actions">
                <Button disabled={updateState.status === "checking" || updateState.status === "installing"} type="button" onClick={checkForUpdates}>
                  <RefreshCw data-icon="inline-start" />
                  {updateState.status === "checking" ? "Checking..." : "Check for Update"}
                </Button>
                {updateState.status === "available" && updateState.asset && (
                  <Button type="button" variant="outline" onClick={installAvailableUpdate}>
                    <Download data-icon="inline-start" />
                    Install Update
                  </Button>
                )}
                {updateState.asset && (
                  <Button
                    disabled={updateState.status === "installing"}
                    type="button"
                    variant="outline"
                    onClick={() => void openExternalDownload(updateState.asset!.browser_download_url)}
                  >
                    <Download data-icon="inline-start" />
                    Download Installer
                  </Button>
                )}
                {updateState.release && (
                  <Button
                    disabled={updateState.status === "installing"}
                    type="button"
                    variant="ghost"
                    onClick={() => void openExternalDownload(updateState.release!.html_url)}
                  >
                    <ExternalLink data-icon="inline-start" />
                    Buka Release
                  </Button>
                )}
              </div>
              {updateState.status === "available" && !updateState.asset && (
                <p className="inline-message error">
                  Update ditemukan, tapi installer untuk perangkat ini belum tersedia di release tersebut.
                </p>
              )}
              <p className="update-note">
                Catatan: update otomatis aktif mulai versi ini. Jika perangkat menolak instal otomatis, gunakan Download
                Installer dari GitHub Releases.
              </p>
            </div>
            <div className="workspace-card storage-card">
              <div className="storage-card-heading">
                <HardDrive size={26} />
                <div>
                  <h2>Lokasi Data Tersimpan</h2>
                  <p className="muted-text">
                    Data kerja tersimpan otomatis di perangkat ini. Backup manual bisa didownload sebagai file JSON
                    yang mudah dipindahkan atau disimpan di cloud.
                  </p>
                </div>
              </div>
              <div className="storage-info-grid">
                <div className="storage-info-item">
                  <span>Format data utama</span>
                  <strong>{storageInfo.storageType}</strong>
                  <small>Dipakai aplikasi untuk auto-save harian.</small>
                </div>
                <div className="storage-info-item">
                  <span>Key internal</span>
                  <code>{storageInfo.storageKey}</code>
                  <small>Bukan file yang perlu diedit manual.</small>
                </div>
                <div className="storage-info-item wide">
                  <span>Folder data aplikasi</span>
                  <code>{storageInfo.dataDirectory || "Tersedia saat dibuka dari aplikasi desktop."}</code>
                  <small>Di macOS akan terbuka di Finder, di Windows akan terbuka di File Explorer.</small>
                </div>
                <div className="storage-info-item">
                  <span>Backup manual</span>
                  <strong>{storageInfo.backupFormat}</strong>
                  <code>{storageInfo.backupFileExample}</code>
                </div>
              </div>
              <div className="button-row">
                <Button disabled={!dataDirectory} type="button" variant="outline" onClick={openAppDataDirectory}>
                  <FolderOpen data-icon="inline-start" />
                  Buka Folder Data
                </Button>
                <Button type="button" onClick={downloadBackup}>
                  <FileJson data-icon="inline-start" />
                  Download Backup JSON
                </Button>
              </div>
            </div>
            <div className="split-grid">
              <div className="workspace-card">
                <DatabaseBackup size={26} />
                <h2>Backup Data</h2>
                <p className="muted-text">Simpan semua data kelas, siswa, pola jam, dan absensi ke file JSON.</p>
                <Button type="button" onClick={downloadBackup}>
                  <Download data-icon="inline-start" />
                  Download Backup
                </Button>
              </div>
              <div className="workspace-card">
                <Upload size={26} />
                <h2>Restore Data</h2>
                <p className="muted-text">Pulihkan data dari file backup Hadirin.</p>
                <label className="file-button">
                  <Upload size={17} />
                  Pilih File Backup
                  <input accept=".json" type="file" onChange={handleRestoreBackup} />
                </label>
              </div>
            </div>
            <div className="workspace-card danger-zone">
              <div>
                <h2>Reset Data Demo</h2>
                <p className="muted-text">Menghapus data lokal dan memuat ulang contoh bawaan aplikasi.</p>
              </div>
              <Button
                variant="destructive"
                type="button"
                onClick={() => {
                  resetAppData();
                  setData(loadAppData());
                  notify("Data lokal direset ke contoh bawaan.");
                }}
              >
                <RotateCcw data-icon="inline-start" />
                Reset
              </Button>
            </div>
          </section>
        )}

        {activeView === "developer" && (
          <section className="view-stack animate-fade-in">
            <PageHeader
              title="Info Pengembang"
              description="Informasi tentang pengembang dan organisasi di balik aplikasi Hadirin."
              {...saveHeaderProps}
            />
            
            <div className="split-grid">
              {/* Developer Profile Card */}
              <div className="workspace-card flex flex-col items-center text-center gap-4 py-8 px-5 border-t-4 border-t-[#047857] hover:shadow-md transition-all duration-200">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white dark:border-zinc-800"
                  style={{ background: "linear-gradient(135deg, #047857 0%, #065f46 100%)" }}
                >
                  FA
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Alfarisi Azmir</h2>
                  <p className="text-sm font-semibold text-[#047857] dark:text-[#34d399] mt-1">@farishhz</p>
                </div>
                <p className="text-slate-650 dark:text-slate-350 text-sm max-w-sm">
                  Pengembang utama aplikasi Hadirin. Fokus mengembangkan solusi digital offline-first, cepat, dan mudah digunakan untuk instansi pendidikan.
                </p>
                <div className="mt-auto w-full pt-4">
                  <Button 
                    className="w-full flex items-center justify-center gap-2"
                    type="button"
                    onClick={() => void openExternalDownload("https://github.com/farishhz")}
                  >
                    <ExternalLink size={16} />
                    Kunjungi GitHub Profile
                  </Button>
                </div>
              </div>

              {/* Organization Card */}
              <div className="workspace-card flex flex-col items-center text-center gap-4 py-8 px-5 border-t-4 border-t-[#2563eb] hover:shadow-md transition-all duration-200">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white dark:border-zinc-800"
                  style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" }}
                >
                  TD
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tenka Developer</h2>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">@tenka-developer</p>
                </div>
                <p className="text-slate-650 dark:text-slate-350 text-sm max-w-sm">
                  Wadah kolaborasi pengembang independen untuk menciptakan aplikasi open-source berkualitas tinggi yang andal, aman, dan bermanfaat bagi masyarakat.
                </p>
                <div className="mt-auto w-full pt-4">
                  <Button 
                    className="w-full flex items-center justify-center gap-2"
                    variant="outline"
                    type="button"
                    onClick={() => void openExternalDownload("https://github.com/tenka-developer")}
                  >
                    <ExternalLink size={16} />
                    Kunjungi GitHub Organisasi
                  </Button>
                </div>
              </div>
            </div>

            {/* Tech Stack Details */}
            <div className="workspace-card p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Code2 className="text-emerald-600" size={20} />
                Teknologi & Spesifikasi Aplikasi
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] hover:bg-[var(--surface)] hover:shadow-sm transition-all duration-200">
                  <span className="block text-xs font-semibold text-[var(--app-muted)] tracking-wider">FRAMEWORK DESKTOP</span>
                  <strong className="block text-sm text-[var(--text)] mt-1">Tauri v2 (Rust Engine)</strong>
                </div>
                <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] hover:bg-[var(--surface)] hover:shadow-sm transition-all duration-200">
                  <span className="block text-xs font-semibold text-[var(--app-muted)] tracking-wider">FRONTEND LIBRARY</span>
                  <strong className="block text-sm text-[var(--text)] mt-1">React 19 & TypeScript</strong>
                </div>
                <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] hover:bg-[var(--surface)] hover:shadow-sm transition-all duration-200">
                  <span className="block text-xs font-semibold text-[var(--app-muted)] tracking-wider">STYLING ENGINE</span>
                  <strong className="block text-sm text-[var(--text)] mt-1">Tailwind CSS v4</strong>
                </div>
                <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-soft)] hover:bg-[var(--surface)] hover:shadow-sm transition-all duration-200">
                  <span className="block text-xs font-semibold text-[var(--app-muted)] tracking-wider">EXPORT & DATA</span>
                  <strong className="block text-sm text-[var(--text)] mt-1">ExcelJS & LocalStorage</strong>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center text-xs text-[var(--app-muted)] gap-2">
                <span>Versi Aplikasi: v{CURRENT_APP_VERSION}</span>
                <span>Lisensi: MIT License</span>
                <span>Tipe Rilis: Stabil & Offline</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Student Report Card Modal Overlay */}
      {reportStudent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setReportStudent(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Laporan Kehadiran Siswa</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Detail riwayat kehadiran bulanan dan akumulasi statistik.
                </p>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setReportStudent(null)}
                aria-label="Tutup modal"
                style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
              >
                Tutup
              </Button>
            </div>

            {/* Print Area Section */}
            <div id="printable-report-area" className="space-y-6">
              {/* Profile Card */}
              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-lg border border-slate-100 dark:border-zinc-850 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">{reportStudent.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    NIS: {reportStudent.nis || "-"} | Jenis Kelamin: {reportStudent.gender === "P" ? "Perempuan" : "Laki-laki"}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <span className="block text-slate-400">Kelas</span>
                  <strong className="text-slate-700 dark:text-slate-200 text-lg">{classNameById(data.classes, reportStudent.classId)}</strong>
                </div>
              </div>

              {/* Month Selector and Stats */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Left Side: Month Selector & Statistics */}
                <div className="w-full md:w-1/3 space-y-4">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Pilih Bulan Rekap
                    <Select value={reportMonthKey} onValueChange={setReportMonthKey}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(Object.values(data.attendance).map(r => r.date.slice(0, 7)))).sort().reverse().map(mKey => (
                          <SelectItem key={mKey} value={mKey}>{mKey}</SelectItem>
                        ))}
                        {/* Fallback to current month if no data */}
                        {!Array.from(new Set(Object.values(data.attendance).map(r => r.date.slice(0, 7)))).includes(reportMonthKey) && (
                          <SelectItem value={reportMonthKey}>{reportMonthKey}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </label>

                  {/* Calculations */}
                  {(() => {
                    const monthRecs = Object.values(data.attendance).filter(
                      r => r.studentId === reportStudent.id && r.date.startsWith(`${reportMonthKey}-`)
                    );
                    const totalSlots = monthRecs.length;
                    const presentSlots = monthRecs.filter(r => r.status === "present").length;
                    const permission = monthRecs.filter(r => r.status === "permission").length;
                    const sick = monthRecs.filter(r => r.status === "sick").length;
                    const absent = monthRecs.filter(r => r.status === "absent").length;
                    const duty = monthRecs.filter(r => r.status === "duty").length;
                    const customStatuses = data.customStatuses ?? [];
                    const others = monthRecs.filter(
                      r => r.status === "other" && !customStatuses.some(cs => cs.label === r.customStatus)
                    ).length;

                    const presenceRate = totalSlots > 0 ? Math.round((presentSlots / totalSlots) * 100) : 100;

                    return (
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-lg p-4 space-y-4 bg-white dark:bg-zinc-900 shadow-xs">
                        <div className="text-center pb-3 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Persentase Kehadiran</span>
                          <strong className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{presenceRate}%</strong>
                          <span className="text-xs text-slate-400 mt-1 block">Dari {totalSlots} total jam pelajaran</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400">
                            Hadir: <strong>{presentSlots} jam</strong>
                          </div>
                          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400">
                            Izin: <strong>{permission} jam</strong>
                          </div>
                          <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400">
                            Sakit: <strong>{sick} jam</strong>
                          </div>
                          <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400">
                            Alpa: <strong>{absent} jam</strong>
                          </div>
                          <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-400">
                            Piket: <strong>{duty} jam</strong>
                          </div>
                          <div className="p-2 rounded bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-350">
                            Lainnya: <strong>{others} jam</strong>
                          </div>
                        </div>

                        {/* Custom statuses details */}
                        {customStatuses.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 space-y-2">
                            <span className="text-xs text-slate-400 block font-semibold">Status Kustom:</span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {customStatuses.map(cs => {
                                const count = monthRecs.filter(
                                  r => r.status === cs.id || (r.status === "other" && r.customStatus === cs.label)
                                ).length;
                                return (
                                  <div key={cs.id} className="p-2 rounded border border-slate-100 dark:border-zinc-850 bg-white dark:bg-zinc-950">
                                    {cs.label}: <strong>{count} jam</strong>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Right Side: Log Kalender */}
                <div className="w-full md:w-2/3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Jurnal Log Kehadiran</span>
                  {(() => {
                    const customStatuses = data.customStatuses ?? [];
                    const monthRecs = Object.values(data.attendance).filter(
                      r => r.studentId === reportStudent.id && r.date.startsWith(`${reportMonthKey}-`)
                    );
                    const activeDates = Array.from(new Set(monthRecs.map(r => r.date))).sort();

                    if (activeDates.length === 0) {
                      return (
                        <div className="border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg p-8 text-center text-slate-400 text-sm">
                          Tidak ada rekaman absensi pada bulan ini.
                        </div>
                      );
                    }

                    return (
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
                              <th className="p-3 font-semibold text-slate-500">Hari & Tanggal</th>
                              <th className="p-3 font-semibold text-slate-500">Absensi Detail</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDates.map(dateStr => {
                              const recsForDay = monthRecs.filter(r => r.date === dateStr);
                              return (
                                <tr key={dateStr} className="border-b border-slate-100 dark:border-zinc-850 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20">
                                  <td className="p-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                    {formatIndonesianDate(dateStr).split(",")[1]?.trim() || dateStr}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {recsForDay.map(r => {
                                        let slotName = r.slotId;
                                        for (const pattern of data.schedulePatterns) {
                                          const foundSlot = pattern.slots.find(s => s.id === r.slotId);
                                          if (foundSlot) {
                                            slotName = foundSlot.name;
                                            break;
                                          }
                                        }

                                        let label = statusLabel(r.status, customStatuses, r.customStatus);
                                        let abbreviation = label.slice(0, 1).toUpperCase();
                                        
                                        let colors = "bg-slate-100 text-slate-800 border-slate-200";
                                        if (r.status === "present") colors = "bg-emerald-100 text-emerald-800 border-emerald-200";
                                        else if (r.status === "permission") colors = "bg-blue-100 text-blue-800 border-blue-200";
                                        else if (r.status === "sick") colors = "bg-yellow-100 text-yellow-800 border-yellow-200";
                                        else if (r.status === "absent") colors = "bg-red-100 text-red-800 border-red-200";
                                        else if (r.status === "duty") colors = "bg-purple-100 text-purple-800 border-purple-200";
                                        else {
                                          const cs = customStatuses.find(c => c.id === r.status);
                                          if (cs) {
                                            abbreviation = cs.abbreviation;
                                            colors = {
                                              emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
                                              blue: "bg-blue-100 text-blue-800 border-blue-200",
                                              yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
                                              red: "bg-red-100 text-red-800 border-red-200",
                                              purple: "bg-purple-100 text-purple-800 border-purple-200",
                                              orange: "bg-orange-100 text-orange-850 border-orange-200",
                                              pink: "bg-pink-100 text-pink-850 border-pink-200",
                                              slate: "bg-slate-100 text-slate-850 border-slate-250"
                                            }[cs.color || "slate"] || colors;
                                          }
                                        }

                                        return (
                                          <span 
                                            key={r.id} 
                                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${colors}`}
                                            title={`${slotName}: ${label}${r.note ? ' - ' + r.note : ''}`}
                                          >
                                            <strong className="font-extrabold">{abbreviation}</strong>
                                            <span className="opacity-75 text-[10px]">{slotName}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800 mt-6">
              <Button variant="outline" type="button" onClick={() => window.print()}>
                Cetak Laporan
              </Button>
              <Button type="button" onClick={() => setReportStudent(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassSelect({
  classes,
  value,
  onValueChange
}: {
  classes: ClassGroup[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih kelas" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {classes.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function GenderSelect({
  value,
  onValueChange
}: {
  value: string;
  onValueChange: (value: GenderCode) => void;
}) {
  return (
    <Select value={genderCodeFromValue(value)} onValueChange={(nextValue) => onValueChange(nextValue as GenderCode)}>
      <SelectTrigger aria-label="Jenis kelamin">
        <SelectValue placeholder="Jenis kelamin" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="L">L</SelectItem>
          <SelectItem value="P">P</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function ScheduleSelect({
  schedules,
  value,
  onValueChange
}: {
  schedules: SchedulePattern[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih pola jam" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {schedules.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function StudentSortSelect({
  value,
  onValueChange
}: {
  value: StudentSortMode;
  onValueChange: (value: StudentSortMode) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as StudentSortMode)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih urutan" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="az">Nama A-Z</SelectItem>
          <SelectItem value="custom">Custom order</SelectItem>
          <SelectItem value="male-first">Laki-laki dulu, A-Z</SelectItem>
          <SelectItem value="female-first">Perempuan dulu, A-Z</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function PageHeader({
  title,
  description,
  lastSavedAt,
  onSave,
  saveStatus
}: {
  title: string;
  description: string;
  lastSavedAt: string;
  onSave: () => void;
  saveStatus: SaveStatus;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">
        <div className="save-status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{saveStatus === "saving" ? "Menyimpan..." : "Tersimpan"}</span>
          <small>Terakhir {formatSavedTime(lastSavedAt)}</small>
        </div>
        <Button type="button" variant="outline" onClick={onSave}>
          <Save data-icon="inline-start" />
          Simpan
        </Button>
      </div>
    </header>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="metric-card">
      <CardContent>
        <span>{label}</span>
        <strong>{value}</strong>
      </CardContent>
    </Card>
  );
}

function AttendanceGrid({
  data,
  date,
  classId,
  students,
  schedule,
  onChange
}: {
  data: AppData;
  date: string;
  classId: string;
  students: AppData["students"];
  schedule: SchedulePattern;
  onChange: (
    studentId: string,
    slotId: string,
    status: AttendanceStatus,
    customStatus?: string,
    note?: string,
    shouldNotify?: boolean
  ) => void;
}) {
  const customStatuses = data.customStatuses ?? [];
  const getStatusColorStyles = (statusVal: string) => {
    const cs = customStatuses.find((c) => c.id === statusVal);
    if (!cs) return {};

    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      emerald: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
      blue: { bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
      yellow: { bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
      red: { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" },
      purple: { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" },
      orange: { bg: "#ffedd5", border: "#fed7aa", text: "#c2410c" },
      pink: { bg: "#fce7f3", border: "#fbcfe8", text: "#9d174d" },
      slate: { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" }
    };

    const colors = colorMap[cs.color || "slate"] || colorMap.slate;
    return {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      color: colors.text
    };
  };

  return (
    <div className="attendance-table-wrap">
      <Table className="attendance-table">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky-col">Siswa</TableHead>
            {schedule.slots.map((slot) => (
              <TableHead key={slot.id} className={slot.isAttendanceTracked ? "" : "break-slot"}>
                {slot.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="student-cell sticky-col">
                <strong>{student.name}</strong>
                <span>{student.nis || "Tanpa NIS"}</span>
              </TableCell>
              {schedule.slots.map((slot) => {
                if (!slot.isAttendanceTracked) {
                  return (
                    <TableCell className="break-cell" key={slot.id}>
                      -
                    </TableCell>
                  );
                }

                const record = data.attendance[attendanceRecordKey(date, classId, student.id, slot.id)];
                const status = record?.status ?? "absent";

                return (
                  <TableCell className="attendance-cell" key={slot.id}>
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        onChange(
                          student.id,
                          slot.id,
                          value,
                          customStatuses.find((cs) => cs.id === value)?.label || record?.customStatus,
                          record?.note,
                          true
                        )
                      }
                    >
                      <SelectTrigger 
                        className={`status-select status-${status}`}
                        style={getStatusColorStyles(status)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {statusLabel(option, customStatuses)}
                            </SelectItem>
                          ))}
                          {customStatuses.map((cs) => (
                            <SelectItem key={cs.id} value={cs.id}>
                              {cs.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {status === "other" && (
                      <Input
                        className="cell-note"
                        placeholder="Status"
                        value={record?.customStatus ?? ""}
                        onChange={(event) => onChange(student.id, slot.id, status, event.target.value, record?.note)}
                      />
                    )}
                    <Input
                      className="cell-note"
                      placeholder="Catatan"
                      value={record?.note ?? ""}
                      onChange={(event) =>
                        onChange(student.id, slot.id, status, record?.customStatus, event.target.value)
                      }
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {students.length === 0 && <div className="empty-state">Belum ada siswa di kelas ini.</div>}
    </div>
  );
}

function StudentDataTable({
  students,
  sortMode,
  onMove,
  onSave,
  onDelete,
  onOpenReport
}: {
  students: Student[];
  sortMode: StudentSortMode;
  onMove: (studentId: string, direction: "up" | "down") => void;
  onSave: (student: Student, nextStudent: Pick<Student, "name" | "nis" | "gender" | "note">) => void;
  onDelete: (student: Student) => void;
  onOpenReport: (student: Student) => void;
}) {
  function saveFromRow(student: Student, row: HTMLTableRowElement) {
    const fields = Object.fromEntries(
      Array.from(row.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[name], select[name]")).map((input) => [
        input.name,
        input.value
      ])
    );
    onSave(student, {
      name: String(fields.name ?? ""),
      nis: String(fields.nis ?? ""),
      gender: genderCodeFromValue(String(fields.gender ?? student.gender)),
      note: String(fields.note ?? "")
    });
  }

  return (
    <Card className="data-table-wrap student-table-card">
      <Table className="data-table student-data-table">
        <TableHeader>
          <TableRow>
            <TableHead className="number-col">No</TableHead>
            <TableHead>Nama Siswa</TableHead>
            <TableHead>NIS</TableHead>
            <TableHead>Jenis Kelamin</TableHead>
            <TableHead>Catatan</TableHead>
            <TableHead className="order-col">Urutan</TableHead>
            <TableHead className="action-col">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student, index) => (
            <TableRow key={student.id}>
              <TableCell className="number-cell">{index + 1}</TableCell>
              <TableCell className="student-name-cell">
                <form
                  className="editable-row-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveFromRow(student, event.currentTarget.closest("tr")!);
                  }}
                >
                  <Input name="name" defaultValue={student.name} aria-label={`Nama ${student.name}`} />
                </form>
              </TableCell>
              <TableCell>
                <form
                  className="editable-row-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveFromRow(student, event.currentTarget.closest("tr")!);
                  }}
                >
                  <Input name="nis" defaultValue={student.nis ?? ""} aria-label={`NIS ${student.name}`} />
                </form>
              </TableCell>
              <TableCell>
                <form
                  className="editable-row-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveFromRow(student, event.currentTarget.closest("tr")!);
                  }}
                >
                  <select
                    className="inline-select"
                    name="gender"
                    defaultValue={genderCodeFromValue(student.gender)}
                    aria-label={`Jenis kelamin ${student.name}`}
                  >
                    <option value="L">L</option>
                    <option value="P">P</option>
                  </select>
                </form>
              </TableCell>
              <TableCell className="note-cell">
                <form
                  className="editable-row-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveFromRow(student, event.currentTarget.closest("tr")!);
                  }}
                >
                  <Input name="note" defaultValue={student.note ?? ""} aria-label={`Catatan ${student.name}`} />
                </form>
              </TableCell>
              <TableCell>
                <div className="order-actions">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    type="button"
                    title="Simpan perubahan siswa"
                    onClick={(event) => saveFromRow(student, event.currentTarget.closest("tr")!)}
                  >
                    <Save />
                  </Button>
                  <Button
                    disabled={sortMode !== "custom" || index === 0}
                    size="icon-sm"
                    variant="outline"
                    type="button"
                    title="Naikkan urutan"
                    onClick={() => onMove(student.id, "up")}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    disabled={sortMode !== "custom" || index === students.length - 1}
                    size="icon-sm"
                    variant="outline"
                    type="button"
                    title="Turunkan urutan"
                    onClick={() => onMove(student.id, "down")}
                  >
                    <ArrowDown />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    type="button"
                    title="Laporan Kehadiran"
                    onClick={() => onOpenReport(student)}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                  <Button
                    className="text-destructive"
                    size="icon-sm"
                    variant="outline"
                    type="button"
                    title="Hapus siswa"
                    onClick={() => onDelete(student)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {students.length === 0 && <div className="empty-state">Belum ada siswa di kelas ini.</div>}
      {students.length > 0 && (
        <p className="table-helper">Edit data siswa langsung di tabel, lalu klik ikon simpan pada baris tersebut.</p>
      )}
      {sortMode === "custom" && students.length > 0 && (
        <p className="table-helper">Gunakan panah naik/turun untuk menyamakan urutan dengan format absen sekolah.</p>
      )}
    </Card>
  );
}

function ClassDataTable({
  classes,
  students,
  onRename,
  onDelete
}: {
  classes: ClassGroup[];
  students: Student[];
  onRename: (classGroup: ClassGroup, name: string) => void;
  onDelete: (classGroup: ClassGroup) => void;
}) {
  return (
    <Card className="data-table-wrap class-table-card">
      <Table className="data-table">
        <TableHeader>
          <TableRow>
            <TableHead>Nama Kelas</TableHead>
            <TableHead>Jumlah Siswa</TableHead>
            <TableHead className="action-col">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((classGroup) => {
            const studentCount = students.filter((student) => student.classId === classGroup.id).length;
            return (
              <TableRow key={classGroup.id}>
                <TableCell>
                  <Input
                    defaultValue={classGroup.name}
                    aria-label={`Nama kelas ${classGroup.name}`}
                    onBlur={(event) => onRename(classGroup, event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onRename(classGroup, event.currentTarget.value);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{studentCount} siswa</TableCell>
                <TableCell>
                  <Button
                    className="text-destructive"
                    size="icon-sm"
                    variant="outline"
                    type="button"
                    title={`Hapus ${classGroup.name}`}
                    onClick={() => onDelete(classGroup)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {classes.length === 0 && <div className="empty-state">Belum ada kelas. Tambahkan kelas untuk mulai input siswa.</div>}
      <p className="table-helper">
        Edit nama kelas langsung di tabel. Menghapus kelas akan meminta konfirmasi karena semua siswa di kelas itu ikut terhapus.
      </p>
    </Card>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <Card className="data-table-wrap">
      <Table className="data-table">
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && <div className="empty-state">Belum ada data.</div>}
    </Card>
  );
}

export default App;
