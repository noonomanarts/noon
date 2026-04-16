"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MdAdd,
  MdCheckCircle,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdFilterList,
  MdSearch,
  MdRefresh,
} from "react-icons/md";
import {
  HiOutlineCalendar,
  HiOutlineUsers,
  HiOutlineCurrencyDollar,
} from "react-icons/hi2";

type EventBooking = {
  id: string;
  bookingNumber: string;
  eventType: string;
  status: string;
  selectedDate: string | null;
  selectedTime: string | null;
  numberOfParticipants: number | null;
  totalAmount: number | null;
  currency: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  companyOrGroupName: string | null;
  createdAt: string;
  updatedAt: string;
};

const eventTypeLabels: Record<string, { en: string; ar: string }> = {
  COOKING_COMPETITION: { en: "Cooking Competition", ar: "مسابقة الطبخ" },
  PRIVATE_CLASS: { en: "Private Class", ar: "درس خاص" },
  BIRTHDAY_PARTY: { en: "Birthday Party", ar: "حفلة عيد ميلاد" },
};

const statusLabels: Record<string, { en: string; ar: string; color: string }> = {
  NEW: { en: "Awaiting Approval", ar: "بانتظار الاعتماد", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  IN_PROGRESS: { en: "In Progress", ar: "قيد المعالجة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  PENDING_CLIENT_CONFIRMATION: { en: "Pending Client", ar: "بانتظار العميل", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  CLIENT_CONFIRMED: { en: "Confirmed", ar: "مؤكد", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  PENDING_PAYMENT: { en: "Pending Payment", ar: "بانتظار الدفع", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  COMPLETED: { en: "Completed", ar: "مكتمل", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  CANCELLED: { en: "Cancelled", ar: "ملغى", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export default function AdminEventsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const isAr = locale === "ar";

  const [events, setEvents] = useState<EventBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const t = {
    title: isAr ? "إدارة الفعاليات" : "Event Bookings",
    subtitle: isAr ? "إدارة حجوزات الفعاليات والمناسبات" : "Manage event and group bookings",
    search: isAr ? "بحث..." : "Search...",
    allStatuses: isAr ? "جميع الحالات" : "All Statuses",
    allTypes: isAr ? "جميع الأنواع" : "All Types",
    newEvent: isAr ? "فعالية جديدة" : "New Event",
    giftAddons: isAr ? "إضافات الهدايا" : "Gift Add-ons",
    refresh: isAr ? "تحديث" : "Refresh",
    noEvents: isAr ? "لا توجد فعاليات" : "No events found",
    contact: isAr ? "التواصل" : "Contact",
    company: isAr ? "الشركة" : "Company",
    participants: isAr ? "المشاركين" : "Participants",
    amount: isAr ? "المبلغ" : "Amount",
    date: isAr ? "التاريخ" : "Date",
    time: isAr ? "الوقت" : "Time",
    actions: isAr ? "الإجراءات" : "Actions",
    view: isAr ? "عرض" : "View",
    edit: isAr ? "تعديل" : "Edit",
    delete: isAr ? "حذف" : "Delete",
    confirmDelete: isAr ? "هل أنت متأكد من حذف هذه الفعالية؟" : "Are you sure you want to delete this event?",
    notSet: isAr ? "غير محدد" : "Not set",
    approve: isAr ? "اعتماد الوقت" : "Approve time",
  };

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("eventType", typeFilter);
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/admin/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (eventId: string) => {
    if (!confirm(t.confirmDelete)) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          fetchEvents();
        }
      } catch (error) {
        console.error("Failed to delete event:", error);
      }
    });
  };

  const handleApprove = async (eventId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CLIENT_CONFIRMED" }),
        });
        if (response.ok) {
          fetchEvents();
        }
      } catch (error) {
        console.error("Failed to approve event:", error);
      }
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return t.notSet;
    return new Date(date).toLocaleDateString(isAr ? "ar-OM-u-nu-latn" : "en-OM", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {t.title}
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchEvents()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <MdRefresh className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
            {t.refresh}
          </button>
          <button
            onClick={() => router.push(`/${locale}/admin/events/gift-addons`)}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <MdAdd className="h-5 w-5" />
            {t.giftAddons}
          </button>
          <button
            onClick={() => router.push(`/${locale}/admin/events/new`)}
            className="flex items-center gap-2 rounded-xl bg-coral px-4 py-2 font-medium text-white transition-all hover:bg-coral-dark"
          >
            <MdAdd className="h-5 w-5" />
            {t.newEvent}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full rounded-xl border border-zinc-300 bg-transparent py-2 pl-10 pr-4 text-zinc-900 transition-all focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 dark:border-zinc-700 dark:text-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <MdFilterList className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-300 bg-transparent py-2 pl-10 pr-8 text-zinc-900 transition-all focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 dark:border-zinc-700 dark:text-white"
            >
              <option value="all">{t.allStatuses}</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {isAr ? label.ar : label.en}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <HiOutlineCalendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-300 bg-transparent py-2 pl-10 pr-8 text-zinc-900 transition-all focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 dark:border-zinc-700 dark:text-white"
            >
              <option value="all">{t.allTypes}</option>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {isAr ? label.ar : label.en}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-coral border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <HiOutlineCalendar className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <p className="text-lg text-zinc-600 dark:text-zinc-400">{t.noEvents}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.contact}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.date}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.time}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.participants}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.amount}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {events.map((event) => {
                  const typeLabel = eventTypeLabels[event.eventType] || { en: event.eventType, ar: event.eventType };
                  const statusLabel = statusLabels[event.status] || { en: event.status, ar: event.status, color: "bg-zinc-100 text-zinc-800" };

                  return (
                    <tr
                      key={event.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {event.fullName}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {event.email}
                          </p>
                          {event.companyOrGroupName && (
                            <p className="text-xs text-zinc-500">
                              {event.companyOrGroupName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {isAr ? typeLabel.ar : typeLabel.en}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusLabel.color}`}
                        >
                          {isAr ? statusLabel.ar : statusLabel.en}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {formatDate(event.selectedDate)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {event.selectedTime || t.notSet}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <HiOutlineUsers className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {event.numberOfParticipants || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <HiOutlineCurrencyDollar className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {event.totalAmount
                              ? `${event.totalAmount} ${event.currency}`
                              : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              router.push(`/${locale}/admin/events/${event.id}`)
                            }
                            className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                            title={t.view}
                          >
                            <MdVisibility className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/${locale}/admin/events/${event.id}/edit`)
                            }
                            className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                            title={t.edit}
                          >
                            <MdEdit className="h-5 w-5" />
                          </button>
                          {event.status !== "CLIENT_CONFIRMED" && event.status !== "CANCELLED" ? (
                            <button
                              onClick={() => handleApprove(event.id)}
                              className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300"
                              title={t.approve}
                            >
                              <MdCheckCircle className="h-5 w-5" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDelete(event.id)}
                            disabled={isPending}
                            className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            title={t.delete}
                          >
                            <MdDelete className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
