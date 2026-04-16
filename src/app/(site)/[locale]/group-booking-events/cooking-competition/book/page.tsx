'use client';

import { useEffect, useState } from 'react';
import { isLocale, type Locale } from '@/lib/locale';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { MdGroup, MdSchedule, MdEmail, MdPhone, MdBusiness, MdCalculate } from 'react-icons/md';
import { IoTrophy, IoCalendar, IoCheckmarkCircle, IoClose } from 'react-icons/io5';
import { GiCookingPot } from 'react-icons/gi';
import { BiSolidGift } from 'react-icons/bi';
import { HiSparkles } from 'react-icons/hi2';
import BookingFormError from '@/components/site/BookingFormError';
import PublicEventAvailabilityPicker from '@/components/site/PublicEventAvailabilityPicker';
import { isDateInPast, isValidEmail, isValidPhone, parseIntegerInput } from '@/lib/forms/eventBooking';
import {
  PREMIUM_COMPETITION_PRICE_TIERS,
  STANDARD_COMPETITION_PRICE_TIERS,
  getPremiumCompetitionPricePerPerson,
  getPremiumCompetitionTotal,
  getStandardCompetitionPricePerPerson,
  getStandardCompetitionTotal,
} from '@/lib/competitionPricing';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import type { EventGiftAddOn, EventGiftSelection } from '@/lib/eventGiftAddOnTypes';

type Step = 1 | 2 | 3 | 4;

interface BookingData {
  // Step 1
  selectedDate?: string;
  selectedTime?: string;
  
  // Step 2
  packageType?: 'STANDARD' | 'PREMIUM';
  gifts?: EventGiftSelection[];
  
  // Step 3
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  companyOrGroupName?: string;
  numberOfParticipants?: number;
  specialRequests?: string;
}

function isValidCompetitionParticipants(value: number, packageType: 'STANDARD' | 'PREMIUM' = 'STANDARD'): boolean {
  const minParticipants = packageType === 'PREMIUM' ? 6 : 8;
  return Number.isInteger(value) && value >= minParticipants && value <= 40;
}

export default function CookingCompetitionBookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (isLocale(params.locale as string) ? params.locale : 'en') as Locale;
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [giftOptions, setGiftOptions] = useState<EventGiftAddOn[]>([]);
  const [giftInfoMessage, setGiftInfoMessage] = useState<string | null>(null);
  const [giftsLoading, setGiftsLoading] = useState(true);

  useEffect(() => {
    const packageFromUrl = searchParams.get('package')?.toLowerCase();
    const participantsFromUrl = Number.parseInt(searchParams.get('participants') ?? '', 10);
    const normalizedPackage =
      packageFromUrl === 'standard'
        ? 'STANDARD'
        : packageFromUrl === 'premium'
        ? 'PREMIUM'
        : null;
    const normalizedParticipants = isValidCompetitionParticipants(participantsFromUrl, normalizedPackage ?? 'STANDARD')
      ? participantsFromUrl
      : null;

    setBookingData((prev) => {
      const nextPackageType = prev.packageType ?? normalizedPackage ?? 'STANDARD';
      const nextParticipants = prev.numberOfParticipants ?? normalizedParticipants ?? undefined;

      if (
        nextPackageType === prev.packageType &&
        nextParticipants === prev.numberOfParticipants
      ) {
        return prev;
      }

      return {
        ...prev,
        packageType: nextPackageType,
        numberOfParticipants: nextParticipants,
      };
    });
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    const loadGiftOptions = async () => {
      setGiftsLoading(true);
      try {
        const response = await fetch('/api/public/event-gift-addons?eventType=COOKING_COMPETITION', {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => ({}))) as { items?: EventGiftAddOn[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load gift add-ons');
        }
        if (!ignore) {
          setGiftOptions(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch (loadError) {
        if (!ignore) {
          setGiftOptions([]);
          setError(loadError instanceof Error ? loadError.message : 'Failed to load gift add-ons');
        }
      } finally {
        if (!ignore) {
          setGiftsLoading(false);
        }
      }
    };

    void loadGiftOptions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setBookingData((prev) => {
      if (!prev.gifts?.length) return prev;

      const participantCount = Number(prev.numberOfParticipants);
      const recalculated = prev.gifts.map((gift) =>
        gift.pricingRule === 'PER_PARTICIPANT'
          ? {
              ...gift,
              price: Number((gift.unitPrice * participantCount).toFixed(3)),
            }
          : gift
      );

      const changed = recalculated.some((gift, index) => gift.price !== prev.gifts?.[index]?.price);
      if (!changed) return prev;

      return {
        ...prev,
        gifts: recalculated,
      };
    });
  }, [bookingData.numberOfParticipants]);

  const t = {
    title: locale === 'ar' ? 'حجز مسابقة الطبخ' : 'Book Cooking Competition',
    step: locale === 'ar' ? 'الخطوة' : 'Step',
    next: locale === 'ar' ? 'التالي' : 'Next',
    back: locale === 'ar' ? 'رجوع' : 'Back',
    submit: locale === 'ar' ? 'إرسال الطلب' : 'Submit Request',
    
    // Step 1
    step1Title: locale === 'ar' ? 'اختر التاريخ والوقت' : 'Select Date & Time',
    selectDate: locale === 'ar' ? 'اختر التاريخ' : 'Select Date',
    selectTime: locale === 'ar' ? 'اختر الوقت' : 'Select Time',
    briefTitle: locale === 'ar' ? 'عن المسابقة' : 'About the Competition',
    briefText: locale === 'ar' 
      ? 'نرحب بكم مع قهوة عربية وحلويات، نقوم بسحب الفرق، صندوق مفاجآت، الطبخ والتنافس، التصويت، وإعلان الفريق الفائز!'
      : 'Welcome with Arabic coffee & sweets, team draw, mystery box challenge, cook & compete, voting, and winner announcement!',
    
    // Step 2
    step2Title: locale === 'ar' ? 'التسعير والإضافات' : 'Pricing & Add-ons',
    standardPackage: locale === 'ar' ? 'المسابقة العادية' : 'Standard Competition',
    premiumPackage: locale === 'ar' ? 'المسابقة المتميزة' : 'Premium Competition',
    selectedPackage: locale === 'ar' ? 'الباقة المختارة' : 'Selected Package',
    changePackage: locale === 'ar' ? 'تغيير الباقة' : 'Change Package',
    packageLockedHint: locale === 'ar'
      ? 'تم اختيار هذه الباقة في الخطوة السابقة. يمكنك تغييرها من صفحة الباقات.'
      : 'This package was selected in the previous step. You can change it from the packages page.',
    packageDefaultHint: locale === 'ar'
      ? 'تم اعتماد الباقة القياسية تلقائياً. يمكنك تغييرها من صفحة الباقات.'
      : 'Standard package is preselected by default. You can change it from the packages page.',
    participants: locale === 'ar' ? 'المشاركون' : 'Participants',
    groups: locale === 'ar' ? 'عدد الفرق' : 'Groups',
    dishes: locale === 'ar' ? 'عدد الأطباق لكل فريق' : 'Dishes per Group',
    duration: locale === 'ar' ? 'المدة' : 'Duration',
    hours: locale === 'ar' ? 'ساعات' : 'hours',
    gifts: locale === 'ar' ? 'الهدايا' : 'Gifts',
    notIncluded: locale === 'ar' ? 'غير مشمولة' : 'Not Included',
    included: locale === 'ar' ? 'مشمولة' : 'Included',
    availableAsAddon: locale === 'ar' ? '(متاحة كإضافة)' : '(Available as add-on)',
    includes: locale === 'ar' ? 'يشمل' : 'Includes',
    giftAddons: locale === 'ar' ? 'إضافات الهدايا' : 'Gift Add-ons',
    forAllParticipants: locale === 'ar' ? 'لجميع المشاركين' : 'For All Participants',
    forWinningTeam: locale === 'ar' ? 'للفريق الفائز فقط' : 'For Winning Team Only',
    addToBooking: locale === 'ar' ? 'أضف للحجز' : 'Add to Booking',
    selected: locale === 'ar' ? 'محدد' : 'Selected',
    priceForOneGift: locale === 'ar' ? 'لكل هدية' : 'Per gift',
    giftsUnavailable: locale === 'ar' ? 'لا توجد إضافات هدايا معرفة حالياً.' : 'No gift add-ons are configured right now.',
    winningTeamNotice: locale === 'ar' ? 'سعر هدية الفريق الفائز يُحدد لاحقاً.' : 'Winning team gift total is added later.',
    immediateGiftTotal: locale === 'ar' ? 'إجمالي الهدايا الفوري' : 'Immediate Gifts Total',
    deferredGiftNote: locale === 'ar' ? 'هدايا الفريق الفائز غير مشمولة في الإجمالي التقديري.' : 'Winning team gifts are not included in the estimated total yet.',
    standardSubtitle: locale === 'ar' ? 'تجربة رائعة للفرق' : 'Great team experience',
    premiumSubtitle: locale === 'ar' ? 'تجربة لا تُنسى' : 'Unforgettable experience',
    popular: locale === 'ar' ? 'الأفضل' : 'POPULAR',
    calculatorTitle: locale === 'ar' ? 'حاسبة السعر' : 'Price Calculator',
    calculatorSubtitle: locale === 'ar'
      ? 'أدخلي عدد المشاركين ليتم احتساب السعر تلقائياً حسب الشرائح، وسيتم نقل القيمة للخطوة التالية.'
      : 'Enter participants to calculate pricing by tier. This value is carried to the next step.',
    perPersonRate: locale === 'ar' ? 'سعر الفرد' : 'Per Person Rate',
    baseAmount: locale === 'ar' ? 'المبلغ الأساسي' : 'Base Amount',
    giftsAmount: locale === 'ar' ? 'قيمة الهدايا' : 'Gifts Amount',
    estimatedTotal: locale === 'ar' ? 'الإجمالي التقديري' : 'Estimated Total',
    priceTableTitle: locale === 'ar' ? 'جدول التسعير حسب الباقة' : 'Package Pricing Table',
    range: locale === 'ar' ? 'العدد' : 'Range',
    pricePerPerson: locale === 'ar' ? 'السعر/فرد' : 'Price/person',
    participantsCarryHint: locale === 'ar'
      ? 'هذه القيمة مأخوذة من الحاسبة ويمكن تعديلها.'
      : 'This value comes from the calculator and can be edited.',
    summaryParticipants: locale === 'ar' ? 'المشاركون' : 'Participants',
    summaryEstimate: locale === 'ar' ? 'السعر التقديري' : 'Estimated Price',
    
    // Step 3
    step3Title: locale === 'ar' ? 'معلومات الحجز' : 'Booking Information',
    fullName: locale === 'ar' ? 'الاسم الكامل' : 'Full Name',
    email: locale === 'ar' ? 'البريد الإلكتروني' : 'Email',
    phoneNumber: locale === 'ar' ? 'رقم الهاتف' : 'Phone Number',
    companyName: locale === 'ar' ? 'اسم الشركة/المجموعة' : 'Company/Group Name',
    numberOfParticipants: locale === 'ar' ? 'عدد المشاركين' : 'Number of Participants',
    specialRequests: locale === 'ar' ? 'طلبات خاصة/ملاحظات' : 'Special Requests/Notes',
    
    // Step 4
    confirmationTitle: locale === 'ar' ? 'شكراً لطلبك!' : 'Thank You for Your Request!',
    confirmationMessage: locale === 'ar'
      ? 'تم حجز الوقت المطلوب مبدئياً. سيقوم فريقنا بمراجعة التفاصيل والاتصال بك قريباً لاعتماد الموعد وإتمام الدفع.'
      : 'Your requested slot is held temporarily. Our team will review the details and contact you shortly to approve the schedule and complete payment.',
    backToHome: locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home',
    selectTimePlaceholder: locale === 'ar' ? 'اختر الوقت...' : 'Select time...',
    invalidEmail: locale === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.',
    invalidPhone: locale === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.',
    dateRequired: locale === 'ar' ? 'يرجى اختيار التاريخ.' : 'Please select a date.',
    timeRequired: locale === 'ar' ? 'يرجى اختيار الوقت.' : 'Please select a time.',
    packageRequired: locale === 'ar' ? 'يرجى اختيار الباقة.' : 'Please choose a package.',
    participantsRangeStandard: locale === 'ar' ? 'عدد المشاركين يجب أن يكون بين 8 و 40.' : 'Participants must be between 8 and 40.',
    participantsRangePremium: locale === 'ar' ? 'عدد المشاركين يجب أن يكون بين 6 و 40.' : 'Participants must be between 6 and 40.',
    fullNameRequired: locale === 'ar' ? 'يرجى إدخال الاسم الكامل.' : 'Please enter full name.',
    emailRequired: locale === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter email.',
    phoneRequired: locale === 'ar' ? 'يرجى إدخال رقم الهاتف.' : 'Please enter phone number.',
    submitError: locale === 'ar' ? 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.' : 'Failed to submit booking. Please try again.',
    bookingNumber: locale === 'ar' ? 'رقم الحجز' : 'Booking Number',
    dateInPast: locale === 'ar' ? 'لا يمكن اختيار تاريخ في الماضي.' : 'Selected date cannot be in the past.',
    bookingSummary: locale === 'ar' ? 'ملخص الحجز' : 'Booking Summary',
    summaryDate: locale === 'ar' ? 'التاريخ' : 'Date',
    summaryTime: locale === 'ar' ? 'الوقت' : 'Time',
    summaryPackage: locale === 'ar' ? 'الباقة' : 'Package',
    summaryGifts: locale === 'ar' ? 'الهدايا' : 'Gifts',
    loading: locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...',
  };

  const participantsCount = Number(bookingData.numberOfParticipants);
  const hasValidParticipants = isValidCompetitionParticipants(participantsCount, bookingData.packageType ?? 'STANDARD');
  const packageFromEntry = searchParams.get('package')?.toLowerCase();
  const packageSelectedFromEntry = packageFromEntry === 'standard' || packageFromEntry === 'premium';
  const packageRate =
    hasValidParticipants && bookingData.packageType === 'PREMIUM'
      ? getPremiumCompetitionPricePerPerson(participantsCount)
      : hasValidParticipants
      ? getStandardCompetitionPricePerPerson(participantsCount)
      : null;
  const packageBaseAmount =
    hasValidParticipants && bookingData.packageType === 'PREMIUM'
      ? getPremiumCompetitionTotal(participantsCount)
      : hasValidParticipants
      ? getStandardCompetitionTotal(participantsCount)
      : null;
  const giftsAmount = (bookingData.gifts || []).reduce((sum, gift) => sum + gift.price, 0);
  const deferredGiftSelections = (bookingData.gifts || []).filter((gift) => gift.pricingRule === 'DEFERRED');
  const estimatedTotalAmount =
    bookingData.packageType && packageBaseAmount !== null
      ? packageBaseAmount + giftsAmount
      : null;
  const selectedPackageLabel =
    bookingData.packageType === 'STANDARD'
      ? t.standardPackage
      : bookingData.packageType === 'PREMIUM'
      ? t.premiumPackage
      : '--';
  const selectedPackageSubtitle =
    bookingData.packageType === 'PREMIUM' ? t.premiumSubtitle : t.standardSubtitle;
  const selectedPackageDishes = bookingData.packageType === 'PREMIUM' ? '2-3' : '1-2';
  const selectedPackageGifts =
    bookingData.packageType === 'PREMIUM'
      ? t.included
      : `${t.notIncluded} ${t.availableAsAddon}`;
  const selectedPackageIdealText =
    bookingData.packageType === 'PREMIUM'
      ? locale === 'ar'
        ? 'فعاليات الشركات والاحتفالات والتجارب الراقية'
        : 'Corporate events, celebrations, and premium experiences'
      : locale === 'ar'
      ? 'بناء الفريق، الأصدقاء، والتجارب الجماعية'
      : 'Team building, friends, and casual group experiences';
  const participantsRangeMessage =
    bookingData.packageType === 'PREMIUM' ? t.participantsRangePremium : t.participantsRangeStandard;
  const participantsMin = bookingData.packageType === 'PREMIUM' ? 6 : 8;
  const formatMoney = (value: number | null | undefined) =>
    formatAmountWithCurrency(value, 'OMR', {
      locale,
      maxFractionDigits: 3,
    });

  const validateStep = (stepToValidate: 1 | 2 | 3): boolean => {
    if (stepToValidate === 1) {
      if (!bookingData.selectedDate) {
        setError(t.dateRequired);
        return false;
      }
      if (isDateInPast(bookingData.selectedDate)) {
        setError(t.dateInPast);
        return false;
      }
      if (!bookingData.selectedTime) {
        setError(t.timeRequired);
        return false;
      }
      return true;
    }

    if (stepToValidate === 2) {
      if (!bookingData.packageType) {
        setError(t.packageRequired);
        return false;
      }
      const participants = Number(bookingData.numberOfParticipants);
      if (!isValidCompetitionParticipants(participants, bookingData.packageType ?? 'STANDARD')) {
        setError(participantsRangeMessage);
        return false;
      }
      return true;
    }

    if (!bookingData.fullName?.trim()) {
      setError(t.fullNameRequired);
      return false;
    }
    if (!bookingData.email?.trim()) {
      setError(t.emailRequired);
      return false;
    }
    if (!isValidEmail(bookingData.email)) {
      setError(t.invalidEmail);
      return false;
    }
    if (!bookingData.phoneNumber?.trim()) {
      setError(t.phoneRequired);
      return false;
    }
    if (!isValidPhone(bookingData.phoneNumber)) {
      setError(t.invalidPhone);
      return false;
    }

    const participants = Number(bookingData.numberOfParticipants);
    if (!isValidCompetitionParticipants(participants, bookingData.packageType ?? 'STANDARD')) {
      setError(participantsRangeMessage);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep < 3 && validateStep(currentStep as 1 | 2 | 3)) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const requestPayload = {
        eventType: 'COOKING_COMPETITION' as const,
        preferredLanguage: locale,
        selectedDate: bookingData.selectedDate,
        selectedTime: bookingData.selectedTime,
        packageType: bookingData.packageType,
        gifts: bookingData.gifts,
        fullName: bookingData.fullName?.trim(),
        email: bookingData.email?.trim(),
        phoneNumber: bookingData.phoneNumber?.trim(),
        companyOrGroupName: bookingData.companyOrGroupName?.trim(),
        numberOfParticipants: Number(bookingData.numberOfParticipants),
        specialRequests: bookingData.specialRequests?.trim(),
      };

      const response = await fetch('/api/public/event-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (response.ok) {
        const serverBookingNumber =
          typeof payload.bookingNumber === 'string' ? payload.bookingNumber : null;
        setBookingNumber(serverBookingNumber);
        setCurrentStep(4);
      } else {
        setError(typeof payload.error === 'string' ? payload.error : t.submitError);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(t.submitError);
    } finally {
      setLoading(false);
    }
  };

  const toggleGift = (gift: EventGiftAddOn, scope: 'ALL_PARTICIPANTS' | 'WINNING_TEAM') => {
    const currentGifts = bookingData.gifts || [];
    const existingIndex = currentGifts.findIndex(
      g => g.id === gift.id && g.scope === scope
    );

    if (existingIndex >= 0) {
      setBookingData({
        ...bookingData,
        gifts: currentGifts.filter((_, i) => i !== existingIndex),
      });
      setGiftInfoMessage(null);
    } else {
      const participantCount = Number(bookingData.numberOfParticipants) || 0;
      const nextGift: EventGiftSelection = scope === 'ALL_PARTICIPANTS'
        ? {
            id: gift.id,
            scope,
            nameEn: gift.nameEn,
            nameAr: gift.nameAr,
            descriptionEn: gift.descriptionEn,
            descriptionAr: gift.descriptionAr,
            image: gift.image,
            unitPrice: gift.unitPrice,
            price: Number((gift.unitPrice * participantCount).toFixed(3)),
            pricingRule: 'PER_PARTICIPANT',
          }
        : {
            id: gift.id,
            scope,
            nameEn: gift.nameEn,
            nameAr: gift.nameAr,
            descriptionEn: gift.descriptionEn,
            descriptionAr: gift.descriptionAr,
            image: gift.image,
            unitPrice: gift.unitPrice,
            price: 0,
            pricingRule: 'DEFERRED',
            pricingNoteEn: 'Final gift total will be added later based on the number of participants in the winning team.',
            pricingNoteAr: 'سيتم إضافة إجمالي سعر الهدية لاحقاً بناءً على عدد المشاركين في الفريق الفائز.',
          };

      setBookingData({
        ...bookingData,
        gifts: [
          ...currentGifts,
          nextGift,
        ],
      });
      setGiftInfoMessage(scope === 'WINNING_TEAM' ? t.winningTeamNotice : null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-coral-light/10 px-4 py-2 text-sm font-semibold text-coral">
            <IoTrophy className="h-5 w-5" />
            {t.title}
          </div>
          
          {/* Progress Steps */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all ${
                    currentStep >= step
                      ? 'text-white shadow-lg'
                      : 'bg-zinc-200 text-[color:var(--text-muted)] dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                  style={currentStep >= step ? { background: 'var(--noon-coral-gradient)' } : {}}
                >
                  {currentStep > step ? <IoCheckmarkCircle className="h-6 w-6" /> : step}
                </div>
                {step < 3 && (
                  <div 
                    className={`h-1 w-16 rounded transition-all ${
                      currentStep > step ? 'bg-coral' : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <BookingFormError message={error} />

        {/* Step Content */}
        <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          {/* Step 1: Date & Time Selection */}
          {currentStep === 1 && (
            <div className="space-y-6 p-8">
              <div className="mb-6 flex items-center gap-3">
                <IoCalendar className="h-8 w-8 text-teal" />
                <h2 className="text-2xl font-bold text-[color:var(--text)] dark:text-white">{t.step1Title}</h2>
              </div>
              
              {/* Brief */}
              <div className="rounded-xl border-2 border-coral/20 bg-coral/5 p-6 dark:border-coral/30 dark:bg-coral/10">
                <div className="mb-3 flex items-center gap-2">
                  <GiCookingPot className="h-6 w-6 text-coral" />
                  <h3 className="font-bold text-[color:var(--text)] dark:text-white">{t.briefTitle}</h3>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{t.briefText}</p>
              </div>

              <PublicEventAvailabilityPicker
                locale={locale}
                eventType="COOKING_COMPETITION"
                layoutVariant="tables"
                selectedDate={bookingData.selectedDate || ''}
                selectedTime={bookingData.selectedTime || ''}
                onChange={({ date, time }) =>
                  setBookingData((prev) => ({
                    ...prev,
                    selectedDate: date,
                    selectedTime: time,
                  }))
                }
              />
          </div>
        )}

        {/* Step 2: Package Selection */}
        {currentStep === 2 && (
          <div className="space-y-8 p-8">
            <div className="mb-6 flex items-center gap-3">
              <BiSolidGift className="h-8 w-8 text-purple" />
              <h2 className="text-2xl font-bold text-[color:var(--text)] dark:text-white">{t.step2Title}</h2>
            </div>

            {/* Price Calculator */}
            <div className="rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm dark:border-zinc-700">
              <div className="mb-4 flex items-center gap-2">
                <MdCalculate className="h-5 w-5 text-coral" />
                <h3 className="text-xl font-bold text-[color:var(--text)] dark:text-white">{t.calculatorTitle}</h3>
              </div>
              <p className="text-sm text-[color:var(--text-muted)] dark:text-zinc-300">{t.calculatorSubtitle}</p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-3 flex items-center gap-2 font-bold text-[color:var(--text)] dark:text-white">
                    <MdGroup className="h-5 w-5 text-teal" />
                    {t.numberOfParticipants} *
                  </label>
                  <input
                    type="number"
                    min={participantsMin}
                    max="40"
                    className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 font-medium transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    value={bookingData.numberOfParticipants || ''}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        numberOfParticipants: parseIntegerInput(e.target.value, 0),
                      })
                    }
                    required
                  />
                  <p className="mt-2 text-xs text-[color:var(--text-subtle)]">{participantsRangeMessage}</p>
                </div>

                <div className="rounded-2xl border border-[color:var(--border)] p-6 dark:border-zinc-700" style={{ background: 'var(--noon-yellow-gradient)' }}>
                  <h3 className="mb-4 text-xl font-bold text-[color:var(--text)]">{t.giftAddons}</h3>
                  {giftInfoMessage ? (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
                      {giftInfoMessage}
                    </div>
                  ) : null}
                  {giftsLoading ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-200">Loading...</p>
                  ) : giftOptions.length === 0 ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-200">{t.giftsUnavailable}</p>
                  ) : (
                    <div className="space-y-4">
                      {giftOptions.map((gift) => (
                        <div
                          key={gift.id}
                          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]/80 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-800/80"
                        >
                          <div className="flex items-start gap-6">
                            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30">
                              <div className="flex h-full w-full items-center justify-center">
                                <BiSolidGift className="h-12 w-12 text-yellow" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="mb-2 text-lg font-bold text-[color:var(--text)] dark:text-white">
                                {(locale === 'ar' ? gift.nameAr : gift.nameEn) || gift.nameEn || gift.nameAr}
                              </h4>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {(locale === 'ar' ? gift.descriptionAr : gift.descriptionEn) || gift.descriptionEn || gift.descriptionAr || '--'}
                              </p>
                              <p className="mt-3 text-2xl font-bold text-coral">
                                {formatMoney(gift.unitPrice)}
                              </p>
                              <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                                {t.priceForOneGift}
                              </p>
                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() => toggleGift(gift, 'ALL_PARTICIPANTS')}
                                  className={`group flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                    bookingData.gifts?.some(
                                      g => g.id === gift.id && g.scope === 'ALL_PARTICIPANTS'
                                    )
                                      ? 'text-white shadow-lg'
                                      : 'border-2 bg-[color:var(--surface)] text-zinc-700 hover:shadow-md dark:bg-zinc-800 dark:text-zinc-200'
                                  }`}
                                  style={bookingData.gifts?.some(
                                    g => g.id === gift.id && g.scope === 'ALL_PARTICIPANTS'
                                  ) ? { background: 'var(--noon-teal-gradient)' } : { borderColor: 'var(--noon-teal)' }}
                                >
                                  <MdGroup className="h-5 w-5" />
                                  {t.forAllParticipants}
                                </button>
                                <button
                                  onClick={() => toggleGift(gift, 'WINNING_TEAM')}
                                  className={`group flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                    bookingData.gifts?.some(
                                      g => g.id === gift.id && g.scope === 'WINNING_TEAM'
                                    )
                                      ? 'text-white shadow-lg'
                                      : 'border-2 bg-[color:var(--surface)] text-zinc-700 hover:shadow-md dark:bg-zinc-800 dark:text-zinc-200'
                                  }`}
                                  style={bookingData.gifts?.some(
                                    g => g.id === gift.id && g.scope === 'WINNING_TEAM'
                                  ) ? { background: 'var(--noon-purple-gradient)' } : { borderColor: 'var(--noon-purple)' }}
                                >
                                  <IoTrophy className="h-5 w-5" />
                                  {t.forWinningTeam}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4 dark:border-zinc-700">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[color:var(--text)]">{t.perPersonRate}</span>
                    <span className="font-semibold text-[color:var(--text-muted)]">
                      {packageRate !== null ? formatMoney(packageRate) : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[color:var(--text)]">{t.baseAmount}</span>
                    <span className="font-semibold text-[color:var(--text-muted)]">
                      {packageBaseAmount !== null ? formatMoney(packageBaseAmount) : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[color:var(--text)]">{t.giftsAmount}</span>
                    <span className="font-semibold text-[color:var(--text-muted)]">{formatMoney(giftsAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-[color:var(--border)] dark:border-zinc-700">
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--muted)]/70">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[color:var(--text)]">{t.range}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[color:var(--text)]">{t.pricePerPerson}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bookingData.packageType === 'PREMIUM'
                      ? PREMIUM_COMPETITION_PRICE_TIERS
                      : STANDARD_COMPETITION_PRICE_TIERS).map((tier) => {
                      const withinMaxParticipants =
                        tier.maxParticipants === null || participantsCount <= tier.maxParticipants;
                      const isActive =
                        hasValidParticipants &&
                        tier.pricePerPerson === packageRate &&
                        participantsCount >= tier.minParticipants &&
                        withinMaxParticipants;
                      return (
                        <tr
                          key={`${tier.minParticipants}-${tier.maxParticipants}`}
                          className={`border-t border-[color:var(--border)] dark:border-zinc-700 ${
                            isActive ? 'bg-teal/10' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 text-[color:var(--text-muted)]">
                            {tier.minParticipants}-{tier.maxParticipants}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-[color:var(--text)]">{formatMoney(tier.pricePerPerson)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[color:var(--text-subtle)]">{t.priceTableTitle}</p>
            </div>

            {/* Package Summary */}
            <div
              className={`overflow-hidden rounded-2xl border shadow-sm ${
                bookingData.packageType === 'PREMIUM'
                  ? 'border-purple/30 dark:border-purple/40'
                  : 'border-teal/30 dark:border-teal/40'
              }`}
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-b p-5 ${
                  bookingData.packageType === 'PREMIUM'
                    ? 'border-purple/20 bg-purple/5 dark:border-purple/30 dark:bg-purple/10'
                    : 'border-teal/20 bg-teal/5 dark:border-teal/30 dark:bg-teal/10'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
                    {t.selectedPackage}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-[color:var(--text)] dark:text-white">
                    {selectedPackageLabel}
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">{selectedPackageSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/group-booking-events/cooking-competition`)}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
                >
                  {t.changePackage}
                </button>
              </div>

              <div className="grid gap-3 p-5">
                {[
                  { Icon: MdGroup, label: t.participants, value: bookingData.packageType === 'PREMIUM' ? '6-40' : '8-40' },
                  { Icon: MdSchedule, label: t.duration, value: `3 ${t.hours}` },
                  { Icon: GiCookingPot, label: t.dishes, value: selectedPackageDishes },
                  { Icon: BiSolidGift, label: t.gifts, value: selectedPackageGifts },
                ].map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5"
                  >
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                      <item.Icon className="h-4 w-4 text-coral" />
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">{item.value}</p>
                  </div>
                ))}
              </div>

              <p className="px-5 pb-5 text-xs text-[color:var(--text-subtle)]">
                {selectedPackageIdealText}
                {' • '}
                {packageSelectedFromEntry ? t.packageLockedHint : t.packageDefaultHint}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-coral/20 bg-coral/5 p-6 dark:border-coral/30 dark:bg-coral/10">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-[color:var(--text)] dark:text-white">
                <MdCalculate className="h-6 w-6 text-coral" />
                {t.estimatedTotal}
              </h3>
              <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[color:var(--text)]">{t.baseAmount}</span>
                  <span>{packageBaseAmount !== null ? formatMoney(packageBaseAmount) : '--'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[color:var(--text)]">{t.immediateGiftTotal}</span>
                  <span>{formatMoney(giftsAmount)}</span>
                </div>
                {deferredGiftSelections.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
                    {t.deferredGiftNote}
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-base font-bold text-coral dark:bg-zinc-800">
                  <span>{t.estimatedTotal}</span>
                  <span>{estimatedTotalAmount !== null ? formatMoney(estimatedTotalAmount) : '--'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Step 3: Booking Form */}
        {currentStep === 3 && (
          <div className="space-y-6 p-8">
            <div className="mb-6 flex items-center gap-3">
              <MdBusiness className="h-8 w-8 text-yellow" />
              <h2 className="text-2xl font-bold text-[color:var(--text)] dark:text-white">{t.step3Title}</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-3 flex items-center gap-2 font-bold text-[color:var(--text)] dark:text-white">
                  <MdGroup className="h-5 w-5 text-teal" />
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 font-medium transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  value={bookingData.fullName || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 font-bold text-[color:var(--text)] dark:text-white">
                  <MdEmail className="h-5 w-5 text-purple" />
                  {t.email} *
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 font-medium transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  value={bookingData.email || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 font-bold text-[color:var(--text)] dark:text-white">
                  <MdPhone className="h-5 w-5 text-yellow" />
                  {t.phoneNumber} *
                </label>
                <input
                  type="tel"
                  className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 font-medium transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  value={bookingData.phoneNumber || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 font-bold text-[color:var(--text)] dark:text-white">
                  <MdBusiness className="h-5 w-5 text-teal" />
                  {t.companyName}
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 font-medium transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  value={bookingData.companyOrGroupName || ''}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      companyOrGroupName: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div>
              <label className="mb-3 flex items-center gap-2 font-bold text-[color:var(--text)] dark:text-white">
                <HiSparkles className="h-5 w-5 text-yellow" />
                {t.specialRequests}
              </label>
              <textarea
                className="w-full rounded-xl border-2 border-[color:var(--border)] px-4 py-3 font-medium transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-coral dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                rows={4}
                value={bookingData.specialRequests || ''}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    specialRequests: e.target.value,
                  })
                }
              />
            </div>

            {/* Summary */}
            <div className="rounded-xl border-2 border-coral/20 bg-coral/5 p-6 dark:border-coral/30 dark:bg-coral/10">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-[color:var(--text)] dark:text-white">
                <IoCheckmarkCircle className="h-6 w-6 text-coral" />
                {t.bookingSummary}
              </h3>
              <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <IoCalendar className="h-4 w-4 text-teal" />
                  <strong>{t.summaryDate}:</strong> {bookingData.selectedDate}
                </div>
                <div className="flex items-center gap-2">
                  <MdSchedule className="h-4 w-4 text-purple" />
                  <strong>{t.summaryTime}:</strong> {bookingData.selectedTime}
                </div>
                <div className="flex items-center gap-2">
                  <BiSolidGift className="h-4 w-4 text-yellow" />
                  <strong>{t.summaryPackage}:</strong> {selectedPackageLabel}
                </div>
                <div className="flex items-center gap-2">
                  <MdGroup className="h-4 w-4 text-coral" />
                  <strong>{t.summaryParticipants}:</strong> {bookingData.numberOfParticipants || '--'}
                </div>
                <div className="flex items-center gap-2">
                  <MdCalculate className="h-4 w-4 text-teal" />
                  <strong>{t.summaryEstimate}:</strong>{' '}
                  {estimatedTotalAmount !== null ? formatMoney(estimatedTotalAmount) : '--'}
                </div>
                {bookingData.gifts && bookingData.gifts.length > 0 && (
                  <div>
                    <strong>{t.summaryGifts}:</strong>{' '}
                    {bookingData.gifts.map((gift) => `${locale === 'ar' ? gift.nameAr : gift.nameEn} (${gift.scope === 'ALL_PARTICIPANTS' ? t.forAllParticipants : t.forWinningTeam})`).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="p-12 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full" style={{ background: 'var(--noon-coral-gradient)' }}>
              <IoCheckmarkCircle className="h-14 w-14 text-white" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-[color:var(--text)] dark:text-white">
              {t.confirmationTitle}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-[color:var(--text-muted)] dark:text-zinc-400">
              {t.confirmationMessage}
            </p>
            {bookingNumber ? (
              <p className="mb-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {t.bookingNumber}: {bookingNumber}
              </p>
            ) : null}
            <button
              onClick={() => router.push(`/${locale}`)}
              className="rounded-xl px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: 'var(--noon-coral-gradient)' }}
            >
              {t.backToHome}
            </button>
          </div>
        )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between border-t border-[color:var(--border)] p-6 dark:border-zinc-800">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="flex items-center gap-2 rounded-xl border-2 border-coral px-6 py-3 font-bold text-coral transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <IoClose className="h-5 w-5" />
              {t.back}
            </button>
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  loading ||
                  (currentStep === 1 &&
                    (!bookingData.selectedDate || !bookingData.selectedTime)) ||
                  (currentStep === 2 &&
                    (!bookingData.packageType || !isValidCompetitionParticipants(Number(bookingData.numberOfParticipants), bookingData.packageType)))
                }
                className="flex items-center gap-2 rounded-xl px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: 'var(--noon-coral-gradient)' }}
              >
                {t.next}
                <IoCheckmarkCircle className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !bookingData.fullName ||
                  !bookingData.email ||
                  !bookingData.phoneNumber ||
                  !bookingData.numberOfParticipants
                }
                className="flex items-center gap-2 rounded-xl px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: 'var(--noon-purple-gradient)' }}
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    {t.loading}
                  </>
                ) : (
                  <>
                    <IoTrophy className="h-5 w-5" />
                    {t.submit}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
