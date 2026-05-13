'use client';

import { useState } from 'react';
import { isLocale, type Locale } from '@/lib/locale';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { MdCake, MdGroup, MdEmail, MdPhone, MdPerson } from 'react-icons/md';
import { IoCalendar, IoCheckmarkCircle } from 'react-icons/io5';
import { GiPartyPopper } from 'react-icons/gi';
import { HiSparkles } from 'react-icons/hi2';
import BookingFormError from '@/components/site/BookingFormError';
import PublicEventAvailabilityPicker from '@/components/site/PublicEventAvailabilityPicker';
import { isDateInPast, isValidEmail, isValidPhone, parseIntegerInput } from '@/lib/forms/eventBooking';
import {
  BIRTHDAY_PARTY_PRICE_TIERS,
  getBirthdayPartyTier,
  getBirthdayPartyTierById,
  getBirthdayPartyTotal,
} from '@/lib/competitionPricing';

export default function BirthdayPartyBookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (isLocale(params.locale as string) ? params.locale : 'en') as Locale;
  const participantsFromUrl = Number.parseInt(searchParams.get('participants') ?? '', 10);
  const initialBirthdayTier =
    getBirthdayPartyTierById(searchParams.get('birthdayPackage') ?? '') ??
    getBirthdayPartyTier(participantsFromUrl) ??
    BIRTHDAY_PARTY_PRICE_TIERS[0];
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    selectedDate: '',
    selectedTime: '',
    birthdayPackageId: initialBirthdayTier.id,
    numberOfParticipants: initialBirthdayTier.maxParticipants,
    childAge: 10,
    fullName: '',
    email: '',
    phoneNumber: '',
    specialRequests: '',
    gifts: [] as Array<{ id: string; name: string; price: number }>,
  });

  const t = {
    title: locale === 'ar' ? 'حجز حفلة عيد ميلاد' : 'Book Birthday Party',
    step: locale === 'ar' ? 'الخطوة' : 'Step',
    next: locale === 'ar' ? 'التالي' : 'Next',
    back: locale === 'ar' ? 'رجوع' : 'Back',
    submit: locale === 'ar' ? 'أضف إلى السلة' : 'Add to Cart',
    
    selectDateTime: locale === 'ar' ? 'اختر التاريخ والوقت' : 'Select Date & Time',
    selectDate: locale === 'ar' ? 'التاريخ' : 'Date',
    selectTime: locale === 'ar' ? 'الوقت' : 'Time',
    
    partyDetails: locale === 'ar' ? 'تفاصيل الحفلة' : 'Party Details',
    chooseOption: locale === 'ar' ? 'اختاري الباقة' : 'Choose Your Option',
    participants: locale === 'ar' ? 'المشاركون' : 'Participants',
    workStyle: locale === 'ar' ? 'طريقة العمل' : 'Work Style',
    selectedOptionRequired: locale === 'ar' ? 'يرجى اختيار الباقة.' : 'Please select a package option.',
    childAge: locale === 'ar' ? 'عمر الطفل' : "Child's Age",
    minimumAge: locale === 'ar' ? 'الحد الأدنى 10 سنوات' : 'Minimum 10 years',
    duration: locale === 'ar' ? 'المدة: ساعتان' : 'Duration: 2 hours',
    girlsOnly: locale === 'ar' ? 'للبنات فقط' : 'Girls Only',
    
    packageIncludes: locale === 'ar' ? 'تشمل الباقة' : 'Package Includes',
    includes1: locale === 'ar' ? 'قهوة عربية وحلويات' : 'Arabic coffee & sweets',
    includes2: locale === 'ar' ? 'المعدات والمكونات' : 'Equipment & ingredients',
    includes3: locale === 'ar' ? 'إرشاد من فريق نون' : 'Guided by Noon team',
    
    notIncluded: locale === 'ar' ? 'غير مشملة' : 'Not Included',
    notIncluded1: locale === 'ar' ? 'زينة وهدايا عيد الميلاد' : 'Birthday decoration & gifts',
    notIncluded2: locale === 'ar' ? 'كعكة عيد الميلاد' : 'Birthday cake',
    
    bookingInfo: locale === 'ar' ? 'معلومات الحجز' : 'Booking Information',
    fullName: locale === 'ar' ? 'اسم ولي الأمر' : "Parent's Name",
    email: locale === 'ar' ? 'البريد الإلكتروني' : 'Email',
    phoneNumber: locale === 'ar' ? 'رقم الهاتف' : 'Phone Number',
    specialRequests: locale === 'ar' ? 'طلبات خاصة' : 'Special Requests',
    
    confirmationTitle: locale === 'ar' ? 'تمت إضافة الطلب إلى السلة' : 'Request added to cart',
    confirmationMessage: locale === 'ar'
      ? 'يمكنك متابعة الحجز من السلة. سيُراجع فريقنا الطلب بعد إرساله من هناك.'
      : 'You can continue from the cart. Our team will review the request after it is submitted there.',
    backToHome: locale === 'ar' ? 'الذهاب إلى السلة' : 'Go to Cart',
    selectTimePlaceholder: locale === 'ar' ? 'اختر الوقت...' : 'Select time...',
    dateRequired: locale === 'ar' ? 'يرجى اختيار التاريخ.' : 'Please select a date.',
    timeRequired: locale === 'ar' ? 'يرجى اختيار الوقت.' : 'Please select a time.',
    ageMinimum: locale === 'ar' ? 'الحد الأدنى للعمر هو 10 سنوات.' : 'Minimum age is 10.',
    fullNameRequired: locale === 'ar' ? 'يرجى إدخال الاسم.' : 'Please enter parent/guardian name.',
    emailRequired: locale === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter email.',
    phoneRequired: locale === 'ar' ? 'يرجى إدخال رقم الهاتف.' : 'Please enter phone number.',
    invalidEmail: locale === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.',
    invalidPhone: locale === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.',
    submitError: locale === 'ar' ? 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.' : 'Failed to submit booking. Please try again.',
    bookingNumber: locale === 'ar' ? 'رقم الحجز' : 'Booking Number',
    dateInPast: locale === 'ar' ? 'لا يمكن اختيار تاريخ في الماضي.' : 'Selected date cannot be in the past.',
    badgeTitle: locale === 'ar' ? 'حجز حفلة عيد ميلاد' : 'Birthday Party Booking',
    intro:
      locale === 'ar'
        ? 'اصنعي ذكريات لا تُنسى مع حفلة طبخ ممتعة للبنات بعمر 10+'
        : 'Create unforgettable memories with a fun cooking party for girls aged 10+',
    progressDate: locale === 'ar' ? 'التاريخ والوقت' : 'Date & Time',
    progressDetails: locale === 'ar' ? 'التفاصيل' : 'Details',
    progressReview: locale === 'ar' ? 'المراجعة' : 'Review',
    progressConfirm: locale === 'ar' ? 'التأكيد' : 'Confirm',
    step1Hint:
      locale === 'ar'
        ? 'اختاري التاريخ والوقت وحجم المجموعة المناسب.'
        : 'Select your preferred date, time, and party size.',
    childAgePlaceholder: locale === 'ar' ? 'مثال: 12' : 'e.g., 12',
    guardianInfoHint:
      locale === 'ar'
        ? 'بيانات التواصل الخاصة بولي الأمر.'
        : 'Parent/Guardian contact information.',
    fullNamePlaceholder: locale === 'ar' ? 'الاسم الكامل لولي الأمر' : 'Parent/Guardian full name',
    emailPlaceholder: locale === 'ar' ? 'your@email.com' : 'your@email.com',
    phonePlaceholder: locale === 'ar' ? '+968 XXXX XXXX' : '+968 XXXX XXXX',
    specialRequestsPlaceholder:
      locale === 'ar'
        ? 'قيود غذائية، تفضيلات الثيم، طلبات خاصة...'
        : 'Dietary restrictions, theme preferences, special requests...',
    reviewTitle: locale === 'ar' ? 'مراجعة وإرسال' : 'Review & Submit',
    reviewHint:
      locale === 'ar'
        ? 'يرجى مراجعة تفاصيل الحجز قبل الإرسال.'
        : 'Please review your booking details before submitting.',
    summaryTitle: locale === 'ar' ? 'ملخص الحجز' : 'Booking Summary',
    summaryDateTime: locale === 'ar' ? 'التاريخ والوقت' : 'Date & Time',
    summaryPartyDetails: locale === 'ar' ? 'تفاصيل الحفلة' : 'Party Details',
    summarySelectedOption: locale === 'ar' ? 'الباقة المختارة' : 'Selected Package',
    summaryParent: locale === 'ar' ? 'ولي الأمر' : 'Parent/Guardian',
    summaryContact: locale === 'ar' ? 'معلومات التواصل' : 'Contact Information',
    summarySpecial: locale === 'ar' ? 'طلبات خاصة' : 'Special Requests',
    fixedPrice: locale === 'ar' ? 'السعر الثابت' : 'Fixed Price',
    noteTitle: locale === 'ar' ? 'ملاحظة:' : 'Note:',
    noteText:
      locale === 'ar'
        ? 'سيقوم فريقنا بمراجعة طلبك والتواصل معك خلال 24 ساعة لتأكيد التوفر وإنهاء التفاصيل.'
        : 'Our team will review your request and contact you within 24 hours to confirm availability and finalize the details.',
    viewAllEvents: locale === 'ar' ? 'عرض جميع الفعاليات' : 'View All Events',
    loading: locale === 'ar' ? 'جاري المعالجة...' : 'Processing...',
    individual: locale === 'ar' ? 'كل مشاركة تعمل بشكل فردي' : 'Each person works individually',
    pairs: locale === 'ar' ? 'كل شخصين يعملان معاً' : 'Every 2 people work together',
  };

  const selectedTier = getBirthdayPartyTierById(formData.birthdayPackageId) ?? initialBirthdayTier;
  const participantsCount = selectedTier.maxParticipants;
  const birthdayTotal = getBirthdayPartyTotal(participantsCount);
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

      if (!selectedTier) {
        setError(t.selectedOptionRequired);
        return false;
      }

      const age = Number(formData.childAge);
      if (!Number.isInteger(age) || age < 10) {
        setError(t.ageMinimum);
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
      const response = await fetch('/api/cart/event-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'BIRTHDAY_PARTY',
          selectedDate: formData.selectedDate,
          selectedTime: formData.selectedTime,
          estimatedTotal: birthdayTotal,
          currency: 'OMR',
          payload: {
            preferredLanguage: locale,
            birthdayPackage: selectedTier.id,
            numberOfParticipants: selectedTier.maxParticipants,
            childAge: Number(formData.childAge),
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            phoneNumber: formData.phoneNumber.trim(),
            specialRequests: formData.specialRequests.trim(),
          },
        }),
      });

      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (response.ok) {
        setBookingNumber(null);
        window.dispatchEvent(new CustomEvent('cart:changed'));
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
    <div className="noon-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-coral to-coral-light px-6 py-2 text-white">
            <GiPartyPopper className="text-2xl" />
            <span className="font-semibold">{t.badgeTitle}</span>
          </div>
          <h1 className="noon-text text-3xl font-bold md:text-4xl">
            {t.title}
          </h1>
          <p className="noon-text-muted mx-auto mt-4 max-w-2xl">
            {t.intro}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12 flex justify-center gap-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                  step > s
                    ? 'bg-gradient-to-br from-coral to-coral-light text-white shadow-lg'
                    : step === s
                    ? 'border-2 border-coral bg-coral/10 text-coral'
                    : 'border-2 border-[color:var(--border)] bg-[color:var(--surface)] text-gray-400'
                }`}
              >
                {step > s ? (
                  <IoCheckmarkCircle className="text-2xl" />
                ) : (
                  <span className="font-bold">{s}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  step >= s ? 'text-coral' : 'text-gray-400'
                }`}
              >
                {s === 1 && t.progressDate}
                {s === 2 && t.progressDetails}
                {s === 3 && t.progressReview}
                {s === 4 && t.progressConfirm}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-coral/20 bg-[color:var(--surface)] p-8 shadow-xl">
        <BookingFormError message={error} />

        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="noon-text mb-2 text-2xl font-bold">{t.selectDateTime}</h2>
              <p className="noon-text-muted">{t.step1Hint}</p>
            </div>

            <PublicEventAvailabilityPicker
              locale={locale}
              eventType="BIRTHDAY_PARTY"
              layoutVariant="tables"
              showHeader={false}
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

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <MdGroup className="text-xl text-purple" />
                  {t.chooseOption}
                </label>
                <div className="space-y-3">
                  {BIRTHDAY_PARTY_PRICE_TIERS.map((tier) => {
                    const isSelected = tier.id === formData.birthdayPackageId;

                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            birthdayPackageId: tier.id,
                            numberOfParticipants: tier.maxParticipants,
                          }))
                        }
                        className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition ${
                          isSelected
                            ? 'border-purple bg-purple/5 shadow-sm'
                            : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-purple/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-[color:var(--text)]">
                              {tier.minParticipants}-{tier.maxParticipants} {t.participants}
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                              {t.workStyle}: {tier.workMode === 'INDIVIDUAL' ? t.individual : t.pairs}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-coral">{tier.totalPrice} OMR</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <MdCake className="text-xl text-purple" />
                  {t.childAge}
                </label>
                <input
                  type="number"
                  min="10"
                  className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 transition-all focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                  value={formData.childAge}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      childAge: parseIntegerInput(e.target.value, 0),
                    })
                  }
                  placeholder={t.childAgePlaceholder}
                />
                <p className="mt-2 text-xs text-[color:var(--text-subtle)]">{t.minimumAge}</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="noon-text mb-2 text-2xl font-bold">{t.bookingInfo}</h2>
              <p className="noon-text-muted">{t.guardianInfoHint}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <MdPerson className="text-xl text-coral" />
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 transition-all focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={t.fullNamePlaceholder}
                  required
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                    <MdEmail className="text-xl text-yellow" />
                    {t.email} *
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 transition-all focus:border-yellow focus:outline-none focus:ring-2 focus:ring-yellow/20"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t.emailPlaceholder}
                    required
                  />
                </div>

                <div>
                  <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                    <MdPhone className="text-xl text-yellow" />
                    {t.phoneNumber} *
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 transition-all focus:border-yellow focus:outline-none focus:ring-2 focus:ring-yellow/20"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder={t.phonePlaceholder}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <HiSparkles className="text-xl text-purple" />
                  {t.specialRequests}
                </label>
                <textarea
                  className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 transition-all focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                  rows={4}
                  value={formData.specialRequests}
                  onChange={(e) =>
                    setFormData({ ...formData, specialRequests: e.target.value })
                  }
                  placeholder={t.specialRequestsPlaceholder}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="noon-text mb-2 text-2xl font-bold">{t.reviewTitle}</h2>
              <p className="noon-text-muted">{t.reviewHint}</p>
            </div>

            <div className="rounded-2xl border-2 border-purple/20 bg-gradient-to-br from-purple/5 to-purple-dark/5 p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple/20">
                  <GiPartyPopper className="text-2xl text-purple" />
                </div>
                <h3 className="text-xl font-bold">{t.summaryTitle}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl bg-[color:var(--surface)]/50 p-4">
                  <IoCalendar className="mt-1 text-xl text-coral" />
                  <div className="flex-1">
                    <span className="text-sm text-[color:var(--text-muted)]">{t.summaryDateTime}</span>
                    <p className="font-semibold">{formData.selectedDate} {locale === 'ar' ? 'الساعة' : 'at'} {formData.selectedTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-[color:var(--surface)]/50 p-4">
                  <MdGroup className="mt-1 text-xl text-yellow" />
                  <div className="flex-1">
                    <span className="text-sm text-[color:var(--text-muted)]">{t.summarySelectedOption}</span>
                    <p className="font-semibold">
                      {selectedTier.minParticipants}-{selectedTier.maxParticipants} {t.participants}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      {t.workStyle}: {selectedTier.workMode === 'INDIVIDUAL' ? t.individual : t.pairs}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.childAge}: {formData.childAge}</p>
                    <p className="mt-1 font-semibold text-coral">{t.fixedPrice}: {birthdayTotal !== null ? `${birthdayTotal} OMR` : '--'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-[color:var(--surface)]/50 p-4">
                  <MdPerson className="mt-1 text-xl text-teal" />
                  <div className="flex-1">
                    <span className="text-sm text-[color:var(--text-muted)]">{t.summaryParent}</span>
                    <p className="font-semibold">{formData.fullName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-[color:var(--surface)]/50 p-4">
                  <MdEmail className="mt-1 text-xl text-purple" />
                  <div className="flex-1">
                    <span className="text-sm text-[color:var(--text-muted)]">{t.summaryContact}</span>
                    <p className="font-semibold">{formData.email}</p>
                    <p className="font-semibold">{formData.phoneNumber}</p>
                  </div>
                </div>

                {formData.specialRequests && (
                  <div className="flex items-start gap-4 rounded-xl bg-[color:var(--surface)]/50 p-4">
                    <HiSparkles className="mt-1 text-xl text-coral" />
                    <div className="flex-1">
                      <span className="text-sm text-[color:var(--text-muted)]">{t.summarySpecial}</span>
                      <p className="font-semibold">{formData.specialRequests}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border-2 border-yellow/20 bg-yellow/5 p-6">
              <div className="flex items-start gap-3">
                <HiSparkles className="mt-1 text-xl text-yellow" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow">{t.noteTitle}</p>
                  <p className="text-[color:var(--text-muted)]">{t.noteText}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-coral to-coral-light shadow-lg">
              <IoCheckmarkCircle className="text-6xl text-white" />
            </div>
            <h2 className="noon-text mb-4 text-3xl font-bold">{t.confirmationTitle}</h2>
            <p className="noon-text-muted mx-auto mb-8 max-w-2xl text-lg">
              {t.confirmationMessage}
            </p>
            {bookingNumber ? (
              <p className="mb-6 text-sm font-semibold text-zinc-700">
                {t.bookingNumber}: {bookingNumber}
              </p>
            ) : null}
            <div className="mx-auto flex max-w-md flex-col gap-4">
              <button
                onClick={() => router.push(`/${locale}/cart`)}
                className="rounded-xl bg-gradient-to-r from-coral to-coral-light px-8 py-4 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                {t.backToHome}
              </button>
              <button
                onClick={() => router.push(`/${locale}/group-booking-events`)}
                className="rounded-xl border-2 border-coral px-8 py-4 font-semibold text-coral transition-all hover:bg-coral/5"
              >
                {t.viewAllEvents}
              </button>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="mt-12 flex justify-between gap-4">
            <button
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
              disabled={step === 1 || loading}
              className="rounded-xl border-2 border-coral px-8 py-3 font-semibold text-coral transition-all hover:bg-coral/5 disabled:opacity-30 disabled:hover:bg-transparent"
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
                  (step === 1 && (!formData.selectedDate || !formData.selectedTime)) ||
                  (step === 2 && (!formData.fullName || !formData.email || !formData.phoneNumber))
                }
                className="rounded-xl bg-gradient-to-r from-coral to-coral-light px-8 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.fullName || !formData.email || !formData.phoneNumber}
                className="rounded-xl bg-gradient-to-r from-purple to-purple-dark px-8 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    {t.loading}
                  </span>
                ) : (
                  t.submit
                )}
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
