"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MdArrowBack, MdSave } from "react-icons/md";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import {
  getBirthdayPartyTotal,
  getPremiumCompetitionTotal,
  getPrivateArtsCraftsClassTotal,
  getPrivateCookingClassTotal,
  getStandardCompetitionTotal,
} from "@/lib/competitionPricing";

const EVENT_TYPES = ["COOKING_COMPETITION", "PRIVATE_CLASS", "BIRTHDAY_PARTY"] as const;
const PRIVATE_CLASS_TYPES = ["cooking", "arts-crafts"] as const;

type EventType = (typeof EVENT_TYPES)[number];
type PrivateClassType = (typeof PRIVATE_CLASS_TYPES)[number];

type CustomerOption = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
};

function toPositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function getCalculatedEventBaseAmount(input: {
  eventType: EventType;
  packageType: string;
  classType: PrivateClassType;
  participants: number;
}): number | null {
  const { eventType, packageType, classType, participants } = input;
  if (!Number.isInteger(participants) || participants <= 0) return null;

  if (eventType === "COOKING_COMPETITION") {
    return packageType === "PREMIUM"
      ? getPremiumCompetitionTotal(participants)
      : getStandardCompetitionTotal(participants);
  }

  if (eventType === "PRIVATE_CLASS") {
    return classType === "arts-crafts"
      ? getPrivateArtsCraftsClassTotal(participants)
      : getPrivateCookingClassTotal(participants);
  }

  return getBirthdayPartyTotal(participants);
}

export default function AdminNewEventPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const router = useRouter();
  const isAr = locale === "ar";

  const [isSaving, setIsSaving] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    userId: "",
    selectedCustomerEmail: "",
    eventType: "COOKING_COMPETITION" as EventType,
    selectedDate: "",
    selectedTime: "",
    packageType: "STANDARD",
    classType: "cooking" as PrivateClassType,
    numberOfParticipants: "8",
    numberOfGroups: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    companyOrGroupName: "",
    preferredDish: "",
    childAge: "10",
    specialRequests: "",
    discountAmount: "",
  });

  useEffect(() => {
    let ignore = false;

    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await fetch("/api/admin/users?status=ACTIVE&role=CUSTOMER&limit=800", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { users?: Array<Record<string, unknown>>; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load customers");
        }

        if (!ignore) {
          setCustomers(
            Array.isArray(payload.users)
              ? payload.users.map((user) => ({
                  id: String(user.id || ""),
                  fullName: String(user.fullName || ""),
                  email: String(user.email || "").toLowerCase(),
                  phoneNumber: String(user.phoneNumber || ""),
                }))
              : []
          );
        }
      } catch (loadError) {
        if (!ignore) {
          setCustomers([]);
          setError(loadError instanceof Error ? loadError.message : (isAr ? "تعذر تحميل العملاء" : "Failed to load customers"));
        }
      } finally {
        if (!ignore) {
          setLoadingCustomers(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      ignore = true;
    };
  }, [isAr]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.email === form.selectedCustomerEmail.toLowerCase().trim()) ?? null,
    [customers, form.selectedCustomerEmail]
  );

  useEffect(() => {
    if (!selectedCustomer) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      userId: selectedCustomer.id,
      fullName: prev.fullName.trim() ? prev.fullName : selectedCustomer.fullName,
      email: selectedCustomer.email,
      phoneNumber: prev.phoneNumber.trim() ? prev.phoneNumber : selectedCustomer.phoneNumber,
    }));
  }, [selectedCustomer]);

  const participants = toPositiveInteger(form.numberOfParticipants);
  const discountAmount = Number.parseFloat(form.discountAmount) || 0;
  const calculatedBaseAmount = getCalculatedEventBaseAmount({
    eventType: form.eventType,
    packageType: form.packageType,
    classType: form.classType,
    participants,
  });
  const calculatedFinalAmount =
    calculatedBaseAmount === null ? null : Math.max(0, Number((calculatedBaseAmount - discountAmount).toFixed(3)));
  const shouldShowPackage = form.eventType === "COOKING_COMPETITION";
  const shouldShowPrivateClassType = form.eventType === "PRIVATE_CLASS";
  const shouldShowPreferredDish = form.eventType === "PRIVATE_CLASS" && form.classType === "cooking";
  const shouldShowChildAge = form.eventType === "BIRTHDAY_PARTY";
  const shouldShowGroups = form.eventType !== "BIRTHDAY_PARTY";

  const t = {
    title: isAr ? "إضافة حجز فعالية" : "Create Event Booking",
    back: isAr ? "رجوع" : "Back",
    save: isAr ? "إنشاء الحجز" : "Create Booking",
    saving: isAr ? "جاري الإنشاء..." : "Creating...",
    required: isAr ? "يرجى تعبئة الحقول المطلوبة" : "Please fill required fields",
    customerLookup: isAr ? "اختر عميلًا موجودًا (اختياري)" : "Choose Existing Customer (optional)",
    customerLookupHint: isAr ? "يمكنك اختيار عميل موجود أو تعبئة البيانات يدويًا." : "You can choose an existing customer or fill the details manually.",
    eventType: isAr ? "نوع الفعالية" : "Event Type",
    selectedDate: isAr ? "التاريخ" : "Date",
    selectedTime: isAr ? "الوقت (HH:MM)" : "Time (HH:MM)",
    packageType: isAr ? "المسابقة العادية / المسابقة المتميزة" : "Package Type (competition only)",
    classType: isAr ? "نوع الدرس الخاص" : "Private Class Type",
    participants: isAr ? "عدد المشاركين" : "Participants",
    groups: isAr ? "عدد الفرق (اختياري)" : "Number of Groups (optional)",
    fullName: isAr ? "الاسم" : "Full Name",
    email: isAr ? "البريد الإلكتروني" : "Email",
    phone: isAr ? "الهاتف" : "Phone",
    company: isAr ? "الشركة/المجموعة" : "Company/Group",
    dish: isAr ? "الطبق المفضل (للخاص)" : "Preferred Dish (private class)",
    childAge: isAr ? "عمر الطفل" : "Child Age",
    specialRequests: isAr ? "طلبات خاصة" : "Special Requests",
    totalAmount: isAr ? "الإجمالي المحسوب" : "Calculated Total Amount",
    discountAmount: isAr ? "مبلغ الخصم" : "Discount Amount",
    finalAmountHint: isAr ? "يتم احتساب السعر تلقائيًا حسب نوع الفعالية وعدد المشاركين." : "Price is calculated automatically from the selected event options and participants.",
    privateCooking: isAr ? "طبخ" : "Cooking",
    privateArtsCrafts: isAr ? "فن وأشغال يدوية" : "Arts & Crafts",
    competitionStandard: isAr ? "عادية" : "Standard",
    competitionPremium: isAr ? "متميزة" : "Premium",
    cookingCompetition: isAr ? "مسابقة الطبخ" : "Cooking Competition",
    privateClass: isAr ? "درس خاص" : "Private Class",
    birthdayParty: isAr ? "حفلة عيد ميلاد" : "Birthday Party",
    noCustomerMatch: isAr ? "اكتب البريد الإلكتروني لربط عميل موجود، أو اتركه فارغًا لإدخال البيانات يدويًا." : "Type an existing customer email to link the booking, or leave it blank for manual entry.",
    loadingCustomers: isAr ? "جاري تحميل العملاء..." : "Loading customers...",
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
        classType: form.eventType === "PRIVATE_CLASS" ? form.classType : undefined,
        numberOfParticipants: participants,
        numberOfGroups:
          form.eventType === "BIRTHDAY_PARTY"
            ? undefined
            : form.numberOfGroups.trim()
              ? Number(form.numberOfGroups)
              : autoGroups,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        companyOrGroupName: form.companyOrGroupName.trim() || undefined,
        preferredDish: shouldShowPreferredDish ? form.preferredDish.trim() || undefined : undefined,
        childAge: form.eventType === "BIRTHDAY_PARTY" ? Number(form.childAge) : undefined,
        specialRequests: form.specialRequests.trim() || undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        totalAmount: calculatedFinalAmount ?? undefined,
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
            {t.customerLookup}
            <input
              list="admin-event-customers"
              value={form.selectedCustomerEmail}
              onChange={(e) => {
                const nextEmail = e.target.value;
                const matchedCustomer = customers.find((customer) => customer.email === nextEmail.toLowerCase().trim()) ?? null;
                setForm((prev) => ({
                  ...prev,
                  selectedCustomerEmail: nextEmail,
                  userId: matchedCustomer?.id ?? "",
                }));
              }}
              placeholder={isAr ? "ابحث بالبريد الإلكتروني للعميل" : "Search by customer email"}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
            <datalist id="admin-event-customers">
              {customers.map((customer) => (
                <option key={customer.id} value={customer.email}>
                  {`${customer.fullName} ${customer.phoneNumber ? `• ${customer.phoneNumber}` : ""}`}
                </option>
              ))}
            </datalist>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {loadingCustomers ? t.loadingCustomers : selectedCustomer ? `${selectedCustomer.fullName} • ${selectedCustomer.phoneNumber}` : t.noCustomerMatch}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.customerLookupHint}</p>
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.eventType}
            <select
              value={form.eventType}
              onChange={(e) => {
                const nextEventType = e.target.value as EventType;
                setForm((prev) => ({
                  ...prev,
                  eventType: nextEventType,
                  packageType: nextEventType === "COOKING_COMPETITION" ? prev.packageType : "STANDARD",
                  classType: nextEventType === "PRIVATE_CLASS" ? prev.classType : "cooking",
                  preferredDish: nextEventType === "PRIVATE_CLASS" ? prev.preferredDish : "",
                  childAge: nextEventType === "BIRTHDAY_PARTY" ? prev.childAge : "10",
                  numberOfGroups: nextEventType === "BIRTHDAY_PARTY" ? "" : prev.numberOfGroups,
                }));
              }}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            >
              <option value="COOKING_COMPETITION">{t.cookingCompetition}</option>
              <option value="PRIVATE_CLASS">{t.privateClass}</option>
              <option value="BIRTHDAY_PARTY">{t.birthdayParty}</option>
            </select>
          </label>

          {shouldShowPackage ? (
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.packageType}
              <select
                value={form.packageType}
                onChange={(e) => setForm((prev) => ({ ...prev, packageType: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              >
                <option value="STANDARD">{t.competitionStandard}</option>
                <option value="PREMIUM">{t.competitionPremium}</option>
              </select>
            </label>
          ) : shouldShowPrivateClassType ? (
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.classType}
              <select
                value={form.classType}
                onChange={(e) => setForm((prev) => ({ ...prev, classType: e.target.value as PrivateClassType }))}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              >
                <option value="cooking">{t.privateCooking}</option>
                <option value="arts-crafts">{t.privateArtsCrafts}</option>
              </select>
            </label>
          ) : (
            <div />
          )}

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

          {shouldShowGroups ? (
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
          ) : shouldShowChildAge ? (
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.childAge}
              <input
                type="number"
                min={10}
                value={form.childAge}
                onChange={(e) => setForm((prev) => ({ ...prev, childAge: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              />
            </label>
          ) : null}

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

          {shouldShowPreferredDish ? (
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
              {t.dish}
              <input
                value={form.preferredDish}
                onChange={(e) => setForm((prev) => ({ ...prev, preferredDish: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              />
            </label>
          ) : null}

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
              type="text"
              readOnly
              value={calculatedFinalAmount !== null ? formatAmountWithCurrency(calculatedFinalAmount, "OMR") : ""}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.finalAmountHint}</p>
          </label>

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.discountAmount}
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.discountAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, discountAmount: e.target.value }))}
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
