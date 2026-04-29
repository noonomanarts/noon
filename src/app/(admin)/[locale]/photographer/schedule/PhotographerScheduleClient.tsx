"use client";

import { useState, useMemo } from "react";
import { FiCalendar, FiCamera, FiAward, FiUsers, FiClock, FiFilter } from "react-icons/fi";
import type { PhotographerScheduleItem } from "@/lib/db/photographer";

type Props = {
  locale: "en" | "ar";
  schedule: PhotographerScheduleItem[];
};

type FilterType = "ALL" | "CLASS" | "EVENT" | "MEETING";

const typeColors: Record<string, { bg: string; border: string; dot: string; badge: string }> = {
  CLASS: {
    bg: "bg-sky-50 dark:bg-sky-950/20",
    border: "border-sky-200 dark:border-sky-800",
    dot: "bg-sky-500",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  },
  EVENT: {
    bg: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  },
  MEETING: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-200 dark:border-violet-800",
    dot: "bg-violet-500",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  },
};

const typeIcons: Record<string, typeof FiCamera> = {
  CLASS: FiCamera,
  EVENT: FiAward,
  MEETING: FiUsers,
};

export default function PhotographerScheduleClient({ locale, schedule }: Props) {
  const isRTL = locale === "ar";
  const [filter, setFilter] = useState<FilterType>("ALL");

  const t = {
    title: isRTL ? "الجدول الزمني" : "Schedule",
    all: isRTL ? "الكل" : "All",
    classes: isRTL ? "الورش" : "Classes",
    events: isRTL ? "الفعاليات" : "Events",
    meetings: isRTL ? "الاجتماعات" : "Meetings",
    noItems: isRTL ? "لا توجد أحداث مجدولة" : "No scheduled events",
    today: isRTL ? "اليوم" : "Today",
    tomorrow: isRTL ? "غداً" : "Tomorrow",
    trainer: isRTL ? "المدرب" : "Trainer",
    company: isRTL ? "الشركة" : "Company",
    participants: isRTL ? "المشاركون" : "Participants",
    contact: isRTL ? "جهة الاتصال" : "Contact",
    booked: isRTL ? "محجوز" : "Booked",
    CLASS: isRTL ? "دورة" : "Class",
    EVENT: isRTL ? "فعالية" : "Event",
    MEETING: isRTL ? "اجتماع" : "Meeting",
    COOKING_COMPETITION: isRTL ? "مسابقة طبخ" : "Cooking Competition",
    PRIVATE_CLASS: isRTL ? "درس خاص" : "Private Class",
    BIRTHDAY_PARTY: isRTL ? "حفلة عيد ميلاد" : "Birthday Party",
  };

  const filtered = useMemo(
    () => (filter === "ALL" ? schedule : schedule.filter((s) => s.type === filter)),
    [schedule, filter]
  );

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, PhotographerScheduleItem[]> = {};
    for (const item of filtered) {
      const dateKey = new Date(item.startDateTime).toISOString().split("T")[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function formatDateHeading(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.getTime() === today.getTime()) return t.today;
    if (d.getTime() === tomorrow.getTime()) return t.tomorrow;

    return d.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isRTL ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDuration(start: string, end: string) {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  }

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: "ALL", label: t.all, count: schedule.length },
    { key: "CLASS", label: t.classes, count: schedule.filter((s) => s.type === "CLASS").length },
    { key: "EVENT", label: t.events, count: schedule.filter((s) => s.type === "EVENT").length },
    { key: "MEETING", label: t.meetings, count: schedule.filter((s) => s.type === "MEETING").length },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
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
              {btn.count > 0 && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold dark:bg-zinc-600">
                  {btn.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule List */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <FiCalendar className="size-12 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">{t.noItems}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateKey, items]) => (
            <div key={dateKey}>
              {/* Date heading */}
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {formatDateHeading(dateKey)}
                </span>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const colors = typeColors[item.type];
                  const Icon = typeIcons[item.type] ?? FiClock;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={`rounded-xl border p-4 ${colors.bg} ${colors.border} transition-shadow hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Time Column */}
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">
                            {formatTime(item.startDateTime)}
                          </span>
                          <div className={`h-6 w-0.5 rounded-full ${colors.dot}`} />
                          <span className="text-xs text-zinc-400">
                            {formatDuration(item.startDateTime, item.endDateTime)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                {isRTL && item.titleAr ? item.titleAr : item.title}
                              </h3>
                              {item.description && (
                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${colors.badge}`}>
                                <Icon className="size-3" />
                                {t[item.type as keyof typeof t] ?? item.type}
                              </span>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {item.trainerName && (
                              <span>{t.trainer}: <strong>{item.trainerName}</strong></span>
                            )}
                            {item.category && (
                              <span className="capitalize">{item.category.replace("_", " ").toLowerCase()}</span>
                            )}
                            {item.seatsBooked !== null && (
                              <span>{t.booked}: <strong>{item.seatsBooked}</strong></span>
                            )}
                            {item.eventType && (
                              <span>{t[item.eventType as keyof typeof t] ?? item.eventType}</span>
                            )}
                            {item.companyName && (
                              <span>{t.company}: <strong>{item.companyName}</strong></span>
                            )}
                            {item.participants !== null && item.participants !== undefined && (
                              <span>{t.participants}: <strong>{item.participants}</strong></span>
                            )}
                            {item.contactName && (
                              <span>{t.contact}: <strong>{item.contactName}</strong></span>
                            )}
                            {item.contactPhone && (
                              <span dir="ltr">{item.contactPhone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
