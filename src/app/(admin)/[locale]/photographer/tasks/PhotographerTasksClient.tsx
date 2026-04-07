"use client";

import { useState, useMemo, useCallback } from "react";
import { FiCheckSquare, FiClock, FiAlertTriangle, FiCheckCircle, FiCircle, FiFilter, FiLoader } from "react-icons/fi";
import type { PhotographerTaskPublic } from "@/lib/db/photographer";

type Props = {
  locale: "en" | "ar";
  initialTasks: PhotographerTaskPublic[];
  initialTotal: number;
};

type FilterStatus = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

const priorityConfig: Record<string, { color: string; label: string; labelAr: string; order: number }> = {
  URGENT: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Urgent", labelAr: "عاجل", order: 0 },
  HIGH: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "High", labelAr: "مرتفع", order: 1 },
  MEDIUM: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Medium", labelAr: "متوسط", order: 2 },
  LOW: { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", label: "Low", labelAr: "منخفض", order: 3 },
};

const statusConfig: Record<string, { color: string; bg: string; icon: typeof FiCircle; label: string; labelAr: string }> = {
  PENDING: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: FiClock, label: "Pending", labelAr: "معلقة" },
  IN_PROGRESS: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: FiLoader, label: "In Progress", labelAr: "قيد التنفيذ" },
  COMPLETED: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: FiCheckCircle, label: "Completed", labelAr: "مكتملة" },
  CANCELLED: { color: "text-zinc-500", bg: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500", icon: FiCircle, label: "Cancelled", labelAr: "ملغاة" },
};

export default function PhotographerTasksClient({ locale, initialTasks, initialTotal }: Props) {
  const isRTL = locale === "ar";
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const t = {
    title: isRTL ? "المهام" : "Tasks",
    all: isRTL ? "الكل" : "All",
    pending: isRTL ? "معلقة" : "Pending",
    inProgress: isRTL ? "قيد التنفيذ" : "In Progress",
    completed: isRTL ? "مكتملة" : "Completed",
    noTasks: isRTL ? "لا توجد مهام" : "No tasks found",
    assignedBy: isRTL ? "من قبل" : "Assigned by",
    due: isRTL ? "الموعد النهائي" : "Due",
    completedAt: isRTL ? "أكملت في" : "Completed",
    markInProgress: isRTL ? "بدء العمل" : "Start Working",
    markComplete: isRTL ? "إكمال" : "Mark Complete",
    markPending: isRTL ? "إرجاع لمعلقة" : "Back to Pending",
    overdue: isRTL ? "متأخرة" : "Overdue",
    total: isRTL ? "الإجمالي" : "Total",
  };

  const filtered = useMemo(
    () => (filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  const counts = useMemo(() => ({
    ALL: tasks.length,
    PENDING: tasks.filter((t) => t.status === "PENDING").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    COMPLETED: tasks.filter((t) => t.status === "COMPLETED").length,
  }), [tasks]);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    setUpdatingId(taskId);
    try {
      const res = await fetch("/api/photographer/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
      }
    } finally {
      setUpdatingId(null);
    }
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function isOverdue(dueDate: string | null, status: string) {
    if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return false;
    return new Date(dueDate).getTime() < Date.now();
  }

  const filterButtons: { key: FilterStatus; label: string }[] = [
    { key: "ALL", label: `${t.all} (${counts.ALL})` },
    { key: "PENDING", label: `${t.pending} (${counts.PENDING})` },
    { key: "IN_PROGRESS", label: `${t.inProgress} (${counts.IN_PROGRESS})` },
    { key: "COMPLETED", label: `${t.completed} (${counts.COMPLETED})` },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {t.total}: {initialTotal}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800 w-fit">
        <FiFilter className="mx-1.5 size-4 text-zinc-400" />
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filter === btn.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <FiCheckSquare className="size-12 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">{t.noTasks}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            const statusConf = statusConfig[task.status];
            const priorityConf = priorityConfig[task.priority];
            const StatusIcon = statusConf.icon;
            const isUpdating = updatingId === task.id;

            return (
              <div
                key={task.id}
                className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-zinc-900 ${
                  overdue
                    ? "border-red-300 dark:border-red-800"
                    : "border-zinc-200 dark:border-zinc-800"
                } ${task.status === "COMPLETED" ? "opacity-70" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <button
                    onClick={() => {
                      if (task.status === "PENDING") updateTaskStatus(task.id, "IN_PROGRESS");
                      else if (task.status === "IN_PROGRESS") updateTaskStatus(task.id, "COMPLETED");
                      else if (task.status === "COMPLETED") updateTaskStatus(task.id, "PENDING");
                    }}
                    disabled={isUpdating}
                    className={`mt-0.5 flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${statusConf.color} ${isUpdating ? "animate-pulse" : ""}`}
                    title={
                      task.status === "PENDING"
                        ? t.markInProgress
                        : task.status === "IN_PROGRESS"
                        ? t.markComplete
                        : t.markPending
                    }
                  >
                    <StatusIcon className="size-5" />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          task.status === "COMPLETED"
                            ? "text-zinc-400 line-through dark:text-zinc-500"
                            : "text-zinc-900 dark:text-white"
                        }`}
                      >
                        {isRTL && task.titleAr ? task.titleAr : task.title}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityConf.color}`}>
                          {isRTL ? priorityConf.labelAr : priorityConf.label}
                        </span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusConf.bg}`}>
                          {isRTL ? statusConf.labelAr : statusConf.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {(task.description || task.descriptionAr) && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {isRTL && task.descriptionAr ? task.descriptionAr : task.description}
                      </p>
                    )}

                    {/* Notes */}
                    {(task.notes || task.notesAr) && (
                      <p className="mt-1 text-xs text-zinc-400 italic dark:text-zinc-500 line-clamp-1">
                        {isRTL && task.notesAr ? task.notesAr : task.notes}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{t.assignedBy}: <strong>{task.assignedByName}</strong></span>
                      {task.dueDate && (
                        <span className={overdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                          {overdue && <FiAlertTriangle className="inline size-3 mr-0.5" />}
                          {t.due}: {formatDate(task.dueDate)}
                          {overdue && ` (${t.overdue})`}
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {t.completedAt}: {formatDate(task.completedAt)}
                        </span>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      {task.status === "PENDING" && (
                        <button
                          onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")}
                          disabled={isUpdating}
                          className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
                        >
                          {t.markInProgress}
                        </button>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => updateTaskStatus(task.id, "COMPLETED")}
                          disabled={isUpdating}
                          className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                        >
                          {t.markComplete}
                        </button>
                      )}
                      {task.status === "COMPLETED" && (
                        <button
                          onClick={() => updateTaskStatus(task.id, "PENDING")}
                          disabled={isUpdating}
                          className="rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                          {t.markPending}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
