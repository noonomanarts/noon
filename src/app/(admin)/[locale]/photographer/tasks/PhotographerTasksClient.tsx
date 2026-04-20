"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  FiCheckSquare,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiCircle,
  FiLoader,
  FiSearch,
  FiX,
  FiCalendar,
  FiUser,
  FiFlag,
  FiChevronDown,
  FiRotateCcw,
} from "react-icons/fi";
import type { PhotographerTaskPublic } from "@/lib/db/photographer";

type Props = {
  locale: "en" | "ar";
  initialTasks: PhotographerTaskPublic[];
  initialTotal: number;
};

type FilterStatus = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";
type PriorityKey = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
type StatusKey = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const priorityConfig: Record<
  PriorityKey,
  { chip: string; accent: string; label: string; labelAr: string; order: number }
> = {
  URGENT: {
    chip: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/25",
    accent: "bg-red-500",
    label: "Urgent",
    labelAr: "عاجل",
    order: 0,
  },
  HIGH: {
    chip: "bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/25",
    accent: "bg-orange-500",
    label: "High",
    labelAr: "مرتفع",
    order: 1,
  },
  MEDIUM: {
    chip: "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
    accent: "bg-blue-500",
    label: "Medium",
    labelAr: "متوسط",
    order: 2,
  },
  LOW: {
    chip: "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:ring-zinc-600",
    accent: "bg-zinc-400 dark:bg-zinc-500",
    label: "Low",
    labelAr: "منخفض",
    order: 3,
  },
};

const statusConfig: Record<
  StatusKey,
  {
    text: string;
    chip: string;
    icon: typeof FiCircle;
    label: string;
    labelAr: string;
  }
> = {
  PENDING: {
    text: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
    icon: FiClock,
    label: "Pending",
    labelAr: "معلقة",
  },
  IN_PROGRESS: {
    text: "text-blue-600 dark:text-blue-400",
    chip: "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
    icon: FiLoader,
    label: "In Progress",
    labelAr: "قيد التنفيذ",
  },
  COMPLETED: {
    text: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
    icon: FiCheckCircle,
    label: "Completed",
    labelAr: "مكتملة",
  },
  CANCELLED: {
    text: "text-zinc-500",
    chip: "bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
    icon: FiCircle,
    label: "Cancelled",
    labelAr: "ملغاة",
  },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function PhotographerTasksClient({ locale, initialTasks, initialTotal }: Props) {
  const isRTL = locale === "ar";
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = window.setTimeout(() => setErrorMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  const t = {
    title: isRTL ? "المهام" : "Tasks",
    subtitle: isRTL ? "جميع المهام المسندة إليك" : "All tasks assigned to you",
    all: isRTL ? "الكل" : "All",
    pending: isRTL ? "معلقة" : "Pending",
    inProgress: isRTL ? "قيد التنفيذ" : "In Progress",
    completed: isRTL ? "مكتملة" : "Completed",
    overdue: isRTL ? "متأخرة" : "Overdue",
    dueToday: isRTL ? "مستحقة اليوم" : "Due today",
    upcoming: isRTL ? "قادمة" : "Upcoming",
    noTasks: isRTL ? "لا توجد مهام لعرضها" : "No tasks to display",
    noTasksHint: isRTL
      ? "حاول تغيير عوامل التصفية أو البحث."
      : "Try adjusting your filter or search.",
    assignedBy: isRTL ? "من قبل" : "Assigned by",
    due: isRTL ? "الموعد النهائي" : "Due",
    completedAt: isRTL ? "أكملت في" : "Completed",
    markInProgress: isRTL ? "بدء العمل" : "Start Working",
    markComplete: isRTL ? "تم الإنجاز" : "Mark Complete",
    markPending: isRTL ? "إرجاع لمعلقة" : "Back to Pending",
    priority: isRTL ? "الأولوية" : "Priority",
    searchPlaceholder: isRTL ? "ابحث في المهام..." : "Search tasks...",
    clearSearch: isRTL ? "مسح" : "Clear",
    showMore: isRTL ? "عرض المزيد" : "Show more",
    showLess: isRTL ? "عرض أقل" : "Show less",
    notes: isRTL ? "ملاحظات" : "Notes",
    updateFailed: isRTL ? "فشل تحديث المهمة. يرجى المحاولة مرة أخرى." : "Failed to update task. Please try again.",
    today: isRTL ? "اليوم" : "Today",
    tomorrow: isRTL ? "غداً" : "Tomorrow",
    daysLeft: (n: number) => (isRTL ? `خلال ${n} أيام` : `in ${n} days`),
    daysAgo: (n: number) => (isRTL ? `منذ ${n} أيام` : `${n} days ago`),
  };

  const counts = useMemo(
    () => ({
      ALL: tasks.length,
      PENDING: tasks.filter((ta) => ta.status === "PENDING").length,
      IN_PROGRESS: tasks.filter((ta) => ta.status === "IN_PROGRESS").length,
      COMPLETED: tasks.filter((ta) => ta.status === "COMPLETED").length,
      OVERDUE: tasks.filter(
        (ta) =>
          ta.dueDate &&
          ta.status !== "COMPLETED" &&
          ta.status !== "CANCELLED" &&
          new Date(ta.dueDate).getTime() < Date.now()
      ).length,
    }),
    [tasks]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byFilter = filter === "ALL" ? tasks : tasks.filter((ta) => ta.status === filter);
    const bySearch = query
      ? byFilter.filter((ta) => {
          const haystack = [
            ta.title,
            ta.titleAr,
            ta.description,
            ta.descriptionAr,
            ta.notes,
            ta.notesAr,
            ta.assignedByName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : byFilter;
    // Sort: non-completed first; overdue first; then by priority; then due date; then newest
    return [...bySearch].sort((a, b) => {
      const aDone = a.status === "COMPLETED" || a.status === "CANCELLED";
      const bDone = b.status === "COMPLETED" || b.status === "CANCELLED";
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aOver =
        !aDone && a.dueDate ? new Date(a.dueDate).getTime() < Date.now() : false;
      const bOver =
        !bDone && b.dueDate ? new Date(b.dueDate).getTime() < Date.now() : false;
      if (aOver !== bOver) return aOver ? -1 : 1;
      const pa = priorityConfig[a.priority as PriorityKey]?.order ?? 99;
      const pb = priorityConfig[b.priority as PriorityKey]?.order ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, filter, search]);

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: StatusKey) => {
      setUpdatingId(taskId);
      // Optimistic update
      const prevTasks = tasks;
      setTasks((curr) =>
        curr.map((ta) =>
          ta.id === taskId
            ? {
                ...ta,
                status: newStatus,
                completedAt:
                  newStatus === "COMPLETED" ? new Date().toISOString() : null,
              }
            : ta
        )
      );
      try {
        const res = await fetch("/api/photographer/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed");
        const { task } = await res.json();
        setTasks((curr) => curr.map((ta) => (ta.id === taskId ? task : ta)));
      } catch {
        setTasks(prevTasks);
        setErrorMessage(t.updateFailed);
      } finally {
        setUpdatingId(null);
      }
    },
    [tasks, t.updateFailed]
  );

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatRelativeDue(iso: string): { label: string; tone: "overdue" | "today" | "soon" | "normal" } {
    const now = new Date();
    const due = new Date(iso);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const diffDays = Math.round((dueDay - startOfToday) / MS_PER_DAY);
    if (diffDays < 0) return { label: t.daysAgo(Math.abs(diffDays)), tone: "overdue" };
    if (diffDays === 0) return { label: t.today, tone: "today" };
    if (diffDays === 1) return { label: t.tomorrow, tone: "soon" };
    if (diffDays <= 7) return { label: t.daysLeft(diffDays), tone: "soon" };
    return { label: formatDate(iso), tone: "normal" };
  }

  const filterButtons: { key: FilterStatus; label: string; count: number }[] = [
    { key: "ALL", label: t.all, count: counts.ALL },
    { key: "PENDING", label: t.pending, count: counts.PENDING },
    { key: "IN_PROGRESS", label: t.inProgress, count: counts.IN_PROGRESS },
    { key: "COMPLETED", label: t.completed, count: counts.COMPLETED },
  ];

  const stats = [
    {
      key: "total",
      label: isRTL ? "إجمالي المهام" : "Total tasks",
      value: initialTotal,
      icon: FiCheckSquare,
      tone: "text-zinc-600 dark:text-zinc-300",
      bg: "bg-zinc-100 dark:bg-zinc-800",
    },
    {
      key: "pending",
      label: t.pending,
      value: counts.PENDING,
      icon: FiClock,
      tone: "text-amber-600 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      key: "inProgress",
      label: t.inProgress,
      value: counts.IN_PROGRESS,
      icon: FiLoader,
      tone: "text-blue-600 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      key: "overdue",
      label: t.overdue,
      value: counts.OVERDUE,
      icon: FiAlertTriangle,
      tone: "text-red-600 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
          {t.title}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4"
            >
              <div className={`flex size-9 items-center justify-center rounded-lg ${s.bg} sm:size-10`}>
                <Icon className={`size-4 sm:size-5 ${s.tone}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:text-xs">
                  {s.label}
                </p>
                <p className="text-lg font-bold leading-tight text-zinc-900 dark:text-white sm:text-xl">
                  {s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls: search + filter chips */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-sm">
          <FiSearch
            className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-zinc-400 ${
              isRTL ? "right-3" : "left-3"
            }`}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full rounded-lg border border-zinc-200 bg-white py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-white/10 ${
              isRTL ? "pr-9 pl-9" : "pl-9 pr-9"
            }`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t.clearSearch}
              className={`absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${
                isRTL ? "left-2" : "right-2"
              }`}
            >
              <FiX className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips — horizontally scrollable on mobile */}
        <div
          role="tablist"
          aria-label={t.title}
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:p-0 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {filterButtons.map((btn) => {
            const active = filter === btn.key;
            return (
              <button
                key={btn.key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(btn.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:focus-visible:ring-white/20 ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                <span>{btn.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active
                      ? "bg-white/15 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                      : "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {btn.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <FiAlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-500/20"
            aria-label="Close"
          >
            <FiX className="size-4" />
          </button>
        </div>
      )}

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <FiCheckSquare className="size-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">{t.noTasks}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.noTasksHint}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((task) => {
            const statusKey = (task.status as StatusKey) in statusConfig ? (task.status as StatusKey) : "PENDING";
            const priorityKey = (task.priority as PriorityKey) in priorityConfig ? (task.priority as PriorityKey) : "MEDIUM";
            const statusConf = statusConfig[statusKey];
            const priorityConf = priorityConfig[priorityKey];
            const StatusIcon = statusConf.icon;
            const isUpdating = updatingId === task.id;
            const isCompleted = statusKey === "COMPLETED";
            const due = task.dueDate ? formatRelativeDue(task.dueDate) : null;
            const dueToneClass =
              due?.tone === "overdue"
                ? "text-red-600 dark:text-red-400"
                : due?.tone === "today"
                ? "text-amber-600 dark:text-amber-400"
                : due?.tone === "soon"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-600 dark:text-zinc-300";
            const title = isRTL && task.titleAr ? task.titleAr : task.title;
            const description =
              isRTL && task.descriptionAr ? task.descriptionAr : task.description;
            const notes = isRTL && task.notesAr ? task.notesAr : task.notes;
            const expanded = expandedIds.has(task.id);
            const descriptionLong = (description?.length ?? 0) > 160;

            return (
              <li
                key={task.id}
                className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-zinc-900 ${
                  due?.tone === "overdue" && !isCompleted
                    ? "border-red-200 dark:border-red-500/40"
                    : "border-zinc-200 dark:border-zinc-800"
                } ${isCompleted ? "opacity-80" : ""}`}
              >
                {/* Priority left accent bar */}
                <span
                  aria-hidden
                  className={`absolute inset-y-0 w-1 ${priorityConf.accent} ${isRTL ? "right-0" : "left-0"}`}
                />

                <div className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5 ${isRTL ? "pr-5" : "pl-5"}`}>
                  {/* Status toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (statusKey === "PENDING") updateTaskStatus(task.id, "IN_PROGRESS");
                      else if (statusKey === "IN_PROGRESS") updateTaskStatus(task.id, "COMPLETED");
                      else if (statusKey === "COMPLETED") updateTaskStatus(task.id, "PENDING");
                    }}
                    disabled={isUpdating}
                    aria-label={
                      statusKey === "PENDING"
                        ? t.markInProgress
                        : statusKey === "IN_PROGRESS"
                        ? t.markComplete
                        : t.markPending
                    }
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:focus-visible:ring-white/20 ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
                        : statusKey === "IN_PROGRESS"
                        ? "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                        : "border-zinc-300 bg-white text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                    } ${isUpdating ? "animate-pulse" : ""}`}
                  >
                    <StatusIcon className={`size-4 ${statusKey === "IN_PROGRESS" && isUpdating ? "animate-spin" : ""}`} />
                  </button>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    {/* Title + chips row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3
                        className={`min-w-0 flex-1 text-sm font-semibold leading-snug sm:text-base ${
                          isCompleted
                            ? "text-zinc-400 line-through dark:text-zinc-500"
                            : "text-zinc-900 dark:text-white"
                        }`}
                      >
                        {title}
                      </h3>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityConf.chip}`}
                        >
                          <FiFlag className="size-3" />
                          {isRTL ? priorityConf.labelAr : priorityConf.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusConf.chip}`}
                        >
                          {isRTL ? statusConf.labelAr : statusConf.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {description && (
                      <div className="mt-1.5">
                        <p
                          className={`whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300 ${
                            !expanded && descriptionLong ? "line-clamp-3" : ""
                          }`}
                        >
                          {description}
                        </p>
                        {descriptionLong && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(task.id)}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                          >
                            {expanded ? t.showLess : t.showMore}
                            <FiChevronDown
                              className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {notes && (expanded || !descriptionLong) && (
                      <div className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50/70 p-2.5 text-xs italic text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                        <span className="font-semibold not-italic text-zinc-700 dark:text-zinc-300">
                          {t.notes}:{" "}
                        </span>
                        {notes}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <FiUser className="size-3.5" />
                        <span>{t.assignedBy}:</span>
                        <strong className="font-semibold text-zinc-700 dark:text-zinc-200">
                          {task.assignedByName}
                        </strong>
                      </span>
                      {task.dueDate && due && (
                        <span className={`inline-flex items-center gap-1.5 font-medium ${dueToneClass}`}>
                          {due.tone === "overdue" ? (
                            <FiAlertTriangle className="size-3.5" />
                          ) : (
                            <FiCalendar className="size-3.5" />
                          )}
                          <span className="text-zinc-500 dark:text-zinc-400">{t.due}:</span>
                          <span>{formatDate(task.dueDate)}</span>
                          <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px]">
                            {due.label}
                          </span>
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <FiCheckCircle className="size-3.5" />
                          <span>{t.completedAt}:</span>
                          <strong className="font-semibold">{formatDate(task.completedAt)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {statusKey === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50"
                        >
                          <FiLoader className="size-3.5" />
                          {t.markInProgress}
                        </button>
                      )}
                      {statusKey === "IN_PROGRESS" && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateTaskStatus(task.id, "COMPLETED")}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50"
                          >
                            <FiCheckCircle className="size-3.5" />
                            {t.markComplete}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTaskStatus(task.id, "PENDING")}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            <FiRotateCcw className="size-3.5" />
                            {t.markPending}
                          </button>
                        </>
                      )}
                      {statusKey === "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => updateTaskStatus(task.id, "PENDING")}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <FiRotateCcw className="size-3.5" />
                          {t.markPending}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
