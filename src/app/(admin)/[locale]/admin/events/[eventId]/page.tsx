"use client";

import { use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MdArrowBack,
  MdDelete,
  MdEdit,
  MdEvent,
  MdOutlineCalendarToday,
  MdOutlinePerson,
  MdOutlineReceiptLong,
} from "react-icons/md";

type EventDetails = {
  id: string;
  bookingNumber: string;
  eventType: string;
  status: string;
  selectedDate: string | null;
  selectedTime: string | null;
  packageType: string | null;
  numberOfParticipants: number | null;
  numberOfGroups: number | null;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  companyOrGroupName: string | null;
  preferredDish: string | null;
  specialRequests: string | null;
  totalAmount: number | null;
  currency: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
  calendarEvent?: {
    id: string;
    type: string;
    startDateTime: string;
    endDateTime: string;
  } | null;
};

const eventTypeLabels: Record<string, { en: string; ar: string }> = {
  COOKING_COMPETITION: { en: "Cooking Competition", ar: "مسابقة الطبخ" },
  PRIVATE_CLASS: { en: "Private Class", ar: "درس خاص" },
  BIRTHDAY_PARTY: { en: "Birthday Party", ar: "حفلة عيد ميلاد" },
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  NEW: { en: "New", ar: "جديد" },
  IN_PROGRESS: { en: "In Progress", ar: "قيد المعالجة" },
  PENDING_CLIENT_CONFIRMATION: { en: "Pending Client", ar: "بانتظار العميل" },
  CLIENT_CONFIRMED: { en: "Confirmed", ar: "مؤكد" },
  PENDING_PAYMENT: { en: "Pending Payment", ar: "بانتظار الدفع" },
  COMPLETED: { en: "Completed", ar: "مكتمل" },
  CANCELLED: { en: "Cancelled", ar: "ملغى" },
};

export default function AdminEventDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = use(params);
  const router = useRouter();
  const isAr = locale === "ar";
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const t = {
    title: isAr ? "تفاصيل الحجز" : "Event Booking Details",
    loading: isAr ? "جاري التحميل..." : "Loading...",
    back: isAr ? "العودة للقائمة" : "Back to list",
    edit: isAr ? "تعديل" : "Edit",
    delete: isAr ? "حذف" : "Delete",
    confirmDelete: isAr ? "هل تريد حذف هذا الحجز؟" : "Delete this booking?",
    eventInfo: isAr ? "معلومات الفعالية" : "Event Information",
    contactInfo: isAr ? "بيانات التواصل" : "Contact Information",
    paymentInfo: isAr ? "بيانات الدفع" : "Payment Information",
    calendarInfo: isAr ? "جدولة التقويم" : "Calendar Scheduling",
    notes: isAr ? "الملاحظات" : "Notes",
    notSet: isAr ? "غير محدد" : "Not set",
    bookingNumber: isAr ? "رقم الحجز" : "Booking Number",
    type: isAr ? "النوع" : "Type",
    status: isAr ? "الحالة" : "Status",
    date: isAr ? "التاريخ" : "Date",
    time: isAr ? "الوقت" : "Time",
    package: isAr ? "الباقة" : "Package",
    participants: isAr ? "المشاركون" : "Participants",
    groups: isAr ? "المجموعات" : "Groups",
    fullName: isAr ? "الاسم" : "Full Name",
    email: isAr ? "البريد الإلكتروني" : "Email",
    phone: isAr ? "الهاتف" : "Phone",
    company: isAr ? "الشركة/المجموعة" : "Company/Group",
    dish: isAr ? "الطبق المفضل" : "Preferred Dish",
    total: isAr ? "الإجمالي" : "Total",
    paymentStatus: isAr ? "حالة الدفع" : "Payment Status",
    paymentMethod: isAr ? "طريقة الدفع" : "Payment Method",
    createdAt: isAr ? "تاريخ الإنشاء" : "Created At",
    updatedAt: isAr ? "آخر تحديث" : "Updated At",
    specialRequests: isAr ? "الطلبات الخاصة" : "Special Requests",
    calendarType: isAr ? "نوع الحدث" : "Event Type",
    start: isAr ? "البداية" : "Start",
    end: isAr ? "النهاية" : "End",
  };

  const localeCode = isAr ? "ar-OM" : "en-OM";
  const formatDate = useMemo(
    () => (value: string | null) =>
      value
        ? new Date(value).toLocaleDateString(localeCode, { year: "numeric", month: "short", day: "numeric" })
        : t.notSet,
    [localeCode, t.notSet]
  );
  const formatDateTime = useMemo(
    () => (value: string | null) =>
      value
        ? new Date(value).toLocaleString(localeCode, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : t.notSet,
    [localeCode, t.notSet]
  );

  useEffect(() => {
    let isCancelled = false;
    const fetchEvent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/events/${eventId}`);
        if (!response.ok) {
          throw new Error(isAr ? "تعذر تحميل بيانات الحجز" : "Failed to load event booking");
        }
        const payload = (await response.json()) as EventDetails;
        if (!isCancelled) setEvent(payload);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : isAr ? "حدث خطأ غير متوقع" : "Unexpected error");
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchEvent();
    return () => {
      isCancelled = true;
    };
  }, [eventId, isAr]);

  const handleDelete = () => {
    if (!confirm(t.confirmDelete)) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(isAr ? "تعذر حذف الحجز" : "Failed to delete event booking");
        }
        router.push(`/${locale}/admin/events`);
      } catch (err) {
        setError(err instanceof Error ? err.message : isAr ? "حدث خطأ غير متوقع" : "Unexpected error");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14 text-zinc-600 dark:text-zinc-400">
        {t.loading}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {error || (isAr ? "الحجز غير موجود" : "Event booking was not found")}
        </p>
        <Link href={`/${locale}/admin/events`} className="inline-flex items-center gap-2 text-sm font-semibold text-coral hover:underline">
          <MdArrowBack className="h-4 w-4" />
          {t.back}
        </Link>
      </div>
    );
  }

  const typeLabel = eventTypeLabels[event.eventType] || { en: event.eventType, ar: event.eventType };
  const statusLabel = statusLabels[event.status] || { en: event.status, ar: event.status };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.bookingNumber}: {event.bookingNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/events`}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <MdArrowBack className="h-4 w-4" />
            {t.back}
          </Link>
          <Link
            href={`/${locale}/admin/events/${event.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-coral px-3 py-2 text-sm font-semibold text-white hover:bg-coral-dark"
          >
            <MdEdit className="h-4 w-4" />
            {t.edit}
          </Link>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            <MdDelete className="h-4 w-4" />
            {t.delete}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <MdEvent className="h-5 w-5" />
          {t.eventInfo}
        </h2>
        <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
          <p><strong>{t.type}:</strong> {isAr ? typeLabel.ar : typeLabel.en}</p>
          <p><strong>{t.status}:</strong> {isAr ? statusLabel.ar : statusLabel.en}</p>
          <p><strong>{t.date}:</strong> {formatDate(event.selectedDate)}</p>
          <p><strong>{t.time}:</strong> {event.selectedTime || t.notSet}</p>
          <p><strong>{t.package}:</strong> {event.packageType || t.notSet}</p>
          <p><strong>{t.participants}:</strong> {event.numberOfParticipants ?? t.notSet}</p>
          <p><strong>{t.groups}:</strong> {event.numberOfGroups ?? t.notSet}</p>
          <p><strong>{t.dish}:</strong> {event.preferredDish || t.notSet}</p>
          <p><strong>{t.createdAt}:</strong> {formatDateTime(event.createdAt)}</p>
          <p><strong>{t.updatedAt}:</strong> {formatDateTime(event.updatedAt)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <MdOutlinePerson className="h-5 w-5" />
          {t.contactInfo}
        </h2>
        <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
          <p><strong>{t.fullName}:</strong> {event.fullName}</p>
          <p><strong>{t.email}:</strong> {event.email}</p>
          <p><strong>{t.phone}:</strong> {event.phoneNumber || t.notSet}</p>
          <p><strong>{t.company}:</strong> {event.companyOrGroupName || t.notSet}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <MdOutlineReceiptLong className="h-5 w-5" />
          {t.paymentInfo}
        </h2>
        <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
          <p>
            <strong>{t.total}:</strong>{" "}
            {event.totalAmount !== null ? `${event.totalAmount} ${event.currency || "OMR"}` : t.notSet}
          </p>
          <p><strong>{t.paymentStatus}:</strong> {event.paymentStatus || t.notSet}</p>
          <p><strong>{t.paymentMethod}:</strong> {event.paymentMethod || t.notSet}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.notes}</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{event.specialRequests || t.notSet}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <MdOutlineCalendarToday className="h-5 w-5" />
          {t.calendarInfo}
        </h2>
        {event.calendarEvent ? (
          <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
            <p><strong>{t.calendarType}:</strong> {event.calendarEvent.type}</p>
            <p><strong>{t.start}:</strong> {formatDateTime(event.calendarEvent.startDateTime)}</p>
            <p><strong>{t.end}:</strong> {formatDateTime(event.calendarEvent.endDateTime)}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.notSet}</p>
        )}
      </section>
    </div>
  );
}
