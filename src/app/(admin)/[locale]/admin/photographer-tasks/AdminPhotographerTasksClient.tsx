"use client";

import { useState, useMemo, useCallback } from "react";
import {
  FiPlus,
  FiCheckSquare,
  FiClock,
  FiCheckCircle,
  FiCircle,
  FiFilter,
  FiLoader,
  FiTrash2,
  FiEdit2,
  FiX,
  FiAlertTriangle,
  FiCamera,
} from "react-icons/fi";
import type { PhotographerDashboardUser, PhotographerTaskPublic } from "@/lib/db/photographer";
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

type Props = {
  locale: "en" | "ar";
  dashboardUsers: PhotographerDashboardUser[];
  initialTasks: PhotographerTaskPublic[];
  initialTotal: number;
};

type FilterStatus = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const priorityOptions = [
  { value: "LOW", label: "Low", labelAr: "منخفض", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  { value: "MEDIUM", label: "Medium", labelAr: "متوسط", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "HIGH", label: "High", labelAr: "مرتفع", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "URGENT", label: "Urgent", labelAr: "عاجل", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

const statusConfig: Record<string, { bg: string; icon: typeof FiCircle; label: string; labelAr: string }> = {
  PENDING: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: FiClock, label: "Pending", labelAr: "معلقة" },
  IN_PROGRESS: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: FiLoader, label: "In Progress", labelAr: "قيد التنفيذ" },
  COMPLETED: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: FiCheckCircle, label: "Completed", labelAr: "مكتملة" },
  CANCELLED: { bg: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500", icon: FiCircle, label: "Cancelled", labelAr: "ملغاة" },
};

export default function AdminPhotographerTasksClient({
  locale,
  dashboardUsers,
  initialTasks,
}: Props) {
  const isRTL = locale === "ar";
  const { confirm } = useAppFeedback();
  const photographerExists = dashboardUsers.length > 0;
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PhotographerTaskPublic | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(dashboardUsers[0]?.id ?? "");
  const [formTitle, setFormTitle] = useState("");
  const [formTitleAr, setFormTitleAr] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionAr, setFormDescriptionAr] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formNotesAr, setFormNotesAr] = useState("");

  const t = {
    title: isRTL ? "مهام المصور" : "Photographer Tasks",
    subtitle: isRTL ? "إدارة المهام المخصصة لفريق التصوير" : "Manage tasks assigned to the photographer dashboard",
    noPhotographer: isRTL
      ? 'لا يوجد مستخدم نشط بدور مصور أو مدير سوشيال ميديا. أنشئ مستخدمًا بدور Photographer أو Social Media Admin أولاً.'
      : 'No active photographer dashboard user found. Create a user with the PHOTOGRAPHER or SOCIAL_MEDIA_ADMIN role first.',
    addTask: isRTL ? "إضافة مهمة" : "Add Task",
    editTask: isRTL ? "تعديل مهمة" : "Edit Task",
    assigneeLabel: isRTL ? "تعيين إلى" : "Assign To",
    assigneeColumn: isRTL ? "المكلّف" : "Assigned To",
    all: isRTL ? "الكل" : "All",
    pending: isRTL ? "معلقة" : "Pending",
    inProgress: isRTL ? "قيد التنفيذ" : "In Progress",
    completed: isRTL ? "مكتملة" : "Completed",
    cancelled: isRTL ? "ملغاة" : "Cancelled",
    noTasks: isRTL ? "لا توجد مهام بعد" : "No tasks yet",
    titleLabel: isRTL ? "العنوان (إنجليزي)" : "Title (English)",
    titleArLabel: isRTL ? "العنوان (عربي)" : "Title (Arabic)",
    descriptionLabel: isRTL ? "الوصف (إنجليزي)" : "Description (English)",
    descriptionArLabel: isRTL ? "الوصف (عربي)" : "Description (Arabic)",
    priorityLabel: isRTL ? "الأولوية" : "Priority",
    dueDateLabel: isRTL ? "الموعد النهائي" : "Due Date",
    notesLabel: isRTL ? "ملاحظات (إنجليزي)" : "Notes (English)",
    notesArLabel: isRTL ? "ملاحظات (عربي)" : "Notes (Arabic)",
    save: isRTL ? "حفظ" : "Save",
    cancel: isRTL ? "إلغاء" : "Cancel",
    delete: isRTL ? "حذف" : "Delete",
    confirmDelete: isRTL ? "هل أنت متأكد من حذف هذه المهمة؟" : "Are you sure you want to delete this task?",
    required: isRTL ? "مطلوب" : "Required",
    assignedBy: isRTL ? "من قبل" : "Assigned by",
    due: isRTL ? "الموعد النهائي" : "Due",
    completedAtLabel: isRTL ? "أكملت" : "Completed",
    overdue: isRTL ? "متأخرة" : "Overdue",
    statusLabel: isRTL ? "الحالة" : "Status",
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
    CANCELLED: tasks.filter((t) => t.status === "CANCELLED").length,
  }), [tasks]);

  const resetForm = useCallback(() => {
    setSelectedAssigneeId(dashboardUsers[0]?.id ?? "");
    setFormTitle("");
    setFormTitleAr("");
    setFormDescription("");
    setFormDescriptionAr("");
    setFormPriority("MEDIUM");
    setFormDueDate("");
    setFormNotes("");
    setFormNotesAr("");
    setEditingTask(null);
    setShowForm(false);
  }, [dashboardUsers]);

  function openEditForm(task: PhotographerTaskPublic) {
    setSelectedAssigneeId(task.photographerUserId);
    setFormTitle(task.title);
    setFormTitleAr(task.titleAr ?? "");
    setFormDescription(task.description ?? "");
    setFormDescriptionAr(task.descriptionAr ?? "");
    setFormPriority(task.priority);
    setFormDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setFormNotes(task.notes ?? "");
    setFormNotesAr(task.notesAr ?? "");
    setEditingTask(task);
    setShowForm(true);
  }

  const handleSave = useCallback(async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (editingTask) {
        // Update
        const res = await fetch("/api/admin/photographer-tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: editingTask.id,
            photographerUserId: selectedAssigneeId || undefined,
            title: formTitle.trim(),
            titleAr: formTitleAr.trim() || null,
            description: formDescription.trim() || null,
            descriptionAr: formDescriptionAr.trim() || null,
            priority: formPriority,
            dueDate: formDueDate || null,
            notes: formNotes.trim() || null,
            notesAr: formNotesAr.trim() || null,
          }),
        });
        if (res.ok) {
          const { task } = await res.json();
          setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? task : t)));
          resetForm();
        }
      } else {
        // Create
        const res = await fetch("/api/admin/photographer-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            photographerUserId: selectedAssigneeId || undefined,
            titleAr: formTitleAr.trim() || undefined,
            description: formDescription.trim() || undefined,
            descriptionAr: formDescriptionAr.trim() || undefined,
            priority: formPriority,
            dueDate: formDueDate || undefined,
            notes: formNotes.trim() || undefined,
            notesAr: formNotesAr.trim() || undefined,
          }),
        });
        if (res.ok) {
          const { task } = await res.json();
          setTasks((prev) => [task, ...prev]);
          resetForm();
        }
      }
    } finally {
      setSaving(false);
    }
  }, [editingTask, formDescription, formDescriptionAr, formDueDate, formNotes, formNotesAr, formPriority, formTitle, formTitleAr, resetForm, selectedAssigneeId]);

  const handleDelete = useCallback(async (taskId: string) => {
    const confirmed = await confirm({
      title: isRTL ? 'تأكيد حذف المهمة' : 'Delete task',
      message: t.confirmDelete,
      confirmLabel: isRTL ? 'حذف' : 'Delete',
      cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    setDeletingId(taskId);
    try {
      const res = await fetch(`/api/admin/photographer-tasks?taskId=${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } finally {
      setDeletingId(null);
    }
  }, [confirm, isRTL, t.confirmDelete]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/photographer-tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
      }
    } catch { /* ignore */ }
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

  if (!photographerExists) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900" dir={isRTL ? "rtl" : "ltr"}>
        <FiCamera className="size-12 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-4 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">{t.noPhotographer}</p>
      </div>
    );
  }

  const filterButtons: { key: FilterStatus; label: string }[] = [
    { key: "ALL", label: `${t.all} (${counts.ALL})` },
    { key: "PENDING", label: `${t.pending} (${counts.PENDING})` },
    { key: "IN_PROGRESS", label: `${t.inProgress} (${counts.IN_PROGRESS})` },
    { key: "COMPLETED", label: `${t.completed} (${counts.COMPLETED})` },
    { key: "CANCELLED", label: `${t.cancelled} (${counts.CANCELLED})` },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <FiPlus className="size-4" />
          {t.addTask}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800 w-fit">
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

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {editingTask ? t.editTask : t.addTask}
              </h2>
              <button onClick={resetForm} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <FiX className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t.assigneeLabel}
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {dashboardUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.role === "PHOTOGRAPHER" ? "Photographer" : "Social Media Admin"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t.titleLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  dir="ltr"
                />
              </div>

              {/* Title Arabic */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t.titleArLabel}
                </label>
                <input
                  type="text"
                  value={formTitleAr}
                  onChange={(e) => setFormTitleAr(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  dir="rtl"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t.descriptionLabel}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  dir="ltr"
                />
              </div>

              {/* Description Arabic */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t.descriptionArLabel}
                </label>
                <textarea
                  value={formDescriptionAr}
                  onChange={(e) => setFormDescriptionAr(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t.priorityLabel}
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {isRTL ? opt.labelAr : opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {t.dueDateLabel}
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t.notesLabel}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {t.notesArLabel}
                </label>
                <textarea
                  value={formNotesAr}
                  onChange={(e) => setFormNotesAr(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  dir="rtl"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formTitle.trim()}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "..." : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <FiCheckSquare className="size-12 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">{t.noTasks}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.titleLabel.split(" (")[0]}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.priorityLabel}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.statusLabel}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.assigneeColumn}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.dueDateLabel}
                </th>
                <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                const priorityConf = priorityOptions.find((p) => p.value === task.priority)!;
                const statusConf = statusConfig[task.status];

                return (
                  <tr key={task.id} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${task.status === "COMPLETED" ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className={`font-medium text-zinc-900 dark:text-white truncate ${task.status === "COMPLETED" ? "line-through" : ""}`}>
                          {task.title}
                        </p>
                        {task.titleAr && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate" dir="rtl">{task.titleAr}</p>
                        )}
                        {task.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityConf.color}`}>
                        {isRTL ? priorityConf.labelAr : priorityConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold border-0 cursor-pointer ${statusConf.bg}`}
                      >
                        <option value="PENDING">{isRTL ? "معلقة" : "Pending"}</option>
                        <option value="IN_PROGRESS">{isRTL ? "قيد التنفيذ" : "In Progress"}</option>
                        <option value="COMPLETED">{isRTL ? "مكتملة" : "Completed"}</option>
                        <option value="CANCELLED">{isRTL ? "ملغاة" : "Cancelled"}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">{task.photographerName}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {task.dueDate ? (
                        <span className={overdue ? "text-red-600 dark:text-red-400 font-semibold text-xs" : "text-xs text-zinc-500 dark:text-zinc-400"}>
                          {overdue && <FiAlertTriangle className="inline size-3 mr-0.5" />}
                          {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditForm(task)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        >
                          <FiEdit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          disabled={deletingId === task.id}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        >
                          <FiTrash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
