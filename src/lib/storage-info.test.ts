import { describe, expect, it } from "vitest";
import { backupFileNameForDate, buildStorageInfo } from "./storage";

describe("storage info", () => {
  it("describes internal storage and portable backup format", () => {
    const info = buildStorageInfo("/Users/admin/Library/Application Support/id.opensource.absenkelas");

    expect(info).toEqual({
      storageType: "Penyimpanan lokal aplikasi",
      storageKey: "absen-kelas:v1",
      backupFormat: "JSON",
      backupFileExample: "backup-absen-kelas-2026-06-01.json",
      dataDirectory: "/Users/admin/Library/Application Support/id.opensource.absenkelas"
    });
  });

  it("uses the same backup file name pattern as the settings download action", () => {
    expect(backupFileNameForDate("2026-06-01")).toBe("backup-absen-kelas-2026-06-01.json");
  });
});
