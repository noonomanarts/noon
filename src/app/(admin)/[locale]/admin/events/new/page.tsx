"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MdArrowBack, MdSave } from "react-icons/md";

const EVENT_TYPES = ["COOKING_COMPETITION", "PRIVATE_CLASS", "BIRTHDAY_PARTY"] as const;

export default function AdminNewEventPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const router = useRouter();
  const isAr = locale === "ar";

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    userId: "",
    eventType: "COOKING_COMPETITION",
    selectedDate: "",
    selectedTime: "",
    packageType: "STANDARD",
    numberOfParticipants: "8",
    numberOfGroups: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    companyOrGroupName: "",
    preferredDish: "",
    specialRequests: "",
    totalAmount: "",
  });

  const t = {
    title: isAr ? "إضافة حجز فعالية" : "Create Event Booking",
    back: isAr ? "رجوع" : "Back",
    save: isAr ? "إنشاء الحجز" : "Create Booking",
    saving: isAr ? "جاري الإنشاء..." : "Creating...",
    required: isAr ? "يرجى تعبئة الحقول المطلوبة" : "Please fill required fields",
    userId: isAr ? "معرف المستخدم الحالي (اختياري)" : "Existing User ID (optional)",
    eventType: isAr ? "نوع الفعالية" : "Event Type",
    selectedDate: isAr ? "التاريخ" : "Date",
    selectedTime: isAr ? "الوقت (HH:MM)" : "Time (HH:MM)",
    packageType: isAr ? "المسابقة العادية / المسابقة المتميزة" : "Package Type (competition only)",
    participants: isAr ? "عدد المشاركين" : "Participants",
    groups: isAr ? "عدد الفرق (اختياري)" : "Number of Groups (optional)",
    fullName: isAr ? "الاسم" : "Full Name",
    email: isAr ? "البريد الإلكتروني" : "Email",
    phone: isAr ? "الهاتف" : "Phone",
    company: isAr ? "الشركة/المجموعة" : "Company/Group",
    dish: isAr ? "الطبق المفضل (للخاص)" : "Preferred Dish (private class)",
    specialRequests: isAr ? "طلبات خاصة" : "Special Requests",
    totalAmount: isAr ? "الإجمالي (اختياري)" : "Total Amount (optional)",
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (
      !form.selectedDate ||
      !form.selectedTime ||
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phoneNumber.trim() ||
      !form.numberOfParticipants.trim()
    ) {
      setError(t.required);
      return;
    }

    setIsSaving(true);
    try {
      const participants = Number(form.numberOfParticipants);
      const autoGroups =
        form.eventType === "COOKING_COMPETITION"
          ? Math.max(2, Math.min(8, Math.ceil(participants / 5)))
          : form.eventType === "PRIVATE_CLASS"
            ? Math.max(1, Math.ceil(participants / 2))
            : undefined;

      const payload = {
        userId: form.userId.trim() || undefined,
        eventType: form.eventType,
        selectedDate: form.selectedDate,
        selectedTime: form.selectedTime,
        packageType: form.eventType === "COOKING_COMPETITION" ? form.packageType : undefined,
        numberOfParticipants: participants,
        numberOfGroups: form.numberOfGroups.trim() ? Number(form.numberOfGroups) : autoGroups,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        companyOrGroupName: form.companyOrGroupName.trim() || undefined,
        preferredDish: form.eventType === "PRIVATE_CLASS" ? form.preferredDish.trim() || undefined : undefined,
        specialRequests: form.specialRequests.trim() || undefined,
        totalAmount: form.totalAmount.trim() ? Number(form.totalAmount) : undefined,
      };

      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error || (isAr ? "فشل إنشاء الحجز" : "Failed to create booking"));
      }

      const result = (await response.json()) as { id?: string };
      if (result.id) {
        router.push(`/${locale}/admin/events/${result.id}`);
      } else {
        router.push(`/${locale}/admin/events`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : isAr ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        <Link
          href={`/${locale}/admin/events`}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            {t.userId}
            <input
              value={form.userId}
              onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
              placeholder={isAr ? "اربط الحجز بحساب موجود فقط إذا لزم" : "Only fill this if you want to link an existing account"}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.eventType}
            <select
              value={form.eventType}
              onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            >
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.packageType}
            <select
              value={form.packageType}
              onChange={(e) => setForm((prev) => ({ ...prev, packageType: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            >
              <option value="STANDARD">STANDARD</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.selectedDate}
            <input
              required
              type="date"
              value={form.selectedDate}
              onChange={(e) => setForm((prev) => ({ ...prev, selectedDate: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.selectedTime}
            <input
              required
              placeholder="14:00"
              value={form.selectedTime}
              onChange={(e) => setForm((prev) => ({ ...prev, selectedTime: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.participants}
            <input
              required
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
            {t.dish}
            <input
              value={form.preferredDish}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredDish: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            {t.specialRequests}
            <textarea
              rows={3}
              value={form.specialRequests}
              onChange={(e) => setForm((prev) => ({ ...prev, specialRequests: e.target.value }))}
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
