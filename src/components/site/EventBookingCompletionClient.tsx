'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/lib/locale';
import { startAmwalCheckout } from '@/lib/amwalClient';

type CompletionResponse = {
  booking: {
    bookingNumber: string;
    eventType: string;
    status: string;
    selectedDate: string | null;
    selectedTime: string | null;
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
    currency: string;
    paymentMethod: string | null;
    paymentStatus: string;
    paymentProof: string | null;
    agreementAccepted: boolean;
    clientConfirmed: boolean;
    tokenExpiresAt: string | null;
    tokenExpired: boolean;
  };
  bankDetails: {
    bankName: string;
    bankAccount: string;
    bankIban: string;
    companyName: string;
    companyNameAr: string;
    companyEmail: string;
    companyPhone: string;
  };
};

type CompletionSubmitResponse = {
  error?: string;
  checkout?: {
    scriptUrl: string;
    config: Record<string, unknown>;
    reference?: string;
  };
};

const eventTypeLabels: Record<string, { en: string; ar: string }> = {
  COOKING_COMPETITION: { en: 'Cooking Competition', ar: 'مسابقة الطبخ' },
  PRIVATE_CLASS: { en: 'Private Class', ar: 'الدرس الخاص' },
  BIRTHDAY_PARTY: { en: 'Birthday Party', ar: 'حفلة عيد الميلاد' },
};

export default function EventBookingCompletionClient({ locale, token }: { locale: Locale; token: string }) {
  const isAr = locale === 'ar';
  const searchParams = useSearchParams();
  const [data, setData] = useState<CompletionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'BANK_TRANSFER'>('ONLINE');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const paymentState = searchParams.get('payment');

  const redirectWithPaymentState = useCallback((state: 'paid' | 'failed' | 'pending', reference?: string) => {
    if (typeof window === 'undefined') return;
    const destination = new URL(window.location.href);
    destination.searchParams.set('payment', state);
    if (reference) {
      destination.searchParams.set('reference', reference);
    }
    window.location.href = `${destination.pathname}${destination.search}`;
  }, []);

  const t = {
    title: isAr ? 'إكمال الحجز' : 'Complete Your Booking',
    loading: isAr ? 'جاري تحميل الحجز...' : 'Loading booking...',
    bookingSummary: isAr ? 'ملخص الحجز' : 'Booking Summary',
    agreement: isAr ? 'الاتفاقية' : 'Agreement',
    payment: isAr ? 'الدفع' : 'Payment',
    details: isAr ? 'التفاصيل' : 'Details',
    bookingNumber: isAr ? 'رقم الحجز' : 'Booking Number',
    type: isAr ? 'النوع' : 'Type',
    date: isAr ? 'التاريخ' : 'Date',
    time: isAr ? 'الوقت' : 'Time',
    participants: isAr ? 'المشاركون' : 'Participants',
    groups: isAr ? 'المجموعات' : 'Groups',
    company: isAr ? 'الشركة / المجموعة' : 'Company / Group',
    dish: isAr ? 'الطبق المفضل' : 'Preferred Dish',
    requests: isAr ? 'الطلبات الخاصة' : 'Special Requests',
    amount: isAr ? 'المبلغ النهائي' : 'Final Amount',
    agreementText: isAr
      ? 'بالموافقة أدناه، أؤكد صحة تفاصيل الحجز، وأوافق على الشروط والأحكام وسياسة الإلغاء وشروط الدفع الخاصة بنون.'
      : 'By confirming below, I verify the booking details and agree to Noon’s terms and conditions, cancellation policy, and payment terms.',
    cancellationText: isAr
      ? 'سياسة الإلغاء: أي تعديل أو إلغاء بعد التأكيد النهائي يخضع لمراجعة الفريق حسب الوقت والتجهيزات المطلوبة.'
      : 'Cancellation policy: any change or cancellation after final confirmation is subject to team review based on timing and preparations already committed.',
    paymentTermsText: isAr
      ? 'شروط الدفع: يمكن الدفع عبر البوابة الإلكترونية أو التحويل البنكي. يظل الحجز تحت المتابعة حتى يتم اعتماد الدفع.'
      : 'Payment terms: you can pay online or by bank transfer. The booking remains under review until payment is validated.',
    acceptAgreement: isAr ? 'أوافق على الاتفاقية والشروط وسياسة الإلغاء وشروط الدفع.' : 'I agree to the agreement, terms, cancellation policy, and payment terms.',
    signature: isAr ? 'التوقيع الرقمي' : 'Digital Signature',
    signaturePlaceholder: isAr ? 'اكتبي الاسم الكامل كتوقيع' : 'Type your full name as your signature',
    paymentMethod: isAr ? 'طريقة الدفع' : 'Payment Method',
    onlinePayment: isAr ? 'دفع إلكتروني' : 'Online Payment',
    bankTransfer: isAr ? 'تحويل بنكي' : 'Bank Transfer',
    bankDetails: isAr ? 'البيانات البنكية' : 'Bank Details',
    proof: isAr ? 'إثبات التحويل' : 'Transfer Proof',
    proofHint: isAr ? 'اختياري، يمكنك رفعه الآن أو لاحقاً.' : 'Optional, you can upload it now or later.',
    submit: isAr ? 'تأكيد وإكمال الحجز' : 'Confirm and Complete Booking',
    submitting: isAr ? 'جاري الإرسال...' : 'Submitting...',
    expired: isAr ? 'انتهت صلاحية هذا الرابط. يرجى التواصل مع نون لإعادة الإرسال.' : 'This link has expired. Please contact Noon to resend it.',
    alreadyPaid: isAr ? 'تم تسجيل الدفع بنجاح.' : 'Payment has been recorded successfully.',
    bankPending: isAr ? 'تم استلام تأكيدك. سيقوم فريق نون بمراجعة التحويل البنكي.' : 'Your confirmation was received. Noon will review the bank transfer details.',
    paymentPending: isAr ? 'عملية الدفع قيد المعالجة. إذا اكتمل الدفع ستظهر الحالة هنا.' : 'Payment is being processed. The status will update here after the gateway returns.',
    paymentFailed: isAr ? 'لم يكتمل الدفع الإلكتروني. يمكنك المحاولة مرة أخرى.' : 'The online payment did not complete. You can try again.',
    backHome: isAr ? 'العودة للرئيسية' : 'Back to Home',
    loadError: isAr ? 'تعذر تحميل رابط الحجز.' : 'Failed to load booking link.',
    formErrorAgreement: isAr ? 'يجب الموافقة على الاتفاقية أولاً.' : 'You must accept the agreement first.',
    formErrorSignature: isAr ? 'التوقيع الرقمي مطلوب.' : 'Digital signature is required.',
    uploadedProof: isAr ? 'إثبات التحويل المرفوع' : 'Uploaded transfer proof',
  };

  const localeCode = isAr ? 'ar-OM-u-nu-latn' : 'en-OM';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/event-bookings/confirm/${token}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as CompletionResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || t.loadError);
      }
      setData(payload);
      setAgreementAccepted(Boolean(payload.booking.agreementAccepted));
      setPaymentMethod(payload.booking.paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'ONLINE');
      if (payload.booking.clientConfirmed && payload.booking.paymentMethod === 'BANK_TRANSFER') {
        setSuccessMessage(t.bankPending);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError, token, t.bankPending]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (paymentState === 'paid') {
      setSuccessMessage(t.alreadyPaid);
      void loadData();
    } else if (paymentState === 'failed') {
      setSuccessMessage(t.paymentFailed);
      void loadData();
    } else if (paymentState === 'pending') {
      setSuccessMessage(t.paymentPending);
      void loadData();
    }
  }, [loadData, paymentState, t.alreadyPaid, t.paymentFailed, t.paymentPending]);

  const typeLabel = useMemo(() => {
    if (!data) return '';
    const entry = eventTypeLabels[data.booking.eventType];
    return entry ? (isAr ? entry.ar : entry.en) : data.booking.eventType;
  }, [data, isAr]);

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(localeCode, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Muscat',
    });
  };

  const handleSubmit = async () => {
    if (!agreementAccepted) {
      setError(t.formErrorAgreement);
      return;
    }
    if (!digitalSignature.trim()) {
      setError(t.formErrorSignature);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.set('agreementAccepted', agreementAccepted ? 'true' : 'false');
      formData.set('digitalSignature', digitalSignature.trim());
      formData.set('paymentMethod', paymentMethod);
      if (paymentProof) {
        formData.set('paymentProof', paymentProof);
      }

      const response = await fetch(`/api/public/event-bookings/confirm/${token}`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as CompletionSubmitResponse;
      if (!response.ok) {
        throw new Error(payload.error || t.loadError);
      }

      if (payload.checkout) {
        const reference = payload.checkout.reference;

        await startAmwalCheckout({
          checkout: payload.checkout,
          onComplete: async (gatewayPayload) => {
            const callbackResponse = await fetch('/api/public/event-bookings/payment/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference, token, gatewayPayload }),
            });
            const callbackPayload = (await callbackResponse.json().catch(() => ({}))) as {
              error?: string;
              paymentStatus?: string;
            };

            if (!callbackResponse.ok) {
              throw new Error(callbackPayload.error || 'Failed to confirm payment');
            }

            const nextState = callbackPayload.paymentStatus === 'PAID'
              ? 'paid'
              : callbackPayload.paymentStatus === 'FAILED'
                ? 'failed'
                : 'pending';

            redirectWithPaymentState(nextState, reference);
          },
          onCancel: () => {
            redirectWithPaymentState('failed', reference);
          },
          onError: () => {
            redirectWithPaymentState('failed', reference);
          },
        });

        return;
      }

      await loadData();
      setSuccessMessage(t.bankPending);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.loadError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-zinc-600">{t.loading}</div>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-16">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || t.loadError}</p>
        <Link href={`/${locale}`} className="text-sm font-semibold text-coral hover:underline">{t.backHome}</Link>
      </div>
    );
  }

  const amountText = data.booking.totalAmount == null ? '-' : `${data.booking.totalAmount.toFixed(3)} ${data.booking.currency}`;
  const disableSubmit = data.booking.tokenExpired && !data.booking.clientConfirmed;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-950">{t.title}</h1>
        {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
        {disableSubmit ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t.expired}</p> : null}
      </div>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">{t.bookingSummary}</h2>
        <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
          <p><strong>{t.bookingNumber}:</strong> {data.booking.bookingNumber}</p>
          <p><strong>{t.type}:</strong> {typeLabel}</p>
          <p><strong>{t.date}:</strong> {formatDate(data.booking.selectedDate)}</p>
          <p><strong>{t.time}:</strong> {data.booking.selectedTime || '-'}</p>
          <p><strong>{t.participants}:</strong> {data.booking.numberOfParticipants ?? '-'}</p>
          <p><strong>{t.groups}:</strong> {data.booking.numberOfGroups ?? '-'}</p>
          <p><strong>{t.company}:</strong> {data.booking.companyOrGroupName || '-'}</p>
          <p><strong>{t.dish}:</strong> {data.booking.preferredDish || '-'}</p>
          <p className="sm:col-span-2"><strong>{t.requests}:</strong> {data.booking.specialRequests || '-'}</p>
          <p><strong>{t.amount}:</strong> {amountText}</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">{t.agreement}</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-700">
          <p>{t.agreementText}</p>
          <p>{t.cancellationText}</p>
          <p>{t.paymentTermsText}</p>
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={agreementAccepted}
            onChange={(event) => setAgreementAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300"
            disabled={disableSubmit || data.booking.paymentStatus === 'PAID'}
          />
          <span>{t.acceptAgreement}</span>
        </label>

        <div className="mt-5">
          <label className="block text-sm font-medium text-zinc-800">{t.signature}</label>
          <input
            value={digitalSignature}
            onChange={(event) => setDigitalSignature(event.target.value)}
            placeholder={t.signaturePlaceholder}
            disabled={disableSubmit || data.booking.paymentStatus === 'PAID'}
            className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-900"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">{t.payment}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-800">
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === 'ONLINE'}
              onChange={() => setPaymentMethod('ONLINE')}
              disabled={disableSubmit || data.booking.paymentStatus === 'PAID'}
            />
            <span>{t.onlinePayment}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-800">
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === 'BANK_TRANSFER'}
              onChange={() => setPaymentMethod('BANK_TRANSFER')}
              disabled={disableSubmit || data.booking.paymentStatus === 'PAID'}
            />
            <span>{t.bankTransfer}</span>
          </label>
        </div>

        {paymentMethod === 'BANK_TRANSFER' ? (
          <div className="mt-5 space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="space-y-2 text-sm text-zinc-800">
              <p className="font-semibold">{t.bankDetails}</p>
              <p>{data.bankDetails.companyNameAr && isAr ? data.bankDetails.companyNameAr : data.bankDetails.companyName}</p>
              <p>{data.bankDetails.bankName || '-'}</p>
              <p>{data.bankDetails.bankAccount || '-'}</p>
              <p>{data.bankDetails.bankIban || '-'}</p>
              <p>{data.bankDetails.companyEmail}</p>
              <p>{data.bankDetails.companyPhone}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">{t.proof}</label>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => setPaymentProof(event.target.files?.[0] || null)}
                disabled={disableSubmit || data.booking.paymentStatus === 'PAID'}
                className="mt-2 block w-full text-sm text-zinc-700"
              />
              <p className="mt-2 text-xs text-zinc-500">{t.proofHint}</p>
              {data.booking.paymentProof ? (
                <p className="mt-2 text-xs text-zinc-700">
                  {t.uploadedProof}:{' '}
                  <a href={data.booking.paymentProof} target="_blank" rel="noreferrer" className="font-semibold text-coral hover:underline">
                    {data.booking.paymentProof}
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || disableSubmit || data.booking.paymentStatus === 'PAID'}
          className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t.submitting : t.submit}
        </button>
        <Link href={`/${locale}`} className="text-sm font-semibold text-coral hover:underline">{t.backHome}</Link>
      </div>
    </div>
  );
}