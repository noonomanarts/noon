"use client";

import { use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MdArrowBack,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdEvent,
  MdOutlineCalendarToday,
  MdOutlinePerson,
  MdOutlineReceiptLong,
  MdScheduleSend,
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
  gifts: {
    items?: Array<{
      id: string;
      nameEn?: string;
      nameAr?: string;
      unitPrice?: number;
      price?: number;
      scope?: string;
      pricingRule?: string;
      pricingNoteEn?: string;
      pricingNoteAr?: string;
    }>;
    estimatedTotal?: number;
    deferredCount?: number;
  } | null;
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
  NEW: { en: "Awaiting Approval", ar: "بانتظار الاعتماد" },
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
    giftsInfo: isAr ? "إضافات الهدايا" : "Gift Add-ons",
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
    giftScope: isAr ? "النطاق" : "Scope",
    giftUnitPrice: isAr ? "سعر الهدية الواحدة" : "Unit Price",
    giftCalculatedPrice: isAr ? "السعر الحالي" : "Current Price",
    giftDeferred: isAr ? "تسعير لاحق" : "Deferred Pricing",
    giftAllParticipants: isAr ? "لجميع المشاركين" : "For All Participants",
    giftWinningTeam: isAr ? "للفريق الفائز" : "For Winning Team",
    giftEstimatedTotal: isAr ? "إجمالي الهدايا المحتسب" : "Calculated Gift Total",
    yes: isAr ? "نعم" : "Yes",
    no: isAr ? "لا" : "No",
    createdAt: isAr ? "تاريخ الإنشاء" : "Created At",
    updatedAt: isAr ? "آخر تحديث" : "Updated At",
    specialRequests: isAr ? "الطلبات الخاصة" : "Special Requests",
    calendarType: isAr ? "نوع الحدث" : "Event Type",
    start: isAr ? "البداية" : "Start",
    end: isAr ? "النهاية" : "End",
    requestedSlot: isAr ? "الوقت المختار من العميل" : "Customer requested slot",
    reserveNote: isAr
      ? "هذا الوقت محجوز مؤقتاً من التقويم العام ولن يظهر كوقت متاح حتى تعتمدوه أو تُلغوه."
      : "This slot is temporarily held out of public availability until you approve it or cancel the request.",
    approveSlot: isAr ? "تأكيد الوقت في التقويم" : "Approve selected time",
    markReviewing: isAr ? "وضعه قيد المراجعة" : "Mark reviewing",
    slotApproved: isAr ? "الوقت معتمد" : "Time approved",
    slotPending: isAr ? "بانتظار اعتماد الإدارة" : "Awaiting admin approval",
  };

  const localeCode = isAr ? "ar-OM-u-nu-latn" : "en-OM";
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

  const updateStatus = (status: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        const payload = (await response.json().catch(() => ({}))) as EventDetails & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || (isAr ? "تعذر تحديث الحالة" : "Failed to update status"));
        }

        setEvent(payload);
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

      {event.gifts?.items?.length ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.giftsInfo}</h2>
          <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            {event.gifts.items.map((gift) => (
              <div key={`${gift.id}-${gift.scope}`} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {(isAr ? gift.nameAr : gift.nameEn) || gift.nameEn || gift.nameAr || t.notSet}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <p><strong>{t.giftScope}:</strong> {gift.scope === 'WINNING_TEAM' ? t.giftWinningTeam : t.giftAllParticipants}</p>
                  <p><strong>{t.giftUnitPrice}:</strong> {gift.unitPrice !== undefined ? `${gift.unitPrice} ${event.currency || 'OMR'}` : t.notSet}</p>
                  <p><strong>{t.giftCalculatedPrice}:</strong> {gift.price !== undefined ? `${gift.price} ${event.currency || 'OMR'}` : t.notSet}</p>
                  <p><strong>{t.giftDeferred}:</strong> {gift.pricingRule === 'DEFERRED' ? t.yes : t.no}</p>
                </div>
                {gift.pricingRule === 'DEFERRED' && (gift.pricingNoteEn || gift.pricingNoteAr) ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    {isAr ? gift.pricingNoteAr : gift.pricingNoteEn}
                  </p>
                ) : null}
              </div>
            ))}
            <p><strong>{t.giftEstimatedTotal}:</strong> {event.gifts.estimatedTotal !== undefined ? `${event.gifts.estimatedTotal} ${event.currency || 'OMR'}` : t.notSet}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.notes}</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{event.specialRequests || t.notSet}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <MdOutlineCalendarToday className="h-5 w-5" />
          {t.calendarInfo}
        </h2>
        <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.requestedSlot}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                {formatDate(event.selectedDate)} {event.selectedTime ? `• ${event.selectedTime}` : ""}
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.reserveNote}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.status === "CLIENT_CONFIRMED" ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <MdCheckCircle className="h-4 w-4" />
                  {t.slotApproved}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => updateStatus("IN_PROGRESS")}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <MdScheduleSend className="h-4 w-4" />
                    {t.markReviewing}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("CLIENT_CONFIRMED")}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <MdCheckCircle className="h-4 w-4" />
                    {t.approveSlot}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {event.calendarEvent ? (
          <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
            <p><strong>{t.calendarType}:</strong> {event.calendarEvent.type}</p>
            <p><strong>{t.start}:</strong> {formatDateTime(event.calendarEvent.startDateTime)}</p>
            <p><strong>{t.end}:</strong> {formatDateTime(event.calendarEvent.endDateTime)}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.slotPending}</p>
        )}
      </section>
    </div>
  );
}
