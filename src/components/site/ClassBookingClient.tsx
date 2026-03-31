'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/lib/locale';
import ClassSessionPicker from '@/components/site/ClassSessionPicker';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

const DISPLAY_TIMEZONE = 'Asia/Muscat';

type SessionItem = {
  id: string;
  startTime: string;
  endTime: string | null;
  seatsTotal: number | null;
  seatsBooked: number;
  seatsAvailable: number;
};

type Participant = {
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
};

type SavedParticipant = {
  id: string;
  label: string | null;
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
};

type RegistrationType = 'self' | 'other' | 'both';

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

function emptyParticipant(): Participant {
  return {
    fullName: '',
    dateOfBirth: '',
    preferredLanguage: 'en',
  };
}

function buildSelfParticipant(user: CurrentUserLite): Participant {
  return {
    fullName: user.fullName.trim(),
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
    preferredLanguage: user.preferredLanguage === 'ARABIC' ? 'ar' : 'en',
  };
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
  const [bookingFor, setBookingFor] = useState<RegistrationType>('self');
  const [otherCount, setOtherCount] = useState(1);
  const [otherParticipants, setOtherParticipants] = useState<Participant[]>([emptyParticipant()]);
  const [savedList, setSavedList] = useState<SavedParticipant[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
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

  const selfIncluded = bookingFor === 'self' || bookingFor === 'both';
  const othersIncluded = bookingFor === 'other' || bookingFor === 'both';
  const totalParticipants = (selfIncluded ? 1 : 0) + (othersIncluded ? otherCount : 0);
  const allParticipants: Participant[] = useMemo(() => {
    const list: Participant[] = [];
    if (selfIncluded) list.push(selfDefaultParticipant);
    if (othersIncluded) list.push(...otherParticipants.slice(0, otherCount));
    return list;
  }, [selfIncluded, othersIncluded, selfDefaultParticipant, otherParticipants, otherCount]);

  const maxOthersAllowed = Math.max(0, Math.min(10, seatsAvailable) - (selfIncluded ? 1 : 0));
  const otherOptionMax = Math.max(1, maxOthersAllowed);
  const totalAmount = Number((classData.price * totalParticipants).toFixed(3));
  const hasEnoughBalance = (wallet?.balance ?? 0) >= totalAmount;
  const isMomKid = classData.subCategory === 'MOM_AND_KID';
  const terms = getTerms(locale, isMomKid);
  const selectedSessionLabel = selectedSession
    ? new Date(selectedSession.startTime).toLocaleString(isArabic ? 'ar-OM' : 'en-OM', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: DISPLAY_TIMEZONE,
      })
    : null;

  const t = {
    title: isArabic ? 'إتمام حجز الدورة' : 'Complete Class Booking',
    subtitle: isArabic ? 'حدد المشاركين وأكد الشروط ثم ادفع من المحفظة.' : 'Set participants, accept terms, then pay with wallet.',
    session: isArabic ? 'موعد الجلسة' : 'Session',
    bookingFor: isArabic ? 'نوع التسجيل' : 'Registration Type',
    self: isArabic ? 'أنا أحضر هذه الدورة' : 'I am attending this class',
    other: isArabic ? 'أسجل نيابة عن شخص آخر' : 'I am registering on behalf of someone else',
    both: isArabic ? 'أنا أحضر وأسجل أيضاً نيابة عن شخص آخر' : 'I am attending this class and registering on behalf of someone else',
    participantsCount: isArabic ? 'عدد المشاركين الإضافيين' : 'Number of Participants',
    participants: isArabic ? 'بيانات المشاركين' : 'Participants Details',
    participant: isArabic ? 'مشارك' : 'Participant',
    fullName: isArabic ? 'الاسم الكامل' : 'Full Name',
    dateOfBirth: isArabic ? 'تاريخ الميلاد' : 'Date of Birth',
    preferredLanguage: isArabic ? 'اللغة المفضلة' : 'Preferred Language',
    specialRequests: isArabic ? 'ملاحظات / طلبات خاصة' : 'Special Requests / Notes',
    agree: isArabic ? 'أوافق على الشروط والأحكام' : 'I agree to the terms and conditions',
    walletBalance: isArabic ? 'الرصيد المتاح للدفع داخل الموقع' : 'Wallet Balance for Website Payments',
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
    required: isArabic ? 'يرجى إكمال بيانات كل مشارك.' : 'Please complete each participant entry.',
    invalidDob: isArabic ? 'تاريخ الميلاد غير صالح.' : 'Invalid date of birth.',
    termsRequired: isArabic ? 'يجب الموافقة على الشروط قبل الدفع.' : 'You must accept terms before payment.',
    seatsError: isArabic ? 'عدد المشاركين أكبر من المقاعد المتاحة في هذه الجلسة.' : 'Participants exceed available seats for this session.',
    soldOut: isArabic ? 'المقاعد مكتملة' : 'Sold out',
    noSeats: isArabic ? 'هذه الجلسة ممتلئة حالياً. اختر جلسة أخرى.' : 'This session is currently full. Please choose another session.',
    insufficient: isArabic ? 'رصيد المحفظة المستخدم داخل الموقع غير كافٍ لإتمام الدفع.' : 'Your website wallet balance is insufficient for this payment.',
    yourDetails: isArabic ? 'بياناتك (تلقائية)' : 'Your Details (auto-filled)',
    selectSaved: isArabic ? 'اختر مشارك محفوظ...' : 'Select saved participant...',
    newParticipant: isArabic ? 'مشارك جديد' : 'New participant',
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

  /* Load saved participants on mount */
  const loadSavedParticipants = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch('/api/public/saved-participants', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as SavedParticipant[];
        setSavedList(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore – saved list is optional */
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    void loadSavedParticipants();
  }, [loadSavedParticipants]);

  /* Keep otherParticipants array in sync with otherCount */
  useEffect(() => {
    setOtherParticipants((prev) => {
      const next: Participant[] = Array.from({ length: otherCount }, (_, i) => prev[i] ?? emptyParticipant());
      return next;
    });
  }, [otherCount]);

  /* Clamp otherCount when seats change */
  useEffect(() => {
    if (!selectedSession) return;
    if (maxOthersAllowed === 0 && otherCount !== 1) {
      setOtherCount(1);
      return;
    }
    if (otherCount > maxOthersAllowed) {
      setOtherCount(Math.max(1, maxOthersAllowed));
    }
  }, [maxOthersAllowed, otherCount, selectedSession]);

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

  const updateOtherParticipant = (index: number, key: keyof Participant, value: string) => {
    setOtherParticipants((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [key]: value,
      };
      return next;
    });
  };

  const applySavedParticipant = (index: number, saved: SavedParticipant) => {
    setOtherParticipants((prev) => {
      const next = [...prev];
      next[index] = {
        fullName: saved.fullName,
        dateOfBirth: saved.dateOfBirth,
        preferredLanguage: saved.preferredLanguage,
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
    if (totalParticipants > selectedSession.seatsAvailable) {
      setError(t.seatsError);
      return false;
    }

    for (const participant of allParticipants) {
      if (participant.fullName.trim().length === 0 || participant.dateOfBirth.trim().length === 0) {
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
          numberOfParticipants: totalParticipants,
          participants: allParticipants,
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

      /* Auto-save other participants for future bookings (fire & forget) */
      if (othersIncluded) {
        for (const p of otherParticipants.slice(0, otherCount)) {
          if (p.fullName.trim()) {
            void fetch('/api/public/saved-participants', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: p.fullName.trim(),
                dateOfBirth: p.dateOfBirth,
                preferredLanguage: p.preferredLanguage,
              }),
            }).catch(() => {});
          }
        }
      }
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
          <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
            {t.bookingNumber}: <span className="font-semibold">{result.booking.bookingNumber}</span>
          </p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
            {t.total}: {formatAmountWithCurrency(result.booking.totalAmount, result.booking.currency)}
          </p>
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
          <ClassSessionPicker
            locale={locale}
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
          />

          {/* ── Registration Type ── */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.bookingFor}</h2>
            <div className="mt-4 grid gap-2">
              {([
                { value: 'self' as RegistrationType, label: t.self },
                { value: 'other' as RegistrationType, label: t.other },
                { value: 'both' as RegistrationType, label: t.both },
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
            </div>

            {/* Participant count selector – shown only when registering others */}
            {othersIncluded && (
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-[color:var(--text)]">{t.participantsCount}</span>
                <select
                  value={otherCount}
                  onChange={(event) => setOtherCount(Number(event.target.value))}
                  disabled={!hasBookableSeats}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--text)]"
                >
                  {Array.from({ length: otherOptionMax }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!hasBookableSeats && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{t.noSeats}</p>
            )}
          </div>

          {/* ── Participant Details ── */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.participants}</h2>
            <div className="mt-4 space-y-5">

              {/* Self participant – read-only auto-filled */}
              {selfIncluded && (
                <div className="rounded-xl border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 p-4">
                  <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">
                    {t.yourDetails}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.fullName}</span>
                      <input
                        value={selfDefaultParticipant.fullName}
                        readOnly
                        disabled
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text)] opacity-70 cursor-not-allowed"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.dateOfBirth}</span>
                      <input
                        type="date"
                        value={selfDefaultParticipant.dateOfBirth}
                        readOnly
                        disabled
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text)] opacity-70 cursor-not-allowed"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1.5 block text-[color:var(--text)]">{t.preferredLanguage}</span>
                      <select
                        value={selfDefaultParticipant.preferredLanguage}
                        disabled
                        className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text)] opacity-70 cursor-not-allowed"
                      >
                        <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                        <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                      </select>
                    </label>
                  </div>
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
                    {savedList.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          const saved = savedList.find((s) => s.id === e.target.value);
                          if (saved) applySavedParticipant(index, saved);
                        }}
                        className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text)]"
                      >
                        <option value="">{loadingSaved ? '...' : t.selectSaved}</option>
                        {savedList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label ?? s.fullName}
                          </option>
                        ))}
                      </select>
                    )}
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
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{terms.title}</h2>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-[color:var(--text-muted)]">
              {terms.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[color:var(--text-subtle)]">
              <Link href={`/${locale}/terms`} className="underline">
                {isArabic ? 'قراءة صفحة الشروط الكاملة' : 'Read full terms page'}
              </Link>
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm text-[color:var(--text)]">
              <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5" />
              <span>{t.agree}</span>
            </label>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <label className="text-sm">
              <span className="mb-1 block text-[color:var(--text)]">{t.specialRequests}</span>
              <textarea
                rows={4}
                value={specialRequests}
                onChange={(event) => setSpecialRequests(event.target.value)}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
              />
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">
            {isArabic && classData.titleAr ? classData.titleAr : classData.title}
          </h2>
          <div className="mt-4 space-y-2 text-sm text-[color:var(--text)]">
            <div className="flex items-center justify-between">
              <span>{t.session}</span>
              <span className="max-w-[180px] text-right font-semibold">{selectedSessionLabel ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t.participantsCount}</span>
              <span className="font-semibold">{totalParticipants}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t.walletBalance}</span>
              <span className="font-semibold">
                {loadingWallet ? '...' : formatAmountWithCurrency(wallet?.balance ?? 0, wallet?.currency ?? classData.currency)}
              </span>
            </div>
            <div className="border-t border-[color:var(--border)] pt-2 text-base font-semibold text-[color:var(--text)]">
              <div className="flex items-center justify-between">
                <span>{t.total}</span>
                <span>{formatAmountWithCurrency(totalAmount, classData.currency)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void submitBooking()}
            disabled={processing || loadingWallet || !selectedSession || !hasBookableSeats || !hasEnoughBalance}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="min-w-0 flex-1 rounded-xl border border-emerald-400/60 bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]"
                />
                <button
                  type="button"
                  onClick={() => void handleTopup()}
                  disabled={topupLoading}
                  className="inline-flex shrink-0 rounded-xl border border-emerald-400/60 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-500/10 disabled:opacity-60"
                >
                  {topupLoading ? t.processing : t.topupAction}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
      </div>
    </div>
  );
}
