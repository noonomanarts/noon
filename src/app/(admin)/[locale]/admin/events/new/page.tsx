"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MdArrowBack, MdSave } from "react-icons/md";
import { QuarterHourTimeSelect } from "@/components/admin/QuarterHourDateTimeInput";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import {
  getBirthdayPartyTotal,
  getPremiumCompetitionTotal,
  getPrivateArtsCraftsClassTotal,
  getPrivateCookingClassTotal,
  getStandardCompetitionTotal,
} from "@/lib/competitionPricing";
import type { EventGiftAddOn, GiftRecipientScope } from "@/lib/eventGiftAddOnTypes";

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
  const [giftOptions, setGiftOptions] = useState<EventGiftAddOn[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [giftSelections, setGiftSelections] = useState<Record<string, GiftRecipientScope>>({});
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
    giftsManualAmount: "",
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

  // Load available gift add-ons whenever the event type changes
  useEffect(() => {
    let ignore = false;
    const loadGifts = async () => {
      setGiftsLoading(true);
      try {
        const response = await fetch(
          `/api/public/event-gift-addons?eventType=${encodeURIComponent(form.eventType)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json().catch(() => ({}))) as { items?: EventGiftAddOn[] };
        if (!ignore) {
          setGiftOptions(Array.isArray(payload.items) ? payload.items : []);
          // Drop any previously selected gifts that are no longer available
          setGiftSelections((prev) => {
            const next: Record<string, GiftRecipientScope> = {};
            const available = new Set((payload.items ?? []).map((item) => item.id));
            for (const [id, scope] of Object.entries(prev)) {
              if (available.has(id)) next[id] = scope;
            }
            return next;
          });
        }
      } catch {
        if (!ignore) setGiftOptions([]);
      } finally {
        if (!ignore) setGiftsLoading(false);
      }
    };
    void loadGifts();
    return () => {
      ignore = true;
    };
  }, [form.eventType]);

  const participants = toPositiveInteger(form.numberOfParticipants);
  const discountAmount = Number.parseFloat(form.discountAmount) || 0;
  const giftsManualAmount = Number.parseFloat(form.giftsManualAmount);
  const giftsManualIsSet =
    form.giftsManualAmount.trim() !== "" && Number.isFinite(giftsManualAmount) && giftsManualAmount >= 0;

  // Auto-computed total for selected gifts based on current participants
  const giftsComputedTotal = useMemo(() => {
    let total = 0;
    for (const [id, scope] of Object.entries(giftSelections)) {
      const gift = giftOptions.find((item) => item.id === id);
      if (!gift) continue;
      if (scope === "ALL_PARTICIPANTS") {
        total += gift.unitPrice * participants;
      }
      // WINNING_TEAM is deferred — doesn't add to estimated total
    }
    return Number(total.toFixed(3));
  }, [giftSelections, giftOptions, participants]);

  const giftsTotal = giftsManualIsSet ? giftsManualAmount : giftsComputedTotal;

  const calculatedBaseAmount = getCalculatedEventBaseAmount({
    eventType: form.eventType,
    packageType: form.packageType,
    classType: form.classType,
    participants,
  });
  const calculatedSubtotal =
    calculatedBaseAmount === null ? null : Number((calculatedBaseAmount + giftsTotal).toFixed(3));
  const calculatedFinalAmount =
    calculatedSubtotal === null ? null : Math.max(0, Number((calculatedSubtotal - discountAmount).toFixed(3)));
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
    giftAddOns: isAr ? "الهدايا الإضافية" : "Gift Add-ons",
    giftAddOnsHint: isAr
      ? "اختر الهدايا المتاحة لهذا النوع من الفعاليات. سيُضاف إجمالي الهدايا إلى المبلغ الإجمالي."
      : "Select the gifts available for this event type. The gifts total will be added to the booking total.",
    giftScopeAll: isAr ? "لجميع المشاركين" : "All participants",
    giftScopeWinning: isAr ? "للفريق الفائز" : "Winning team",
    giftScopeDeferredNote: isAr
      ? "سيتم احتساب السعر لاحقاً بناءً على عدد الفائزين."
      : "Price is added later based on the winning team size.",
    giftsTotalLabel: isAr ? "إجمالي الهدايا" : "Gifts total",
    giftsManualAmount: isAr ? "مبلغ الهدايا (يدوي - اختياري)" : "Gifts Amount (manual override, optional)",
    giftsManualHint: isAr
      ? "في حال تعبئته يتم استخدامه بدلاً من الإجمالي المحسوب للهدايا."
      : "If set, this value replaces the auto-computed gifts total.",
    giftsLoading: isAr ? "جاري تحميل الهدايا..." : "Loading gifts...",
    giftsEmpty: isAr ? "لا توجد هدايا متاحة لهذه الفعالية" : "No gift add-ons available for this event type",
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
        gifts: Object.entries(giftSelections).map(([id, scope]) => ({ id, scope })),
        giftsManualAmount: giftsManualIsSet ? giftsManualAmount : undefined,
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
            <QuarterHourTimeSelect
              required
              value={form.selectedTime}
              onChange={(value) => setForm((prev) => ({ ...prev, selectedTime: value }))}
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

          <div className="sm:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.giftAddOns}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.giftsTotalLabel}: {formatAmountWithCurrency(giftsComputedTotal, "OMR")}
              </span>
            </div>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{t.giftAddOnsHint}</p>
            {giftsLoading ? (
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                {t.giftsLoading}
              </p>
            ) : giftOptions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                {t.giftsEmpty}
              </p>
            ) : (
              <div className="space-y-2">
                {giftOptions.map((gift) => {
                  const selectedScope = giftSelections[gift.id];
                  const checked = Boolean(selectedScope);
                  const name = isAr ? gift.nameAr || gift.nameEn : gift.nameEn;
                  const giftLineTotal =
                    selectedScope === "ALL_PARTICIPANTS" ? Number((gift.unitPrice * participants).toFixed(3)) : 0;
                  return (
                    <div
                      key={gift.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        checked
                          ? "border-coral bg-coral/5 dark:border-coral dark:bg-coral/10"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setGiftSelections((prev) => {
                              const next = { ...prev };
                              if (e.target.checked) {
                                next[gift.id] = prev[gift.id] ?? "ALL_PARTICIPANTS";
                              } else {
                                delete next[gift.id];
                              }
                              return next;
                            });
                          }}
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-coral focus:ring-coral dark:border-zinc-600"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatAmountWithCurrency(gift.unitPrice, "OMR")} / {isAr ? "للشخص" : "per person"}
                            </span>
                          </div>
                        </div>
                      </label>
                      {checked ? (
                        <div className="mt-2 flex flex-wrap items-center gap-3 ps-7 text-xs">
                          <label className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                            <input
                              type="radio"
                              name={`scope-${gift.id}`}
                              checked={selectedScope === "ALL_PARTICIPANTS"}
                              onChange={() =>
                                setGiftSelections((prev) => ({ ...prev, [gift.id]: "ALL_PARTICIPANTS" }))
                              }
                              className="h-3.5 w-3.5"
                            />
                            {t.giftScopeAll}
                          </label>
                          <label className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                            <input
                              type="radio"
                              name={`scope-${gift.id}`}
                              checked={selectedScope === "WINNING_TEAM"}
                              onChange={() =>
                                setGiftSelections((prev) => ({ ...prev, [gift.id]: "WINNING_TEAM" }))
                              }
                              className="h-3.5 w-3.5"
                            />
                            {t.giftScopeWinning}
                          </label>
                          {selectedScope === "ALL_PARTICIPANTS" ? (
                            <span className="ms-auto text-zinc-600 dark:text-zinc-400">
                              {formatAmountWithCurrency(giftLineTotal, "OMR")}
                            </span>
                          ) : (
                            <span className="ms-auto text-zinc-500 dark:text-zinc-400">
                              {t.giftScopeDeferredNote}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            {t.giftsManualAmount}
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.giftsManualAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, giftsManualAmount: e.target.value }))}
              placeholder={formatAmountWithCurrency(giftsComputedTotal, "OMR")}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.giftsManualHint}</p>
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
