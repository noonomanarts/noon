'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/lib/locale';

type SessionItem = {
  id: string;
  startTime: string;
  endTime: string | null;
  seatsTotal: number | null;
  seatsBooked: number;
  seatsAvailable: number;
};

type Participant = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
};

type CurrentUserLite = {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  preferredLanguage: 'ENGLISH' | 'ARABIC';
};

type WalletPayload = {
  balance: number;
  available_balance: number;
  currency: string;
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
  };
  wallet: {
    balance: number;
    available_balance: number;
    currency: string;
  };
};

function splitFullName(fullName: string): { firstName: string; middleName: string; lastName: string } {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) {
    return {
      firstName: tokens[0] ?? '',
      middleName: '',
      lastName: '',
    };
  }
  if (tokens.length === 2) {
    return {
      firstName: tokens[0],
      middleName: '',
      lastName: tokens[1],
    };
  }

  return {
    firstName: tokens[0],
    middleName: tokens.slice(1, -1).join(' '),
    lastName: tokens[tokens.length - 1],
  };
}

function emptyParticipant(): Participant {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    preferredLanguage: 'en',
  };
}

function buildSelfParticipant(user: CurrentUserLite): Participant {
  const parts = splitFullName(user.fullName);
  const normalizedDob = user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '';
  return {
    firstName: parts.firstName,
    middleName: parts.middleName,
    lastName: parts.lastName,
    dateOfBirth: normalizedDob,
    preferredLanguage: user.preferredLanguage === 'ARABIC' ? 'ar' : 'en',
  };
}

function formatSessionDate(locale: Locale, rawDate: string): string {
  const date = new Date(rawDate);
  return date.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-OM', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatSessionTime(locale: Locale, rawDate: string): string {
  const date = new Date(rawDate);
  return date.toLocaleTimeString(locale === 'ar' ? 'ar-OM' : 'en-OM', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTerms(locale: Locale, isMomKid: boolean): { title: string; lines: string[] } {
  if (isMomKid) {
    return {
      title: locale === 'ar' ? 'شروط ورش الأم والطفل' : 'Mom & Kid Workshop Terms',
      lines:
        locale === 'ar'
          ? [
              'الحجز مؤكد بعد إتمام الدفع من المحفظة.',
              'يلتزم ولي الأمر بتقديم بيانات صحيحة لجميع المشاركين.',
              'في حالة عدم الحضور لا يتم استرداد نقدي، ويكون التعويض عبر رصيد المحفظة حسب سياسة نون.',
              'يجب الالتزام بتعليمات السلامة طوال مدة الورشة.',
            ]
          : [
              'Booking is confirmed only after successful wallet payment.',
              'Parent/guardian must provide accurate details for all participants.',
              'No cash refunds for no-shows; compensation is handled via wallet credit per Noon policy.',
              'All participants must follow safety instructions during the workshop.',
            ],
    };
  }

  return {
    title: locale === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions',
    lines:
      locale === 'ar'
        ? [
            'الحجز مؤكد بعد إتمام الدفع من المحفظة.',
            'إلغاء الحجز يتم وفق سياسة نون، وأي تعويض يكون عبر رصيد المحفظة.',
            'يجب حضور جميع المشاركين في الوقت المحدد للجلسة.',
            'الموافقة على هذه الشروط إلزامية قبل الدفع.',
          ]
        : [
            'Booking is confirmed only after successful wallet payment.',
            'Cancellations follow Noon policy; compensation is handled via wallet credit.',
            'All participants must attend at the scheduled session time.',
            'Accepting these terms is required before payment.',
          ],
  };
}

export default function ClassBookingClient({
  locale,
  slug,
  classData,
  sessions,
  initialSessionId,
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
  };
  sessions: SessionItem[];
  initialSessionId?: string;
  currentUser: CurrentUserLite;
}) {
  const isArabic = locale === 'ar';
  const searchParams = useSearchParams();
  const selfDefaultParticipant = useMemo(() => buildSelfParticipant(currentUser), [currentUser]);
  const defaultSessionId =
    (initialSessionId && sessions.some((session) => session.id === initialSessionId) ? initialSessionId : null) ??
    sessions.find((session) => session.seatsAvailable > 0)?.id ??
    sessions[0]?.id ??
    '';
  const [bookingFor, setBookingFor] = useState<'self' | 'other'>('self');
  const [participantCount, setParticipantCount] = useState(1);
  const [participants, setParticipants] = useState<Participant[]>([selfDefaultParticipant]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(defaultSessionId);
  const [specialRequests, setSpecialRequests] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const seatsAvailable = selectedSession?.seatsAvailable ?? 0;
  const hasBookableSeats = seatsAvailable > 0;
  const maxParticipantsAllowed = Math.max(0, Math.min(10, seatsAvailable));
  const participantOptionMax = Math.max(1, maxParticipantsAllowed);
  const totalAmount = Number((classData.price * participantCount).toFixed(3));
  const hasEnoughBalance = (wallet?.available_balance ?? 0) >= totalAmount;
  const isMomKid = classData.subCategory === 'MOM_AND_KID';
  const terms = getTerms(locale, isMomKid);

  const t = {
    title: isArabic ? 'إتمام حجز الدورة' : 'Complete Class Booking',
    subtitle: isArabic ? 'حدد المشاركين وأكد الشروط ثم ادفع من المحفظة.' : 'Set participants, accept terms, then pay with wallet.',
    session: isArabic ? 'موعد الجلسة' : 'Session',
    bookingFor: isArabic ? 'نوع التسجيل' : 'Registration Type',
    self: isArabic ? 'أنا أحضر هذه الدورة' : 'I am attending this class',
    other: isArabic ? 'أسجل نيابة عن شخص آخر' : 'I am registering on behalf of someone else',
    participantsCount: isArabic ? 'عدد المشاركين' : 'Number of Participants',
    participants: isArabic ? 'بيانات المشاركين' : 'Participants Details',
    participant: isArabic ? 'مشارك' : 'Participant',
    firstName: isArabic ? 'الاسم الأول' : 'First Name',
    middleName: isArabic ? 'الاسم الأوسط' : 'Middle Name',
    lastName: isArabic ? 'الاسم الأخير' : 'Last Name',
    dateOfBirth: isArabic ? 'تاريخ الميلاد' : 'Date of Birth',
    preferredLanguage: isArabic ? 'اللغة المفضلة' : 'Preferred Language',
    specialRequests: isArabic ? 'ملاحظات / طلبات خاصة' : 'Special Requests / Notes',
    agree: isArabic ? 'أوافق على الشروط والأحكام' : 'I agree to the terms and conditions',
    walletBalance: isArabic ? 'رصيد المحفظة المتاح' : 'Available Wallet Balance',
    total: isArabic ? 'الإجمالي' : 'Total',
    submit: isArabic ? 'تأكيد ودفع الحجز' : 'Confirm & Pay Booking',
    processing: isArabic ? 'جاري المعالجة...' : 'Processing...',
    topupTitle: isArabic ? 'شحن المحفظة' : 'Top Up Wallet',
    topupAction: isArabic ? 'شحن الآن' : 'Top Up Now',
    topupHint: isArabic ? 'الرصيد غير كافٍ. يمكنك شحن المحفظة وإكمال الحجز مباشرة.' : 'Insufficient balance. Top up and complete booking right away.',
    successTitle: isArabic ? 'تم تأكيد الحجز بنجاح' : 'Booking Confirmed Successfully',
    bookingNumber: isArabic ? 'رقم الحجز' : 'Booking Number',
    goOrders: isArabic ? 'عرض طلباتي' : 'View My Orders',
    goClass: isArabic ? 'العودة للدورة' : 'Back to Class',
    required: isArabic ? 'يرجى إكمال جميع الحقول المطلوبة.' : 'Please complete all required fields.',
    invalidDob: isArabic ? 'تاريخ الميلاد غير صالح.' : 'Invalid date of birth.',
    termsRequired: isArabic ? 'يجب الموافقة على الشروط قبل الدفع.' : 'You must accept terms before payment.',
    seatsError: isArabic ? 'عدد المشاركين أكبر من المقاعد المتاحة في هذه الجلسة.' : 'Participants exceed available seats for this session.',
    soldOut: isArabic ? 'المقاعد مكتملة' : 'Sold out',
    noSeats: isArabic ? 'هذه الجلسة ممتلئة حالياً. اختر جلسة أخرى.' : 'This session is currently full. Please choose another session.',
    insufficient: isArabic ? 'الرصيد غير كافٍ لإتمام الدفع.' : 'Insufficient wallet balance.',
  };

  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const response = await fetch('/api/wallet/balance', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load wallet');
      }
      setWallet(payload as WalletPayload);
    } catch (walletError) {
      setError(walletError instanceof Error ? walletError.message : 'Failed to load wallet');
      setWallet(null);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    const next: Participant[] = Array.from({ length: participantCount }, (_, index) => {
      const previous = participants[index];
      if (previous) return previous;
      return emptyParticipant();
    });

    if (bookingFor === 'self') {
      next[0] = selfDefaultParticipant;
    }

    setParticipants(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantCount, bookingFor, selfDefaultParticipant]);

  useEffect(() => {
    if (!selectedSession) return;
    if (maxParticipantsAllowed === 0) {
      if (participantCount !== 1) {
        setParticipantCount(1);
      }
      return;
    }

    if (participantCount > maxParticipantsAllowed) {
      setParticipantCount(maxParticipantsAllowed);
    }
  }, [maxParticipantsAllowed, participantCount, selectedSession]);

  useEffect(() => {
    const topupStatus = searchParams.get('topup');
    if (!topupStatus) return;

    if (topupStatus === 'paid') {
      setMessage(isArabic ? 'تم شحن المحفظة بنجاح.' : 'Wallet topped up successfully.');
      setError(null);
      void loadWallet();
      return;
    }

    if (topupStatus === 'failed') {
      setError(isArabic ? 'فشلت عملية شحن المحفظة.' : 'Wallet top-up failed.');
      return;
    }

    if (topupStatus === 'cancelled') {
      setError(isArabic ? 'تم إلغاء عملية شحن المحفظة.' : 'Wallet top-up was cancelled.');
    }
  }, [isArabic, loadWallet, searchParams]);

  const updateParticipant = (index: number, key: keyof Participant, value: string) => {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [key]: key === 'preferredLanguage' ? (value as 'en' | 'ar') : value,
      };
      return next;
    });
  };

  const validateParticipants = (): boolean => {
    if (!selectedSession) {
      setError(t.seatsError);
      return false;
    }
    if (selectedSession.seatsAvailable <= 0) {
      setError(t.noSeats);
      return false;
    }
    if (participantCount > selectedSession.seatsAvailable) {
      setError(t.seatsError);
      return false;
    }

    for (const participant of participants) {
      if (
        participant.firstName.trim().length === 0 ||
        participant.lastName.trim().length === 0 ||
        participant.dateOfBirth.trim().length === 0
      ) {
        setError(t.required);
        return false;
      }

      const dob = new Date(participant.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(dob.getTime()) || dob.getTime() > today.getTime()) {
        setError(t.invalidDob);
        return false;
      }
    }

    if (!termsAccepted) {
      setError(t.termsRequired);
      return false;
    }

    if (!hasEnoughBalance) {
      setError(t.insufficient);
      return false;
    }

    return true;
  };

  const handleTopup = async () => {
    setError(null);
    setMessage(null);

    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(isArabic ? 'مبلغ الشحن غير صحيح.' : 'Invalid top-up amount.');
      return;
    }

    setTopupLoading(true);
    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          gateway: 'SANDBOX_GATEWAY',
          metadata: {
            source: 'class_booking',
            classId: classData.id,
            sessionId: selectedSessionId,
            locale,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to top up wallet');
      }

      const reference = payload?.payment?.reference as string | undefined;
      if (!reference) {
        throw new Error(isArabic ? 'مرجع الدفع غير متوفر.' : 'Payment reference is missing.');
      }

      const returnUrl = `/${locale}/classes/${slug}/book?session=${selectedSessionId}`;
      window.location.href = `/${locale}/wallet/topup/sandbox?reference=${encodeURIComponent(reference)}&returnUrl=${encodeURIComponent(returnUrl)}`;
    } catch (topupError) {
      setError(topupError instanceof Error ? topupError.message : 'Failed to top up wallet');
    } finally {
      setTopupLoading(false);
    }
  };

  const submitBooking = async () => {
    setError(null);
    setMessage(null);

    if (!validateParticipants() || !selectedSession) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/public/class-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classData.id,
          sessionId: selectedSession.id,
          numberOfParticipants: participantCount,
          participants,
          termsAccepted,
          specialRequests,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success !== true) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Booking failed.');
      }

      setResult(payload as BookingResult);
      setWallet((payload as BookingResult).wallet);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Booking failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
          <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{t.successTitle}</h1>
          <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
            {t.bookingNumber}: <span className="font-semibold">{result.booking.bookingNumber}</span>
          </p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
            {t.total}: {result.booking.totalAmount.toFixed(3)} {result.booking.currency}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/account/orders`}
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t.goOrders}
            </Link>
            <Link
              href={`/${locale}/classes/${slug}`}
              className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t.goClass}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{t.title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>

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
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.session}</h2>
            <div className="mt-4 grid gap-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  disabled={session.seatsAvailable <= 0}
                  className={`rounded-lg border p-3 text-start transition ${
                    selectedSessionId === session.id
                      ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-200 dark:bg-zinc-800/60'
                      : session.seatsAvailable <= 0
                        ? 'cursor-not-allowed border-zinc-200 opacity-60 dark:border-zinc-700'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-500'
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatSessionDate(locale, session.startTime)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {formatSessionTime(locale, session.startTime)} •{' '}
                    {session.seatsAvailable > 0
                      ? `${session.seatsAvailable} ${isArabic ? 'مقعد متاح' : 'seats available'}`
                      : t.soldOut}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.bookingFor}</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                <input type="radio" checked={bookingFor === 'self'} onChange={() => setBookingFor('self')} />
                <span>{t.self}</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                <input type="radio" checked={bookingFor === 'other'} onChange={() => setBookingFor('other')} />
                <span>{t.other}</span>
              </label>
            </div>

            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-300">{t.participantsCount}</span>
              <select
                value={participantCount}
                onChange={(event) => setParticipantCount(Number(event.target.value))}
                disabled={!hasBookableSeats}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {Array.from({ length: participantOptionMax }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            {!hasBookableSeats && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{t.noSeats}</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.participants}</h2>
            <div className="mt-4 space-y-5">
              {participants.map((participant, index) => (
                <div key={`participant-${index}`} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.participant} {index + 1}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input
                      value={participant.firstName}
                      onChange={(event) => updateParticipant(index, 'firstName', event.target.value)}
                      placeholder={t.firstName}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      value={participant.middleName}
                      onChange={(event) => updateParticipant(index, 'middleName', event.target.value)}
                      placeholder={t.middleName}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      value={participant.lastName}
                      onChange={(event) => updateParticipant(index, 'lastName', event.target.value)}
                      placeholder={t.lastName}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      type="date"
                      value={participant.dateOfBirth}
                      onChange={(event) => updateParticipant(index, 'dateOfBirth', event.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <select
                      value={participant.preferredLanguage}
                      onChange={(event) => updateParticipant(index, 'preferredLanguage', event.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                      <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{terms.title}</h2>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-zinc-600 dark:text-zinc-300">
              {terms.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              <Link href={`/${locale}/terms`} className="underline">
                {isArabic ? 'قراءة صفحة الشروط الكاملة' : 'Read full terms page'}
              </Link>
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5" />
              <span>{t.agree}</span>
            </label>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-300">{t.specialRequests}</span>
              <textarea
                rows={4}
                value={specialRequests}
                onChange={(event) => setSpecialRequests(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isArabic && classData.titleAr ? classData.titleAr : classData.title}
          </h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center justify-between">
              <span>{t.participantsCount}</span>
              <span className="font-semibold">{participantCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t.walletBalance}</span>
              <span className="font-semibold">
                {loadingWallet ? '...' : `${(wallet?.available_balance ?? 0).toFixed(3)} ${wallet?.currency ?? classData.currency}`}
              </span>
            </div>
            <div className="border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
              <div className="flex items-center justify-between">
                <span>{t.total}</span>
                <span>{totalAmount.toFixed(3)} {classData.currency}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void submitBooking()}
            disabled={processing || loadingWallet || !selectedSession || !hasBookableSeats || !hasEnoughBalance}
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {processing ? t.processing : t.submit}
          </button>

          {!hasEnoughBalance && hasBookableSeats && !loadingWallet && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{t.topupTitle}</h3>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{t.topupHint}</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-emerald-800 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => void handleTopup()}
                  disabled={topupLoading}
                  className="inline-flex shrink-0 rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                >
                  {topupLoading ? t.processing : t.topupAction}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
