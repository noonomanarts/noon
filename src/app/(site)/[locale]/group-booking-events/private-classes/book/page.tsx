'use client';

import { useState } from 'react';
import { isLocale, type Locale } from '@/lib/locale';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import BookingFormError from '@/components/site/BookingFormError';
import PublicEventAvailabilityPicker from '@/components/site/PublicEventAvailabilityPicker';
import { isDateInPast, isValidEmail, isValidPhone, parseIntegerInput } from '@/lib/forms/eventBooking';
import {
  getPrivateArtsCraftsClassPricePerPerson,
  getPrivateArtsCraftsClassTotal,
  getPrivateCookingClassPricePerPerson,
  getPrivateCookingClassTotal,
} from '@/lib/competitionPricing';

type ClassType = 'cooking' | 'arts-crafts';

export default function PrivateClassBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (isLocale(params.locale as string) ? params.locale : 'en') as Locale;
  
  const rawClassType = searchParams.get('type');
  const classType: ClassType = rawClassType === 'arts-crafts' ? 'arts-crafts' : 'cooking';
  const participantsFromUrl = Number.parseInt(searchParams.get('participants') ?? '', 10);
  const maxParticipants = classType === 'cooking' ? 32 : 200;
  const initialParticipants =
    Number.isInteger(participantsFromUrl) && participantsFromUrl >= 6 && participantsFromUrl <= maxParticipants
      ? participantsFromUrl
      : 8;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    classType,
    selectedDate: '',
    selectedTime: '',
    numberOfParticipants: initialParticipants,
    preferredDish: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    companyOrGroupName: '',
    specialRequests: '',
  });

  const t = {
    title: locale === 'ar' ? 'حجز كلاس خاص' : 'Book Private Class',
    cookingClass: locale === 'ar' ? 'كلاس طبخ خاص' : 'Private Cooking Class',
    artsCraftsClass: locale === 'ar' ? 'كلاس فنون وأشغال خاص' : 'Private Arts & Crafts Class',
    step: locale === 'ar' ? 'الخطوة' : 'Step',
    next: locale === 'ar' ? 'التالي' : 'Next',
    back: locale === 'ar' ? 'رجوع' : 'Back',
    submit: locale === 'ar' ? 'إرسال الطلب' : 'Submit Request',
    
    selectDateTime: locale === 'ar' ? 'اختر التاريخ والوقت' : 'Select Date & Time',
    selectDate: locale === 'ar' ? 'التاريخ' : 'Date',
    selectTime: locale === 'ar' ? 'الوقت' : 'Time',
    
    choosePackage: locale === 'ar' ? 'اختر الباقة' : 'Choose Package',
    participants: locale === 'ar' ? 'المشاركون' : 'Participants',
    duration: locale === 'ar' ? 'المدة' : 'Duration',
    hours: locale === 'ar' ? 'ساعات' : 'hours',
    stations: locale === 'ar' ? 'المحطات' : 'Stations',
    preferredDish: locale === 'ar' ? 'الطبق المفضل' : 'Preferred Dish',
    
    bookingInfo: locale === 'ar' ? 'معلومات الحجز' : 'Booking Information',
    fullName: locale === 'ar' ? 'الاسم الكامل' : 'Full Name',
    email: locale === 'ar' ? 'البريد الإلكتروني' : 'Email',
    phoneNumber: locale === 'ar' ? 'رقم الهاتف' : 'Phone Number',
    companyName: locale === 'ar' ? 'اسم الشركة/المجموعة' : 'Company/Group Name',
    numberOfParticipants: locale === 'ar' ? 'عدد المشاركين' : 'Number of Participants',
    specialRequests: locale === 'ar' ? 'طلبات خاصة' : 'Special Requests',
    
    confirmationTitle: locale === 'ar' ? 'شكراً لطلبك!' : 'Thank You!',
    confirmationMessage: locale === 'ar'
      ? 'تم استلام طلبك وحجز الوقت مبدئياً. سيقوم فريقنا بمراجعة الطلب وتأكيد الموعد معك قريباً.'
      : 'Your request was received and the slot is held temporarily. Our team will review it and confirm the schedule with you shortly.',
    backToHome: locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home',
    selectTimePlaceholder: locale === 'ar' ? 'اختر الوقت...' : 'Select time...',
    dateRequired: locale === 'ar' ? 'يرجى اختيار التاريخ.' : 'Please select a date.',
    timeRequired: locale === 'ar' ? 'يرجى اختيار الوقت.' : 'Please select a time.',
    participantsRange:
      classType === 'arts-crafts'
        ? locale === 'ar'
          ? 'عدد المشاركين يجب أن يكون 6 أو أكثر.'
          : 'Participants must be 6 or more.'
        : locale === 'ar'
          ? 'عدد المشاركين يجب أن يكون بين 6 و 32.'
          : 'Participants must be between 6 and 32.',
    fullNameRequired: locale === 'ar' ? 'يرجى إدخال الاسم الكامل.' : 'Please enter full name.',
    emailRequired: locale === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter email.',
    phoneRequired: locale === 'ar' ? 'يرجى إدخال رقم الهاتف.' : 'Please enter phone number.',
    invalidEmail: locale === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.',
    invalidPhone: locale === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.',
    submitError: locale === 'ar' ? 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.' : 'Failed to submit booking. Please try again.',
    bookingNumber: locale === 'ar' ? 'رقم الحجز' : 'Booking Number',
    dateInPast: locale === 'ar' ? 'لا يمكن اختيار تاريخ في الماضي.' : 'Selected date cannot be in the past.',
    preferredDishPlaceholder:
      locale === 'ar' ? 'مثال: باستا إيطالية، حلويات عربية...' : 'e.g., Italian Pasta, Arabic Sweets, etc.',
    reviewTitle: locale === 'ar' ? 'مراجعة وإرسال' : 'Review & Submit',
    summaryDate: locale === 'ar' ? 'التاريخ' : 'Date',
    summaryTime: locale === 'ar' ? 'الوقت' : 'Time',
    summaryParticipants: locale === 'ar' ? 'عدد المشاركين' : 'Participants',
    summaryPreferredDish: locale === 'ar' ? 'الطبق المفضل' : 'Preferred Dish',
    summaryName: locale === 'ar' ? 'الاسم' : 'Name',
    summaryPhone: locale === 'ar' ? 'رقم الهاتف' : 'Phone',
    estimatedPrice: locale === 'ar' ? 'السعر التقديري' : 'Estimated Price',
    pricePerPerson: locale === 'ar' ? 'السعر/فرد' : 'Price/person',
    privateCookingPricingHint: locale === 'ar'
      ? 'تسعير الطبخ الخاص: 6-10 = 26، 11-18 = 22، 19-25 = 19، 26-32 = 17 ر.ع/فرد.'
      : 'Private cooking pricing: 6-10 = 26, 11-18 = 22, 19-25 = 19, 26-32 = 17 OMR/person.',
    privateArtsPricingHint: locale === 'ar'
      ? 'تسعير الفنون والأشغال: 6-12 = 18، 13-20 = 17، 21-30 = 16، 31+ = 15 ر.ع/فرد.'
      : 'Private arts & crafts pricing: 6-12 = 18, 13-20 = 17, 21-30 = 16, 31+ = 15 OMR/person.',
    externalVenueHint: locale === 'ar'
      ? 'للمجموعات أكبر من 12، يمكن توفير موقع بديل مناسب وتُضاف تكلفة الإيجار إلى السعر النهائي.'
      : 'For groups above 12, a suitable external venue may be required and rental cost is added to the final workshop price.',
    loading: locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...',
  };

  const participantsCount = Number(formData.numberOfParticipants);
  const privateRate =
    classType === 'cooking'
      ? getPrivateCookingClassPricePerPerson(participantsCount)
      : getPrivateArtsCraftsClassPricePerPerson(participantsCount);
  const privateTotal =
    classType === 'cooking'
      ? getPrivateCookingClassTotal(participantsCount)
      : getPrivateArtsCraftsClassTotal(participantsCount);

  const validateStep = (stepToValidate: 1 | 2 | 3): boolean => {
    if (stepToValidate === 1) {
      if (!formData.selectedDate) {
        setError(t.dateRequired);
        return false;
      }
      if (isDateInPast(formData.selectedDate)) {
        setError(t.dateInPast);
        return false;
      }
      if (!formData.selectedTime) {
        setError(t.timeRequired);
        return false;
      }

      const participants = Number(formData.numberOfParticipants);
      const validParticipants =
        classType === 'cooking'
          ? Number.isInteger(participants) && participants >= 6 && participants <= 32
          : Number.isInteger(participants) && participants >= 6;
      if (!validParticipants) {
        setError(t.participantsRange);
        return false;
      }
      return true;
    }

    if (stepToValidate === 2 || stepToValidate === 3) {
      if (!formData.fullName.trim()) {
        setError(t.fullNameRequired);
        return false;
      }
      if (!formData.email.trim()) {
        setError(t.emailRequired);
        return false;
      }
      if (!isValidEmail(formData.email)) {
        setError(t.invalidEmail);
        return false;
      }
      if (!formData.phoneNumber.trim()) {
        setError(t.phoneRequired);
        return false;
      }
      if (!isValidPhone(formData.phoneNumber)) {
        setError(t.invalidPhone);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const requestPayload = {
        eventType: 'PRIVATE_CLASS' as const,
        preferredLanguage: locale,
        classType: formData.classType,
        selectedDate: formData.selectedDate,
        selectedTime: formData.selectedTime,
        numberOfParticipants: Number(formData.numberOfParticipants),
        preferredDish: formData.preferredDish.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        companyOrGroupName: formData.companyOrGroupName.trim(),
        specialRequests: formData.specialRequests.trim(),
      };

      const response = await fetch('/api/public/event-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (response.ok) {
        setBookingNumber(typeof payload.bookingNumber === 'string' ? payload.bookingNumber : null);
        setStep(4);
      } else {
        setError(typeof payload.error === 'string' ? payload.error : t.submitError);
      }
    } catch (error) {
      console.error(error);
      setError(t.submitError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-clip pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem]">
        <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-14 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="noon-text mb-4 text-3xl font-bold">
          {classType === 'cooking' ? t.cookingClass : t.artsCraftsClass}
        </h1>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step >= s
                    ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                    : 'bg-[color:var(--muted)] text-[color:var(--text-subtle)]'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className="h-0.5 w-12 bg-[color:var(--border)]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-sm">
        <BookingFormError message={error} />

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.selectDateTime}</h2>

            <PublicEventAvailabilityPicker
              locale={locale}
              eventType="PRIVATE_CLASS"
              classType={classType}
              layoutVariant="tables"
              selectedDate={formData.selectedDate}
              selectedTime={formData.selectedTime}
              onChange={({ date, time }) =>
                setFormData((prev) => ({
                  ...prev,
                  selectedDate: date,
                  selectedTime: time,
                }))
              }
            />

            <div>
              <label className="noon-text mb-2 block font-semibold">
                {t.numberOfParticipants}
              </label>
              <input
                type="number"
                min="6"
                max={classType === 'cooking' ? '32' : undefined}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                value={formData.numberOfParticipants}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    numberOfParticipants: parseIntegerInput(e.target.value, 0),
                  })
                }
              />
              <p className="mt-1 text-xs text-[color:var(--text-subtle)]">
                {classType === 'cooking' ? `6-32 ${t.participants}` : `6+ ${t.participants}`}
              </p>
            </div>

            {(classType === 'cooking' || classType === 'arts-crafts') && (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                <p className="text-sm font-semibold text-[color:var(--text)]">{t.estimatedPrice}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {t.pricePerPerson}: <span className="font-semibold text-[color:var(--text)]">{privateRate !== null ? `${privateRate} OMR` : '--'}</span>
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {t.estimatedPrice}: <span className="font-semibold text-[color:var(--text)]">{privateTotal !== null ? `${privateTotal} OMR` : '--'}</span>
                  </p>
                </div>
                <p className="mt-2 text-xs text-[color:var(--text-subtle)]">
                  {classType === 'cooking' ? t.privateCookingPricingHint : t.privateArtsPricingHint}
                </p>
                {classType === 'arts-crafts' && participantsCount > 12 ? (
                  <p className="mt-2 text-xs font-medium text-[color:var(--text-muted)]">{t.externalVenueHint}</p>
                ) : null}
              </div>
            )}

            {classType === 'cooking' && (
              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.preferredDish}
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                  value={formData.preferredDish}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredDish: e.target.value })
                  }
                  placeholder={t.preferredDishPlaceholder}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.bookingInfo}</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.email} *
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.phoneNumber} *
                </label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.companyName}
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                  value={formData.companyOrGroupName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyOrGroupName: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="noon-text mb-2 block font-semibold">
                {t.specialRequests}
              </label>
              <textarea
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                rows={4}
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData({ ...formData, specialRequests: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.reviewTitle}</h2>
            
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
              <div className="space-y-2 text-sm text-[color:var(--text)]">
                <div><strong>{t.summaryDate}:</strong> {formData.selectedDate}</div>
                <div><strong>{t.summaryTime}:</strong> {formData.selectedTime}</div>
                <div><strong>{t.summaryParticipants}:</strong> {formData.numberOfParticipants}</div>
                <div><strong>{t.estimatedPrice}:</strong> {privateTotal !== null ? `${privateTotal} OMR` : '--'}</div>
                {classType === 'arts-crafts' && participantsCount > 12 ? (
                  <div><strong>{locale === 'ar' ? 'ملاحظة' : 'Note'}:</strong> {t.externalVenueHint}</div>
                ) : null}
                {formData.preferredDish && (
                  <div><strong>{t.summaryPreferredDish}:</strong> {formData.preferredDish}</div>
                )}
                <div><strong>{t.summaryName}:</strong> {formData.fullName}</div>
                <div><strong>{t.email}:</strong> {formData.email}</div>
                <div><strong>{t.summaryPhone}:</strong> {formData.phoneNumber}</div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--muted)]">
              <span className="text-4xl text-teal">✓</span>
            </div>
            <h2 className="noon-text mb-4 text-2xl font-bold">{t.confirmationTitle}</h2>
            <p className="noon-text-muted mx-auto mb-8 max-w-2xl">
              {t.confirmationMessage}
            </p>
            {bookingNumber ? (
              <p className="mb-6 text-sm font-semibold text-[color:var(--text)]">
                {t.bookingNumber}: {bookingNumber}
              </p>
            ) : null}
            <button
              onClick={() => router.push(`/${locale}`)}
              className="rounded-xl bg-[color:var(--primary)] px-6 py-3 font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
            >
              {t.backToHome}
            </button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
              disabled={step === 1 || loading}
              className="rounded-xl border border-[color:var(--border)] px-6 py-2 font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:opacity-50 disabled:hover:bg-transparent"
            >
              {t.back}
            </button>
            {step < 3 ? (
              <button
                onClick={() => {
                  setError(null);
                  if (validateStep(step as 1 | 2 | 3)) {
                    setStep(step + 1);
                  }
                }}
                disabled={
                  loading ||
                  (step === 1 && (!formData.selectedDate || !formData.selectedTime))
                }
                className="rounded-xl bg-[color:var(--primary)] px-6 py-2 font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:opacity-50"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.fullName || !formData.email || !formData.phoneNumber}
                className="rounded-xl bg-teal px-6 py-2 font-semibold text-white transition hover:bg-teal-light disabled:opacity-50"
              >
                {loading ? t.loading : t.submit}
              </button>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
