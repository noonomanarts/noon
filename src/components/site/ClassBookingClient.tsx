'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import type { Gender } from '@/lib/db/types';
import { getAmwalCheckoutErrorPayload, startAmwalCheckout } from '@/lib/amwalClient';

const DISPLAY_TIMEZONE = 'Asia/Muscat';

type Participant = {
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
  gender: Gender | '';
};

type ParticipantWithPartner = Participant & {
  partner: Participant | null;
};

type RegistrationType = 'self' | 'other' | 'both';
type BookingPaymentMethod = 'ONLINE' | 'WALLET';
type CurrentUserLite = {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  preferredLanguage: 'ENGLISH' | 'ARABIC';
};

type BookingResult = {
  success: true;
  booking: {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    currency: string;
    numberOfParticipants: number;
    classTitle: string;
    paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
    promoCode?: string | null;
  };
  wallet?: {
    balance: number;
    available_balance: number;
    currency: string;
  };
};

type WalletPayload = {
  balance: number;
  available_balance: number;
  currency: string;
};

type BookingSubmitPayload = {
  success?: boolean;
  error?: string;
  booking?: BookingResult['booking'];
  wallet?: BookingResult['wallet'];
  checkout?: {
    scriptUrl: string;
    config: Record<string, unknown>;
    reference?: string;
  };
};

function emptyParticipant(): ParticipantWithPartner {
  return {
    fullName: '',
    dateOfBirth: '',
    preferredLanguage: 'en',
    gender: '',
    partner: null,
  };
}

function buildSelfParticipant(user: CurrentUserLite): ParticipantWithPartner {
  return {
    fullName: user.fullName.trim(),
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
    preferredLanguage: user.preferredLanguage === 'ARABIC' ? 'ar' : 'en',
    gender: user.gender ?? '',
    partner: null,
  };
}

function emptyPartner(): Participant {
  return {
    fullName: '',
    dateOfBirth: '',
    preferredLanguage: 'en',
    gender: '',
  };
}

function participantMatchesAudience(audienceGender: string | null | undefined, gender: Gender | '') {
  if (!gender) return false;
  if (!audienceGender || audienceGender === 'MIXED') return true;
  if (audienceGender === 'MALE_ONLY') return gender === 'MALE';
  if (audienceGender === 'FEMALE_ONLY') return gender === 'FEMALE';
  return true;
}

function calculateAgeFromDateString(dateOfBirth: string, today: Date): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export default function ClassBookingClient({
  locale,
  slug,
  classData,
  currentUser,
}: {
  locale: Locale;
  slug: string;
  classData: {
    id: string;
    title: string;
    titleAr: string | null;
    price: number;
    currency: string;
    subCategory: string | null;
    audienceGender?: 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED' | null;
    minimumAge?: number | null;
    maximumAge?: number | null;
    startDateTime: string | null;
    endDateTime: string | null;
    registrationCloseAt?: string | null;
    scheduleSessions?: Array<{ startDateTime: string; endDateTime: string }>;
    summerCampHasPriorBooking?: boolean;
    seatsTotal: number;
    seatsBooked: number;
  };
  currentUser: CurrentUserLite;
}) {
  const isArabic = locale === 'ar';
  const isSummerCamp = classData.subCategory === 'SUMMER_CAMP';
  const [selfParticipant, setSelfParticipant] = useState<ParticipantWithPartner>(() => buildSelfParticipant(currentUser));
  const [bookingFor, setBookingFor] = useState<RegistrationType>(isSummerCamp ? 'other' : 'self');
  const [otherCount, setOtherCount] = useState(1);
  const [otherParticipants, setOtherParticipants] = useState<ParticipantWithPartner[]>([emptyParticipant()]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('ONLINE');
  const [wallet, setWallet] = useState<WalletPayload | null>(null);

  const seatsAvailable = Math.max(0, classData.seatsTotal - classData.seatsBooked);
  const hasBookableSeats = seatsAvailable > 0;

  const selfIncluded = bookingFor === 'self' || bookingFor === 'both';
  const othersIncluded = bookingFor === 'other' || bookingFor === 'both';
  const paidParticipants = (selfIncluded ? 1 : 0) + (othersIncluded ? otherCount : 0);
  const allParticipants: ParticipantWithPartner[] = useMemo(() => {
    const list: ParticipantWithPartner[] = [];
    if (selfIncluded) list.push(selfParticipant);
    if (othersIncluded) list.push(...otherParticipants.slice(0, otherCount));
    return list;
  }, [selfIncluded, othersIncluded, selfParticipant, otherParticipants, otherCount]);
  const payableParticipants = allParticipants.map(({ fullName, dateOfBirth, preferredLanguage, gender }) => ({
    fullName,
    dateOfBirth,
    preferredLanguage,
    gender,
  }));
  const freePartners = allParticipants
    .map((participant) => participant.partner)
    .filter((partner): partner is Participant => Boolean(partner));

  const maxOthersAllowed = Math.max(0, Math.min(10, seatsAvailable) - (selfIncluded ? 1 : 0));
  const otherOptionMax = Math.max(1, maxOthersAllowed);
  const totalAmount = Number((classData.price * paidParticipants).toFixed(3));
  const isMomKid = classData.subCategory === 'MOM_AND_KID';
  const summerCampDiscountAmount = isSummerCamp && (paidParticipants >= 2 || classData.summerCampHasPriorBooking) ? Number((totalAmount * 0.1).toFixed(3)) : 0;
  const payableTotalAmount = Number(Math.max(0, totalAmount - summerCampDiscountAmount).toFixed(3));
  const walletBalance = wallet?.balance ?? 0;
  const walletHasEnoughBalance = walletBalance >= payableTotalAmount;
  const classDateLabel = classData.startDateTime
    ? new Date(classData.startDateTime).toLocaleString(isArabic ? 'ar-OM-u-nu-latn' : 'en-OM', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: DISPLAY_TIMEZONE,
      })
    : null;

  const calculateAge = useCallback((dateOfBirth: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calculateAgeFromDateString(dateOfBirth, today);
  }, []);

  const needsFreePartner = useCallback(
    (dateOfBirth: string) => {
      if (isSummerCamp) return false;
      if (!dateOfBirth) return false;
      const dob = new Date(`${dateOfBirth}T00:00:00`);
      if (Number.isNaN(dob.getTime())) return false;
      const age = calculateAge(dateOfBirth);
      return age >= 5 && age <= 9;
    },
    [calculateAge, isSummerCamp]
  );

  const t = {
    title: isArabic ? 'إتمام حجز الدورة' : 'Complete Class Booking',
    subtitle: isArabic
      ? 'اختَر عدد المقاعد وأكمِل البيانات الأساسية فقط.'
      : 'Choose seats and complete only the essential details.',
    classDate: isArabic ? 'موعد الدورة' : 'Class Date',
    seats: isArabic ? 'عدد المقاعد' : 'Seats',
    attendeeOne: isArabic ? 'بياناتك' : 'Your seat',
    attendeeExtra: isArabic ? 'مشارك إضافي' : 'Additional attendee',
    simpleHint: isArabic ? 'اختاري طريقة الدفع ثم أكدي الحجز.' : 'Choose a payment method, then confirm your booking.',
    bookingFor: isArabic ? 'نوع التسجيل' : 'Registration Type',
    audience: isArabic ? 'الفئة المناسبة' : 'Audience',
    audienceMixed: isArabic ? 'مشترك' : 'Mixed',
    audienceWomen: isArabic ? 'للنساء فقط' : 'Women only',
    audienceMen: isArabic ? 'للرجال فقط' : 'Men only',
    self: isArabic ? 'أنا أحضر هذه الدورة' : 'I am attending this class',
    other: isArabic ? 'أسجل نيابة عن شخص آخر' : 'I am registering on behalf of someone else',
    both: isArabic ? 'أنا أحضر وأسجل أيضاً نيابة عن شخص آخر' : 'I am attending this class and registering on behalf of someone else',
    momKidOther: isArabic ? 'أسجل أطفالي' : "I'm registering my kids",
    participantsCount: isArabic ? 'عدد المشاركين الإضافيين' : 'Number of Participants',
    participantsCountMomKid: isArabic ? 'عدد المشاركين' : 'Number of Participants',
    participants: isArabic ? 'بيانات المشاركين' : 'Participants Details',
    participant: isArabic ? 'مشارك' : 'Participant',
    partnerDetails: isArabic ? 'بيانات الشريك المجاني' : 'Free Partner Details',
    fullName: isArabic ? 'الاسم الكامل' : 'Full Name',
    dateOfBirth: isArabic ? 'تاريخ الميلاد' : 'Date of Birth',
    gender: isArabic ? 'الجنس' : 'Gender',
    preferredLanguage: isArabic ? 'اللغة المفضلة' : 'Preferred Language',
    specialRequests: isArabic ? 'ملاحظات / طلبات خاصة' : 'Special Requests / Notes',
    agree: isArabic ? 'أوافق على الشروط والأحكام' : 'I agree to the terms and conditions',
    total: isArabic ? 'الإجمالي' : 'Total',
    subtotal: isArabic ? 'الإجمالي قبل الخصم' : 'Subtotal',
    summerCampDiscount: isArabic ? 'خصم المخيم الصيفي' : 'Summer Camp discount',
    summerCampFuturePromo: isArabic
      ? 'حجز طفل واحد يحصل على كود خصم 10% للاستخدام القادم بعد إتمام الدفع.'
      : 'One-child bookings receive a 10% promo code for future use after payment.',
    cartHint: isArabic ? 'يمكنك الدفع الآن أو استخدام رصيد المحفظة إذا كان كافياً.' : 'Pay now, or use wallet credit when your balance is enough.',
    paymentMethod: isArabic ? 'طريقة الدفع' : 'Payment Method',
    payNow: isArabic ? 'الدفع الآن' : 'Pay now',
    payNowHint: isArabic ? 'افتحي بوابة الدفع لإتمام الحجز.' : 'Open the payment gateway to complete this booking.',
    walletCredit: isArabic ? 'استخدام رصيد المحفظة' : 'Use wallet credit',
    walletCreditHint: isArabic ? 'متاح فقط عندما يغطي رصيد المحفظة كامل المبلغ.' : 'Available only when your wallet covers the full amount.',
    walletBalance: isArabic ? 'رصيد المحفظة' : 'Wallet balance',
    walletInsufficient: isArabic ? 'رصيد المحفظة غير كافٍ لهذا الحجز.' : 'Wallet balance is not enough for this booking.',
    topupInAccount: isArabic ? 'شحن المحفظة من الحساب' : 'Top up in account',
    submit: isArabic ? 'تأكيد الحجز' : 'Confirm booking',
    processing: isArabic ? 'جاري المعالجة...' : 'Processing...',
    successTitle: isArabic ? 'تم تأكيد الحجز' : 'Booking confirmed',
    bookingNumber: isArabic ? 'رقم الحجز' : 'Booking Number',
    goOrders: isArabic ? 'عرض حجوزاتي' : 'View My Bookings',
    goClass: isArabic ? 'العودة للدورة' : 'Back to Class',
    required: isArabic ? 'يرجى إكمال بيانات كل مشارك.' : 'Please complete each participant entry.',
    genderRequired: isArabic ? 'يرجى تحديد الجنس لكل مشارك.' : 'Please select a gender for each participant.',
    audienceMismatch: isArabic ? 'أحد المشاركين لا يطابق فئة الجنس المسموح بها لهذه الدورة.' : 'A participant does not match this class gender eligibility.',
    invalidDob: isArabic ? 'تاريخ الميلاد غير صالح.' : 'Invalid date of birth.',
    termsRequired: isArabic ? 'يجب الموافقة على الشروط قبل الدفع.' : 'You must accept terms before payment.',
    seatsError: isArabic ? 'عدد المشاركين أكبر من المقاعد المتاحة.' : 'Participants exceed available seats.',
    soldOut: isArabic ? 'المقاعد مكتملة' : 'Sold out',
    noSeats: isArabic ? 'المقاعد ممتلئة حالياً.' : 'This class is currently full.',
    yourDetails: isArabic ? 'بياناتك (تلقائية)' : 'Your Details (auto-filled)',
    yourPartnerDetails: isArabic ? 'بيانات الشريك المجاني' : 'Free Partner Details',
    ageTooYoung: isArabic
      ? `عمر أحد المشاركين أقل من الحد الأدنى المطلوب (${classData.minimumAge ?? 0} سنة).`
      : `A participant is below the minimum age requirement (${classData.minimumAge ?? 0} years).`,
    ageTooOld: isArabic
      ? `عمر أحد المشاركين أكبر من الحد الأقصى المسموح (${classData.maximumAge ?? 0} سنة).`
      : `A participant is above the maximum age limit (${classData.maximumAge ?? 0} years).`,
    momKidPolicy: isArabic
      ? 'من عمر 10 سنوات فأكثر يمكنه العمل بمفرده. الأطفال من 5 إلى 9 سنوات يحتاجون شريكاً مجانياً، ويجب تسجيل الاسمين. الأطفال أقل من 5 سنوات غير مقبولين.'
      : 'Anyone aged 10+ can work alone. Children aged 5-9 need one free partner, and both names must be registered. Children under 5 are not accepted.',
    momKidUnderFive: isArabic
      ? 'لا نقبل الأطفال أقل من 5 سنوات في هذه الورشة.'
      : 'Children under 5 are not accepted in this workshop.',
    momKidPartnerRequired: isArabic
      ? 'الأطفال بعمر 5-9 سنوات يحتاجون شريكاً بعمر 10+ مع تسجيل الاسمين.'
      : 'Children aged 5-9 must be registered with a 10+ partner, and both names must be provided.',
  };

  useEffect(() => {
    setSelfParticipant(buildSelfParticipant(currentUser));
  }, [currentUser]);

  useEffect(() => {
    let active = true;

    void fetch('/api/wallet/balance', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as WalletPayload;
      })
      .then((payload) => {
        if (active && payload) {
          setWallet(payload);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (paymentMethod === 'WALLET' && !walletHasEnoughBalance) {
      setPaymentMethod('ONLINE');
    }
  }, [paymentMethod, walletHasEnoughBalance]);

  useEffect(() => {
    if (!isMomKid && !isSummerCamp && bookingFor === 'both' && seatsAvailable < 2) {
      setBookingFor('self');
    }
  }, [isMomKid, isSummerCamp, bookingFor, seatsAvailable]);

  useEffect(() => {
    // Summer camp: only 'other' is valid
    if (isSummerCamp && bookingFor !== 'other') {
      setBookingFor('other');
    }
    // MomKid: 'both' is not a valid option, fall back to 'other'
    if (isMomKid && bookingFor === 'both') {
      setBookingFor('other');
    }
  }, [bookingFor, isMomKid, isSummerCamp]);

  useEffect(() => {
    if (!selfIncluded || !isMomKid || !needsFreePartner(selfParticipant.dateOfBirth)) {
      setSelfParticipant((current) => ({ ...current, partner: null }));
    }
  }, [isMomKid, needsFreePartner, selfParticipant.dateOfBirth, selfIncluded]);

  /* Keep otherParticipants array in sync with otherCount */
  useEffect(() => {
    setOtherParticipants((prev) => {
      const next: ParticipantWithPartner[] = Array.from({ length: otherCount }, (_, i) => {
        const current = prev[i] ?? emptyParticipant();
        return needsFreePartner(current.dateOfBirth)
          ? current
          : {
              ...current,
              partner: null,
            };
      });
      return next;
    });
  }, [needsFreePartner, otherCount]);

  /* Clamp otherCount when seats change */
  useEffect(() => {
    if (maxOthersAllowed === 0 && otherCount !== 1) {
      setOtherCount(1);
      return;
    }
    if (otherCount > maxOthersAllowed) {
      setOtherCount(Math.max(1, maxOthersAllowed));
    }
  }, [maxOthersAllowed, otherCount]);

  const audienceLabel =
    classData.audienceGender === 'FEMALE_ONLY'
      ? t.audienceWomen
      : classData.audienceGender === 'MALE_ONLY'
        ? t.audienceMen
        : t.audienceMixed;

  const updateOtherParticipant = (index: number, key: keyof Participant, value: string) => {
    setOtherParticipants((prev) => {
      const next = [...prev];
      const current = next[index] ?? emptyParticipant();
      const updated = {
        ...current,
        [key]: value,
      };
      next[index] =
        key === 'dateOfBirth' && !needsFreePartner(String(value))
          ? {
              ...updated,
              partner: null,
            }
          : updated;
      return next;
    });
  };

  const updateOtherPartner = (index: number, key: keyof Participant, value: string) => {
    setOtherParticipants((prev) => {
      const next = [...prev];
      const current = next[index] ?? emptyParticipant();
      next[index] = {
        ...current,
        partner: {
          ...(current.partner ?? emptyPartner()),
          [key]: value,
        },
      };
      return next;
    });
  };

  const setSelfPartnerValue = (key: keyof Participant, value: string) => {
    setSelfParticipant((prev) => ({
      ...prev,
      partner: {
        ...(prev.partner ?? emptyPartner()),
        [key]: value,
      },
    }));
  };

  const updateSelfParticipant = (key: keyof Participant, value: string) => {
    setSelfParticipant((prev) => {
      const next = { ...prev, [key]: value };
      return key === 'dateOfBirth' && !needsFreePartner(String(value))
        ? { ...next, partner: null }
        : next;
    });
  };

  const validateParticipants = (): boolean => {
    if (seatsAvailable <= 0) {
      setError(t.noSeats);
      return false;
    }
    if (paidParticipants > seatsAvailable) {
      setError(t.seatsError);
      return false;
    }

    for (const participant of allParticipants) {
      if (participant.fullName.trim().length === 0 || participant.dateOfBirth.trim().length === 0) {
        setError(t.required);
        return false;
      }

      if (!participant.gender) {
        setError(t.genderRequired);
        return false;
      }

      if (!participantMatchesAudience(classData.audienceGender, participant.gender)) {
        setError(t.audienceMismatch);
        return false;
      }

      const dob = new Date(participant.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(dob.getTime()) || dob.getTime() > today.getTime()) {
        setError(t.invalidDob);
        return false;
      }

      if (classData.minimumAge != null && classData.minimumAge > 0) {
        const age = calculateAgeFromDateString(participant.dateOfBirth, today);
        if (age < classData.minimumAge) {
          setError(t.ageTooYoung);
          return false;
        }
        if (classData.maximumAge != null && classData.maximumAge > 0 && age > classData.maximumAge) {
          setError(t.ageTooOld);
          return false;
        }
      } else if (classData.maximumAge != null && classData.maximumAge > 0) {
        const age = calculateAgeFromDateString(participant.dateOfBirth, today);
        if (age > classData.maximumAge) {
          setError(t.ageTooOld);
          return false;
        }
      }
    }

    if (isMomKid) {
      for (const participant of allParticipants) {
        const age = calculateAge(participant.dateOfBirth);
        if (age < 5) {
          setError(t.momKidUnderFive);
          return false;
        }
        if (age >= 5 && age <= 9) {
          const partner = participant.partner;
          if (
            !partner
            || partner.fullName.trim().length === 0
            || partner.dateOfBirth.trim().length === 0
          ) {
            setError(t.momKidPartnerRequired);
            return false;
          }

          if (!partner.gender) {
            setError(t.genderRequired);
            return false;
          }

          if (!participantMatchesAudience(classData.audienceGender, partner.gender)) {
            setError(t.audienceMismatch);
            return false;
          }

          const partnerDob = new Date(`${partner.dateOfBirth}T00:00:00`);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (Number.isNaN(partnerDob.getTime()) || partnerDob.getTime() > today.getTime()) {
            setError(t.invalidDob);
            return false;
          }

          if (calculateAge(partner.dateOfBirth) < 10) {
            setError(t.momKidPartnerRequired);
            return false;
          }
        }
      }
    }

    if (!termsAccepted) {
      setError(t.termsRequired);
      return false;
    }

    return true;
  };

  const saveSelfGender = useCallback(() => {
    if (selfIncluded && selfParticipant.gender && !currentUser.gender) {
      void fetch('/api/account/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: selfParticipant.gender }),
      }).catch(() => {});
    }
  }, [selfIncluded, selfParticipant.gender, currentUser.gender]);

  const saveOtherParticipants = useCallback(() => {
    if (!othersIncluded) {
      return;
    }

    for (const participant of otherParticipants.slice(0, otherCount)) {
      if (participant.fullName.trim()) {
        void fetch('/api/public/saved-participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: participant.fullName.trim(),
            dateOfBirth: participant.dateOfBirth,
            preferredLanguage: participant.preferredLanguage,
            gender: participant.gender,
          }),
        }).catch(() => {});
      }
    }
  }, [otherCount, otherParticipants, othersIncluded]);

  const submitBooking = async () => {
    setError(null);
    setMessage(null);

    if (!validateParticipants()) {
      return;
    }

    setProcessing(true);
    try {
      if (paymentMethod === 'WALLET' && !walletHasEnoughBalance) {
        setError(t.walletInsufficient);
        return;
      }

      const response = await fetch('/api/public/class-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classData.id,
          locale,
          paymentMethod,
          numberOfParticipants: paidParticipants,
          participants: payableParticipants,
          freePartners,
          specialRequests,
          termsAccepted,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as BookingSubmitPayload;
      if (!response.ok || payload?.success !== true) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Booking failed.');
      }

      if (payload.checkout && payload.booking) {
        const reference = payload.checkout.reference || payload.booking.bookingNumber;
        setMessage(isArabic ? 'جاري فتح نافذة الدفع...' : 'Opening payment window...');

        await startAmwalCheckout({
          checkout: payload.checkout,
          onComplete: async (gatewayPayload) => {
            const callbackResponse = await fetch('/api/public/class-bookings/payment/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference, gatewayPayload }),
            });
            const callbackPayload = (await callbackResponse.json().catch(() => ({}))) as BookingSubmitPayload & {
              paymentStatus?: string;
            };

            if (!callbackResponse.ok || callbackPayload.paymentStatus !== 'PAID' || !callbackPayload.booking) {
              throw new Error(callbackPayload.error || (isArabic ? 'فشل تأكيد الدفع.' : 'Failed to confirm payment.'));
            }

            setResult({
              success: true,
              booking: callbackPayload.booking,
            });
          },
          onCancel: () => {
            setError(isArabic ? 'تم إلغاء الدفع.' : 'Payment was cancelled.');
          },
          onError: async (gatewayPayload) => {
            await fetch('/api/public/class-bookings/payment/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference, gatewayPayload: getAmwalCheckoutErrorPayload(gatewayPayload) }),
            }).catch(() => undefined);

            setError(isArabic ? 'فشل الدفع. يرجى المحاولة مرة أخرى.' : 'Payment failed. Please try again.');
          },
        });

        saveSelfGender();
        saveOtherParticipants();
        return;
      }

      if (!payload.booking) {
        throw new Error(isArabic ? 'بيانات الحجز غير مكتملة.' : 'Booking response is incomplete.');
      }

      setResult({
        success: true,
        booking: payload.booking,
        wallet: payload.wallet,
      });
      if (payload.wallet) {
        setWallet(payload.wallet);
      }
      saveSelfGender();
      saveOtherParticipants();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Booking failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{t.successTitle}</h1>
          {result.booking.bookingNumber ? (
            <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
              {t.bookingNumber}: <span className="font-semibold">{result.booking.bookingNumber}</span>
            </p>
          ) : null}
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
            {t.total}: {formatAmountWithCurrency(result.booking.totalAmount, result.booking.currency)}
          </p>
          {result.booking.promoCode ? (
            <p className="mt-2 rounded-xl border border-emerald-300/60 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
              {isArabic ? 'كود خصمك القادم' : 'Your future promo code'}: {result.booking.promoCode}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/account/orders`}
              className="inline-flex rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
            >
              {t.goOrders}
            </Link>
            <Link
              href={`/${locale}/classes/${slug}`}
              className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
            >
              {t.goClass}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">{t.title}</h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.seats}</h2>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {t.audience}: <span className="text-[color:var(--text)]">{audienceLabel}</span>
                </p>
              </div>
            </div>

            {isSummerCamp ? (
              <div className="mt-4">
                <label className="flex items-center gap-2 rounded-xl border border-[color:var(--primary)] bg-[color:var(--primary)]/5 px-3 py-2.5 text-sm text-[color:var(--text)]">
                  <input
                    type="radio"
                    name="registrationType"
                    checked
                    readOnly
                  />
                  <span>{t.momKidOther}</span>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 mt-3 block text-[color:var(--text)]">{t.participantsCountMomKid}</span>
                  <select
                    value={otherCount}
                    onChange={(event) => setOtherCount(Number(event.target.value))}
                    disabled={!hasBookableSeats}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
                  >
                    {Array.from({ length: Math.max(1, Math.min(10, seatsAvailable || 1)) }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : isMomKid ? (
              <div className="mt-4 grid gap-2">
                {([
                  { value: 'self' as RegistrationType, label: t.self },
                  { value: 'other' as RegistrationType, label: t.momKidOther },
                ]).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition cursor-pointer ${
                      bookingFor === opt.value
                        ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--text)]'
                        : 'border-[color:var(--border)] text-[color:var(--text)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="registrationType"
                      checked={bookingFor === opt.value}
                      onChange={() => setBookingFor(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
                {othersIncluded ? (
                  <label className="mt-2 block text-sm">
                    <span className="mb-1 block text-[color:var(--text)]">{t.participantsCountMomKid}</span>
                    <select
                      value={otherCount}
                      onChange={(event) => setOtherCount(Number(event.target.value))}
                      disabled={!hasBookableSeats}
                      className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
                    >
                      {Array.from({ length: otherOptionMax }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : (
              /* Regular classes (cooking, arts & crafts, etc.): 3 explicit options */
              <div className="mt-4 grid gap-2">
                {([
                  { value: 'self' as RegistrationType, label: t.self, disabled: !hasBookableSeats },
                  { value: 'other' as RegistrationType, label: t.other, disabled: !hasBookableSeats },
                  { value: 'both' as RegistrationType, label: t.both, disabled: seatsAvailable < 2 },
                ]).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${opt.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${
                      bookingFor === opt.value
                        ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--text)]'
                        : 'border-[color:var(--border)] text-[color:var(--text)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="registrationType"
                      checked={bookingFor === opt.value}
                      disabled={opt.disabled}
                      onChange={() => !opt.disabled && setBookingFor(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
                {othersIncluded ? (
                  <label className="mt-1 block text-sm">
                    <span className="mb-1 block text-[color:var(--text)]">{t.participantsCount}</span>
                    <select
                      value={otherCount}
                      onChange={(event) => setOtherCount(Number(event.target.value))}
                      className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
                    >
                      {Array.from({ length: Math.max(1, otherOptionMax) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            )}

            {!hasBookableSeats ? (
              <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{t.noSeats}</p>
            ) : (
              <p className="mt-3 text-xs text-[color:var(--text-muted)]">{t.simpleHint}</p>
            )}
          </div>

          {/* ── Participant Details ── */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.participants}</h2>
            {isMomKid && !isSummerCamp ? (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
                {t.momKidPolicy}
              </p>
            ) : null}
            <div className="mt-4 space-y-5">

              {/* Self participant – read-only auto-filled */}
              {selfIncluded && (
                <div className="rounded-xl border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 p-4">
                  <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{isMomKid ? t.yourDetails : t.attendeeOne}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.fullName}</span>
                      <input
                        value={selfParticipant.fullName}
                        readOnly
                        disabled
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text)] opacity-70 cursor-not-allowed"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.dateOfBirth}</span>
                      <input
                        type="date"
                        value={selfParticipant.dateOfBirth}
                        onChange={(event) => updateSelfParticipant('dateOfBirth', event.target.value)}
                        readOnly={Boolean(currentUser.dateOfBirth)}
                        disabled={Boolean(currentUser.dateOfBirth)}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--text)] ${
                          currentUser.dateOfBirth
                            ? 'bg-[color:var(--muted)] opacity-70 cursor-not-allowed'
                            : 'bg-[color:var(--surface)]'
                        }`}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.gender}</span>
                      <select
                        value={selfParticipant.gender}
                        onChange={(event) => updateSelfParticipant('gender', event.target.value)}
                        disabled={Boolean(currentUser.gender)}
                        className={`w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--text)] ${
                          currentUser.gender
                            ? 'bg-[color:var(--muted)] opacity-70 cursor-not-allowed'
                            : 'bg-[color:var(--surface)]'
                        }`}
                      >
                        <option value="">{isArabic ? 'غير محدد' : 'Not set'}</option>
                        <option value="MALE">{isArabic ? 'ذكر' : 'Male'}</option>
                        <option value="FEMALE">{isArabic ? 'أنثى' : 'Female'}</option>
                        <option value="OTHER">{isArabic ? 'أخرى' : 'Other'}</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.preferredLanguage}</span>
                      <select
                        value={selfParticipant.preferredLanguage}
                        disabled
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text)] opacity-70 cursor-not-allowed"
                      >
                        <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                        <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                      </select>
                    </label>
                  </div>
                  {isMomKid && needsFreePartner(selfParticipant.dateOfBirth) ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
                      <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.yourPartnerDetails}</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.fullName}</span>
                          <input
                            value={selfParticipant.partner?.fullName ?? ''}
                            onChange={(event) => setSelfPartnerValue('fullName', event.target.value)}
                            placeholder={t.fullName}
                            autoComplete="name"
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.dateOfBirth}</span>
                          <input
                            type="date"
                            value={selfParticipant.partner?.dateOfBirth ?? ''}
                            onChange={(event) => setSelfPartnerValue('dateOfBirth', event.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.gender}</span>
                          <select
                            value={selfParticipant.partner?.gender ?? ''}
                            onChange={(event) => setSelfPartnerValue('gender', event.target.value)}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          >
                            <option value="">{isArabic ? 'اختر الجنس' : 'Select gender'}</option>
                            <option value="MALE">{isArabic ? 'ذكر' : 'Male'}</option>
                            <option value="FEMALE">{isArabic ? 'أنثى' : 'Female'}</option>
                            <option value="OTHER">{isArabic ? 'أخرى' : 'Other'}</option>
                          </select>
                        </label>
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.preferredLanguage}</span>
                          <select
                            value={selfParticipant.partner?.preferredLanguage ?? 'en'}
                            onChange={(event) => setSelfPartnerValue('preferredLanguage', event.target.value)}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          >
                            <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                            <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Other participants – editable, with saved participants selector */}
              {othersIncluded && otherParticipants.slice(0, otherCount).map((participant, index) => (
                <div
                  key={`other-${index}`}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[color:var(--text)]">
                      {t.participant} {selfIncluded ? index + 2 : index + 1}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.fullName}</span>
                      <input
                        value={participant.fullName}
                        onChange={(event) => updateOtherParticipant(index, 'fullName', event.target.value)}
                        placeholder={t.fullName}
                        autoComplete="name"
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.dateOfBirth}</span>
                      <input
                        type="date"
                        value={participant.dateOfBirth}
                        onChange={(event) => updateOtherParticipant(index, 'dateOfBirth', event.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.gender}</span>
                      <select
                        value={participant.gender}
                        onChange={(event) => updateOtherParticipant(index, 'gender', event.target.value)}
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                      >
                        <option value="">{isArabic ? 'اختر الجنس' : 'Select gender'}</option>
                        <option value="MALE">{isArabic ? 'ذكر' : 'Male'}</option>
                        <option value="FEMALE">{isArabic ? 'أنثى' : 'Female'}</option>
                        <option value="OTHER">{isArabic ? 'أخرى' : 'Other'}</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.preferredLanguage}</span>
                      <select
                        value={participant.preferredLanguage}
                        onChange={(event) => updateOtherParticipant(index, 'preferredLanguage', event.target.value)}
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                      >
                        <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                        <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                      </select>
                    </label>
                  </div>
                  {isMomKid && needsFreePartner(participant.dateOfBirth) ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
                      <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.partnerDetails}</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.fullName}</span>
                          <input
                            value={participant.partner?.fullName ?? ''}
                            onChange={(event) => updateOtherPartner(index, 'fullName', event.target.value)}
                            placeholder={t.fullName}
                            autoComplete="name"
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.dateOfBirth}</span>
                          <input
                            type="date"
                            value={participant.partner?.dateOfBirth ?? ''}
                            onChange={(event) => updateOtherPartner(index, 'dateOfBirth', event.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.gender}</span>
                          <select
                            value={participant.partner?.gender ?? ''}
                            onChange={(event) => updateOtherPartner(index, 'gender', event.target.value)}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          >
                            <option value="">{isArabic ? 'اختر الجنس' : 'Select gender'}</option>
                            <option value="MALE">{isArabic ? 'ذكر' : 'Male'}</option>
                            <option value="FEMALE">{isArabic ? 'أنثى' : 'Female'}</option>
                            <option value="OTHER">{isArabic ? 'أخرى' : 'Other'}</option>
                          </select>
                        </label>
                        <label className="text-sm">
                          <span className="mb-1.5 block text-[color:var(--text)]">{t.preferredLanguage}</span>
                          <select
                            value={participant.partner?.preferredLanguage ?? 'en'}
                            onChange={(event) => updateOtherPartner(index, 'preferredLanguage', event.target.value)}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                          >
                            <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                            <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <label className="flex items-start gap-2 text-sm text-[color:var(--text)]">
              <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5" />
              <span>
                {isArabic ? 'أوافق على ' : 'I agree to the '}
                <Link href={`/${locale}/terms`} className="underline font-medium text-blue-600 hover:text-blue-800">
                  {isArabic ? 'الشروط والأحكام' : 'terms and conditions'}
                </Link>
              </span>
            </label>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <label className="text-sm">
              <span className="mb-1 block text-[color:var(--text)]">{t.specialRequests}</span>
              <textarea
                rows={3}
                value={specialRequests}
                onChange={(event) => setSpecialRequests(event.target.value)}
                placeholder={isArabic ? 'اختياري' : 'Optional'}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
              />
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">
            {isArabic && classData.titleAr ? classData.titleAr : classData.title}
          </h2>
          <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
            <p className="text-sm text-[color:var(--text-muted)]">{t.cartHint}</p>
            <p className="mt-2 text-xs text-[color:var(--text-subtle)]">{t.simpleHint}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-[color:var(--border)] p-4">
            <p className="text-sm font-semibold text-[color:var(--text)]">{t.paymentMethod}</p>
            <div className="mt-3 space-y-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                  paymentMethod === 'ONLINE'
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/5'
                    : 'border-[color:var(--border)]'
                }`}
              >
                <input
                  type="radio"
                  name="bookingPaymentMethod"
                  checked={paymentMethod === 'ONLINE'}
                  onChange={() => setPaymentMethod('ONLINE')}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-[color:var(--text)]">{t.payNow}</span>
                  <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">{t.payNowHint}</span>
                </span>
              </label>
              <label
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                  walletHasEnoughBalance
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed opacity-65'
                } ${
                  paymentMethod === 'WALLET'
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/5'
                    : 'border-[color:var(--border)]'
                }`}
              >
                <input
                  type="radio"
                  name="bookingPaymentMethod"
                  checked={paymentMethod === 'WALLET'}
                  onChange={() => {
                    if (walletHasEnoughBalance) setPaymentMethod('WALLET');
                  }}
                  disabled={!walletHasEnoughBalance}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-[color:var(--text)]">{t.walletCredit}</span>
                  <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">{t.walletCreditHint}</span>
                  <span className="mt-1 block text-xs text-[color:var(--text)]">
                    {t.walletBalance}: {formatAmountWithCurrency(walletBalance, wallet?.currency ?? classData.currency)}
                  </span>
                </span>
              </label>
            </div>
            {!walletHasEnoughBalance ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                <p>{t.walletInsufficient}</p>
                <Link href={`/${locale}/account/wallet`} className="mt-1 inline-flex font-semibold underline">
                  {t.topupInAccount}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="mt-4 space-y-2 text-sm text-[color:var(--text)]">
            <div className="flex items-center justify-between">
              <span>{t.classDate}</span>
              <span className="max-w-[180px] text-right font-semibold">{classDateLabel ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t.seats}</span>
              <span className="font-semibold">{paidParticipants}</span>
            </div>
            <div className="border-t border-[color:var(--border)] pt-2 text-base font-semibold text-[color:var(--text)]">
              {summerCampDiscountAmount > 0 ? (
                <>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{t.subtotal}</span>
                    <span>{formatAmountWithCurrency(totalAmount, classData.currency)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <span>{t.summerCampDiscount}</span>
                    <span>-{formatAmountWithCurrency(summerCampDiscountAmount, classData.currency)}</span>
                  </div>
                </>
              ) : null}
              <div className="mt-1 flex items-center justify-between">
                <span>{t.total}</span>
                <span>{formatAmountWithCurrency(payableTotalAmount, classData.currency)}</span>
              </div>
              {isSummerCamp && summerCampDiscountAmount === 0 ? (
                <p className="mt-2 text-xs font-normal text-[color:var(--text-subtle)]">{t.summerCampFuturePromo}</p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void submitBooking();
            }}
            disabled={processing || !hasBookableSeats}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? t.processing : t.submit}
          </button>
        </aside>
      </div>
      </div>
    </div>
  );
}
