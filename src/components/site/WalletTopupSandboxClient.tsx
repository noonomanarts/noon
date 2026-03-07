'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';

type PaymentPayload = {
  payment: {
    reference: string;
    amount: number;
    currency: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    created_at: string;
  };
};

export default function WalletTopupSandboxClient({
  locale,
  reference,
  returnUrl,
}: {
  locale: Locale;
  reference: string;
  returnUrl: string;
}) {
  const router = useRouter();
  const isArabic = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentPayload['payment'] | null>(null);

  const safeReturnUrl = useMemo(() => {
    return returnUrl.startsWith('/') ? returnUrl : `/${locale}/checkout`;
  }, [locale, returnUrl]);

  const t = {
    title: isArabic ? 'بوابة الدفع التجريبية' : 'Sandbox Payment Gateway',
    subtitle: isArabic ? 'اختبر عملية شحن المحفظة.' : 'Simulate wallet top-up payment.',
    missing: isArabic ? 'مرجع الدفع غير صالح.' : 'Invalid payment reference.',
    amount: isArabic ? 'المبلغ' : 'Amount',
    reference: isArabic ? 'المرجع' : 'Reference',
    status: isArabic ? 'الحالة' : 'Status',
    payNow: isArabic ? 'دفع الآن (نجاح)' : 'Pay Now (Success)',
    failNow: isArabic ? 'فشل الدفع' : 'Fail Payment',
    cancelNow: isArabic ? 'إلغاء الدفع' : 'Cancel Payment',
    back: isArabic ? 'الرجوع للـ Checkout' : 'Back to Checkout',
    processing: isArabic ? 'جاري المعالجة...' : 'Processing...',
  };

  useEffect(() => {
    const loadPayment = async () => {
      if (!reference.trim()) {
        setError(t.missing);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/wallet/topup/sandbox?reference=${encodeURIComponent(reference)}`, {
          cache: 'no-store',
        });

        const payload = (await response.json().catch(() => ({}))) as PaymentPayload & { error?: string };

        if (!response.ok || !payload.payment) {
          throw new Error(payload.error || 'Failed to load payment');
        }

        setPayment(payload.payment);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load payment');
      } finally {
        setLoading(false);
      }
    };

    void loadPayment();
  }, [reference, t.missing]);

  const completePayment = async (status: 'PAID' | 'FAILED' | 'CANCELLED') => {
    if (!payment) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/topup/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: payment.reference,
          status,
          failureReason: status === 'FAILED' ? 'Sandbox user simulation' : undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to process payment');
      }

      const nextUrl = new URL(safeReturnUrl, window.location.origin);
      nextUrl.searchParams.set('topup', status.toLowerCase());
      nextUrl.searchParams.set('reference', payment.reference);
      router.replace(`${nextUrl.pathname}${nextUrl.search}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-x-clip pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]">
          <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 py-12">
          <p className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]">
        <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[color:var(--text)]">{t.title}</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}

        {payment && (
          <div className="mt-5 space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm">
            <p className="text-[color:var(--text-muted)]">{t.reference}: <span className="font-semibold text-[color:var(--text)]">{payment.reference}</span></p>
            <p className="text-[color:var(--text-muted)]">{t.amount}: <span className="font-semibold text-[color:var(--text)]">{payment.amount.toFixed(3)} {payment.currency}</span></p>
            <p className="text-[color:var(--text-muted)]">{t.status}: <span className="font-semibold text-[color:var(--text)]">{payment.status}</span></p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void completePayment('PAID')}
            disabled={!payment || processing || payment.status !== 'PENDING'}
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? t.processing : t.payNow}
          </button>
          <button
            type="button"
            onClick={() => void completePayment('FAILED')}
            disabled={!payment || processing || payment.status !== 'PENDING'}
            className="inline-flex rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
          >
            {t.failNow}
          </button>
          <button
            type="button"
            onClick={() => void completePayment('CANCELLED')}
            disabled={!payment || processing || payment.status !== 'PENDING'}
            className="inline-flex rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.cancelNow}
          </button>
        </div>

        <Link
          href={safeReturnUrl}
          className="mt-4 inline-flex text-sm font-medium text-[color:var(--text-muted)] underline hover:text-[color:var(--text)]"
        >
          {t.back}
        </Link>
      </div>
      </div>
    </div>
  );
}
