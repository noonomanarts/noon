"use client";

import { useState } from "react";
import { FiDatabase, FiFolder, FiDownload, FiUpload, FiAlertCircle, FiCheckCircle, FiLoader } from "react-icons/fi";

type TabType = "database" | "files";
type ActionStatus = "idle" | "loading" | "success" | "error";

interface BackupSectionProps {
  locale: "en" | "ar";
}

export default function BackupSection({ locale }: BackupSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("database");
  const [dbStatus, setDbStatus] = useState<ActionStatus>("idle");
  const [filesStatus, setFilesStatus] = useState<ActionStatus>("idle");
  const [message, setMessage] = useState("");

  const t = {
    database: locale === "ar" ? "قاعدة البيانات" : "Database",
    files: locale === "ar" ? "الملفات المرفوعة" : "Uploaded Files",
    backup: locale === "ar" ? "نسخ احتياطي" : "Backup",
    restore: locale === "ar" ? "استعادة" : "Restore",
    backupDb: locale === "ar" ? "نسخ قاعدة البيانات" : "Backup Database",
    restoreDb: locale === "ar" ? "استعادة قاعدة البيانات" : "Restore Database",
    backupFiles: locale === "ar" ? "نسخ الملفات" : "Backup Files",
    restoreFiles: locale === "ar" ? "استعادة الملفات" : "Restore Files",
    selectFile: locale === "ar" ? "اختر ملف..." : "Select file...",
    backupDesc: locale === "ar" 
      ? "قم بتنزيل نسخة احتياطية كاملة من قاعدة البيانات"
      : "Download a complete backup of your database",
    restoreDesc: locale === "ar"
      ? "قم برفع ملف نسخة احتياطية لاستعادة البيانات"
      : "Upload a backup file to restore data",
    filesBackupDesc: locale === "ar"
      ? "قم بتنزيل نسخة احتياطية من جميع الملفات المرفوعة"
      : "Download a backup of all uploaded files",
    filesRestoreDesc: locale === "ar"
      ? "قم برفع ملف نسخة احتياطية لاستعادة الملفات"
      : "Upload a backup file to restore files",
    warning: locale === "ar" ? "تحذير" : "Warning",
    warningText: locale === "ar"
      ? "سيتم استبدال جميع البيانات الحالية. هذه العملية لا يمكن التراجع عنها."
      : "This will replace all current data. This action cannot be undone.",
    processing: locale === "ar" ? "جاري المعالجة..." : "Processing...",
    success: locale === "ar" ? "تمت العملية بنجاح" : "Operation completed successfully",
  };

  const handleDatabaseBackup = async () => {
    setDbStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/backup/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });

      if (!response.ok) throw new Error("Backup failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `database-backup-${new Date().toISOString().split("T")[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDbStatus("success");
      setMessage(t.success);
      setTimeout(() => setDbStatus("idle"), 3000);
    } catch {
      setDbStatus("error");
      setMessage("Error creating backup");
      setTimeout(() => setDbStatus("idle"), 3000);
    }
  };

  const handleDatabaseRestore = async (file: File) => {
    setDbStatus("loading");
    setMessage(locale === "ar" ? "در حال بازیابی..." : "Restoring database...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "restore");

      const response = await fetch("/api/admin/backup/database", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Restore failed");
      }

      setDbStatus("success");
      setMessage(t.success);
      setTimeout(() => {
        setDbStatus("idle");
        window.location.reload();
      }, 2000);
    } catch (err) {
      setDbStatus("error");
      const errorMsg = err instanceof Error ? err.message : "Error restoring backup";
      setMessage(errorMsg);
      setTimeout(() => setDbStatus("idle"), 5000);
    }
  };

  const handleFilesBackup = async () => {
    setFilesStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/backup/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });

      if (!response.ok) throw new Error("Backup failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uploads-backup-${new Date().toISOString().split("T")[0]}.tar.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setFilesStatus("success");
      setMessage(t.success);
      setTimeout(() => setFilesStatus("idle"), 3000);
    } catch {
      setFilesStatus("error");
      setMessage("Error creating backup");
      setTimeout(() => setFilesStatus("idle"), 3000);
    }
  };

  const handleFilesRestore = async (file: File) => {
    setFilesStatus("loading");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "restore");

      const response = await fetch("/api/admin/backup/files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Restore failed");

      setFilesStatus("success");
      setMessage(t.success);
      setTimeout(() => setFilesStatus("idle"), 3000);
    } catch {
      setFilesStatus("error");
      setMessage("Error restoring backup");
      setTimeout(() => setFilesStatus("idle"), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("database")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "database"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <FiDatabase className="size-4" />
            {t.database}
            {activeTab === "database" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "files"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <FiFolder className="size-4" />
            {t.files}
            {activeTab === "files" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            dbStatus === "success" || filesStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400"
              : dbStatus === "error" || filesStatus === "error"
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
                : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400"
          }`}
        >
          {(dbStatus === "success" || filesStatus === "success") && <FiCheckCircle className="size-5" />}
          {(dbStatus === "error" || filesStatus === "error") && <FiAlertCircle className="size-5" />}
          {(dbStatus === "loading" || filesStatus === "loading") && <FiLoader className="size-5 animate-spin" />}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {/* Database Tab */}
      {activeTab === "database" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Backup Database */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <FiDownload className="size-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.backupDb}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.backupDesc}</p>
              </div>
            </div>
            <button
              onClick={handleDatabaseBackup}
              disabled={dbStatus === "loading"}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {dbStatus === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <FiLoader className="size-4 animate-spin" />
                  {t.processing}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FiDownload className="size-4" />
                  {t.backup}
                </span>
              )}
            </button>
          </div>

          {/* Restore Database */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FiUpload className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.restoreDb}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.restoreDesc}</p>
              </div>
            </div>
            
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">{t.warning}</p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t.warningText}</p>
                </div>
              </div>
            </div>

            <label className="block">
              <input
                type="file"
                accept=".sql"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDatabaseRestore(file);
                }}
                disabled={dbStatus === "loading"}
                className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-700 dark:file:text-zinc-300"
              />
            </label>
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === "files" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Backup Files */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <FiDownload className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.backupFiles}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.filesBackupDesc}</p>
              </div>
            </div>
            <button
              onClick={handleFilesBackup}
              disabled={filesStatus === "loading"}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {filesStatus === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <FiLoader className="size-4 animate-spin" />
                  {t.processing}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FiDownload className="size-4" />
                  {t.backup}
                </span>
              )}
            </button>
          </div>

          {/* Restore Files */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FiUpload className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.restoreFiles}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.filesRestoreDesc}</p>
              </div>
            </div>
            
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">{t.warning}</p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t.warningText}</p>
                </div>
              </div>
            </div>

            <label className="block">
              <input
                type="file"
                accept=".tar.gz,.tgz"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFilesRestore(file);
                }}
                disabled={filesStatus === "loading"}
                className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-700 dark:file:text-zinc-300"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
