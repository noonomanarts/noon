"use client";

import Link from "next/link";
import { FiCalendar, FiCheckSquare, FiCamera, FiClock, FiUsers, FiAward } from "react-icons/fi";
import type { PhotographerScheduleItem, PhotographerTaskPublic } from "@/lib/db/photographer";

type Props = {
  locale: "en" | "ar";
  stats: {
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    upcomingClasses: number;
    upcomingEvents: number;
    upcomingMeetings: number;
  };
  upcomingSchedule: PhotographerScheduleItem[];
  recentTasks: PhotographerTaskPublic[];
  userName: string;
};

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

const typeIcons: Record<string, typeof FiCamera> = {
  CLASS: FiCamera,
  EVENT: FiAward,
  MEETING: FiUsers,
};

const typeColors: Record<string, string> = {
  CLASS: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  EVENT: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  MEETING: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

export default function PhotographerDashboardClient({ locale, stats, upcomingSchedule, recentTasks, userName }: Props) {
  const isRTL = locale === "ar";

  const t = {
    welcome: isRTL ? `مرحباً، ${userName}` : `Welcome, ${userName}`,
    subtitle: isRTL ? "إليك نظرة عامة على جدولك ومهامك" : "Here's an overview of your schedule and tasks",
    upcomingClasses: isRTL ? "ورش قادمة" : "Upcoming Classes",
    upcomingEvents: isRTL ? "فعاليات قادمة" : "Upcoming Events",
    upcomingMeetings: isRTL ? "اجتماعات قادمة" : "Upcoming Meetings",
    pendingTasks: isRTL ? "مهام معلقة" : "Pending Tasks",
    completedTasks: isRTL ? "مهام مكتملة" : "Completed Tasks",
    totalTasks: isRTL ? "إجمالي المهام" : "Total Tasks",
    thisWeek: isRTL ? "هذا الأسبوع" : "This Week",
    recentTasks: isRTL ? "المهام الأخيرة" : "Recent Tasks",
    viewAll: isRTL ? "عرض الكل" : "View All",
    viewSchedule: isRTL ? "عرض الجدول" : "View Schedule",
    viewTasks: isRTL ? "عرض المهام" : "View Tasks",
    noUpcoming: isRTL ? "لا توجد أحداث قادمة هذا الأسبوع" : "No upcoming events this week",
    noTasks: isRTL ? "لا توجد مهام" : "No tasks",
    today: isRTL ? "اليوم" : "Today",
    CLASS: isRTL ? "دورة" : "Class",
    EVENT: isRTL ? "فعالية" : "Event",
    MEETING: isRTL ? "اجتماع" : "Meeting",
    dueDateLabel: isRTL ? "الموعد النهائي" : "Due",
  };

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(isRTL ? "ar-SA" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: 'Asia/Muscat' });
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: 'Asia/Muscat' });
  }

  const statCards = [
    { label: t.upcomingClasses, value: stats.upcomingClasses, icon: FiCamera, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/30" },
    { label: t.upcomingEvents, value: stats.upcomingEvents, icon: FiAward, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
    { label: t.upcomingMeetings, value: stats.upcomingMeetings, icon: FiUsers, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
    { label: t.pendingTasks, value: stats.pendingTasks, icon: FiCheckSquare, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.welcome}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 ${card.bg}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-lg bg-white/80 dark:bg-zinc-800/80 ${card.color}`}>
                <card.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Schedule */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <FiCalendar className="size-5 text-sky-600 dark:text-sky-400" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.thisWeek}</h2>
            </div>
            <Link
              href={`/${locale}/photographer/schedule`}
              className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              {t.viewSchedule}
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {upcomingSchedule.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-zinc-400">{t.noUpcoming}</div>
            ) : (
              upcomingSchedule.slice(0, 5).map((item) => {
                const Icon = typeIcons[item.type] ?? FiClock;
                return (
                  <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 px-5 py-3">
                    <div className={`mt-0.5 flex size-8 items-center justify-center rounded-lg ${typeColors[item.type]}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {isRTL && item.titleAr ? item.titleAr : item.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${typeColors[item.type]}`}>
                          {t[item.type as keyof typeof t] ?? item.type}
                        </span>
                        <span>{formatDate(item.startDateTime)}</span>
                        <span>{formatTime(item.startDateTime)}</span>
                      </div>
                      {item.trainerName && (
                        <p className="mt-0.5 text-xs text-zinc-400">{item.trainerName}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <FiCheckSquare className="size-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.recentTasks}</h2>
            </div>
            <Link
              href={`/${locale}/photographer/tasks`}
              className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              {t.viewTasks}
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentTasks.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-zinc-400">{t.noTasks}</div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`mt-0.5 flex size-8 items-center justify-center rounded-lg ${statusColors[task.status]}`}>
                    <FiCheckSquare className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {isRTL && task.titleAr ? task.titleAr : task.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusColors[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </span>
                      {task.dueDate && (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          {t.dueDateLabel}: {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
