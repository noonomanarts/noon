"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdArrowBack, MdSave } from "react-icons/md";

type EventDetails = {
  id: string;
  bookingNumber: string;
  eventType: string;
  status: string;
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
  paymentMethod: string | null;
  paymentStatus: string | null;
  paymentProof: string | null;
  adminNotes: string | null;
};

const statusOptions = [
  "NEW",
  "IN_PROGRESS",
  "PENDING_CLIENT_CONFIRMATION",
  "CLIENT_CONFIRMED",
  "PENDING_PAYMENT",
  "COMPLETED",
  "CANCELLED",
] as const;

const paymentStatusOptions = ["PENDING", "PAID", "REFUNDED", "FAILED"] as const;
const paymentMethodOptions = ["", "ONLINE", "BANK_TRANSFER", "CASH", "WALLET"] as const;

export default function AdminEditEventPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = use(params);
  const router = useRouter();
  const isAr = locale === "ar";
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    status: "NEW",
    packageType: "",
    numberOfParticipants: "1",
    numberOfGroups: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    companyOrGroupName: "",
    preferredDish: "",
    specialRequests: "",
    totalAmount: "",
    paymentMethod: "",
    paymentStatus: "PENDING",
    paymentProof: "",
    adminNotes: "",
  });

  const t = {
    title: isAr ? "تعديل الحجز" : "Edit Event Booking",
    loading: isAr ? "جاري التحميل..." : "Loading...",
    save: isAr ? "حفظ التعديلات" : "Save Changes",
    saving: isAr ? "جاري الحفظ..." : "Saving...",
    back: isAr ? "رجوع" : "Back",
    details: isAr ? "بيانات الحجز" : "Booking Data",
    status: isAr ? "الحالة" : "Status",
    packageType: isAr ? "المسابقة العادية / المسابقة المتميزة" : "Package Type",
    participants: isAr ? "عدد المشاركين" : "Participants",
    groups: isAr ? "عدد الفرق" : "Groups",
    fullName: isAr ? "الاسم" : "Full Name",
    email: isAr ? "البريد الإلكتروني" : "Email",
    phone: isAr ? "الهاتف" : "Phone",
    company: isAr ? "الشركة/المجموعة" : "Company/Group",
    preferredDish: isAr ? "الطبق المفضل" : "Preferred Dish",
    specialRequests: isAr ? "الطلبات الخاصة" : "Special Requests",
    totalAmount: isAr ? "الإجمالي (OMR)" : "Total Amount (OMR)",
    paymentMethod: isAr ? "طريقة الدفع" : "Payment Method",
    paymentStatus: isAr ? "حالة الدفع" : "Payment Status",
    paymentProof: isAr ? "إثبات الدفع" : "Payment Proof",
    adminNotes: isAr ? "ملاحظات الإدارة" : "Admin Notes",
    required: isAr ? "يرجى تعبئة الحقول المطلوبة" : "Please fill required fields",
    saved: isAr ? "تم حفظ التعديلات" : "Changes saved successfully",
  };

  useEffect(() => {
    let isCancelled = false;
    const fetchEvent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/events/${eventId}`);
        if (!response.ok) {
          throw new Error(isAr ? "تعذر تحميل الحجز" : "Failed to load booking");
        }
        const data = (await response.json()) as EventDetails;
        if (isCancelled) return;

        setForm({
          status: data.status || "NEW",
          packageType: data.packageType || "",
          numberOfParticipants: String(data.numberOfParticipants ?? 1),
          numberOfGroups: data.numberOfGroups === null ? "" : String(data.numberOfGroups),
          fullName: data.fullName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          companyOrGroupName: data.companyOrGroupName || "",
          preferredDish: data.preferredDish || "",
          specialRequests: data.specialRequests || "",
          totalAmount: data.totalAmount === null ? "" : String(data.totalAmount),
          paymentMethod: data.paymentMethod || "",
          paymentStatus: data.paymentStatus || "PENDING",
          paymentProof: data.paymentProof || "",
          adminNotes: data.adminNotes || "",
        });
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.fullName.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
      setError(t.required);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        status: form.status,
        packageType: form.packageType || undefined,
        numberOfParticipants: Number(form.numberOfParticipants),
        numberOfGroups: form.numberOfGroups.trim() ? Number(form.numberOfGroups) : undefined,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        companyOrGroupName: form.companyOrGroupName.trim() || undefined,
        preferredDish: form.preferredDish.trim() || undefined,
        specialRequests: form.specialRequests.trim() || undefined,
        totalAmount: form.totalAmount.trim() ? Number(form.totalAmount) : undefined,
        paymentMethod: form.paymentMethod || undefined,
        paymentStatus: form.paymentStatus,
        adminNotes: form.adminNotes.trim() || undefined,
      };

      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error || (isAr ? "فشل حفظ التعديلات" : "Failed to save changes"));
      }

      router.push(`/${locale}/admin/events/${eventId}?updated=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : isAr ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14 text-zinc-600 dark:text-zinc-400">
        {t.loading}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        <Link
          href={`/${locale}/admin/events/${eventId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <MdArrowBack className="h-4 w-4" />
          {t.back}
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.details}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.status}
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.packageType}
            <input
              value={form.packageType}
              onChange={(e) => setForm((prev) => ({ ...prev, packageType: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.participants}
            <input
              type="number"
              min={1}
              value={form.numberOfParticipants}
              onChange={(e) => setForm((prev) => ({ ...prev, numberOfParticipants: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.groups}
            <input
              type="number"
              min={1}
              value={form.numberOfGroups}
              onChange={(e) => setForm((prev) => ({ ...prev, numberOfGroups: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.fullName}
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.email}
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.phone}
            <input
              required
              value={form.phoneNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.company}
            <input
              value={form.companyOrGroupName}
              onChange={(e) => setForm((prev) => ({ ...prev, companyOrGroupName: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            {t.preferredDish}
            <input
              value={form.preferredDish}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredDish: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            {t.specialRequests}
            <textarea
              value={form.specialRequests}
              onChange={(e) => setForm((prev) => ({ ...prev, specialRequests: e.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.totalAmount}
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.totalAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.paymentMethod}
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            >
              {paymentMethodOptions.map((option) => (
                <option key={option || 'empty'} value={option}>
                  {option || '-'}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.paymentStatus}
            <select
              value={form.paymentStatus}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            >
              {paymentStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {form.paymentProof ? (
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
              <span>{t.paymentProof}</span>
              <div className="mt-1">
                <a href={form.paymentProof} target="_blank" rel="noreferrer" className="font-semibold text-coral hover:underline">
                  {form.paymentProof}
                </a>
              </div>
            </div>
          ) : null}

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            {t.adminNotes}
            <textarea
              value={form.adminNotes}
              onChange={(e) => setForm((prev) => ({ ...prev, adminNotes: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-coral px-4 py-2 font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
        >
          <MdSave className="h-4 w-4" />
          {isSaving ? t.saving : t.save}
        </button>
      </form>
    </div>
  );
}
