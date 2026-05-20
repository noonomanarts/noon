'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNoonDateTime } from '@/lib/dateTime';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import { getPaymentMethodLabel } from '@/lib/paymentMethod';
import { getAmwalCheckoutErrorPayload, startAmwalCheckout } from '@/lib/amwalClient';

type WalletPayload = {
  balance: number;
  available_balance: number;
  currency: string;
};

type EventPaymentResult = {
  success: boolean;
  booking?: {
    bookingNumber?: string;
    paymentStatus?: string;
    paymentMethod?: string | null;
    paidAt?: string | null;
  };
  wallet?: WalletPayload;
  checkout?: {
    scriptUrl: string;
    config: Record<string, unknown>;
    reference?: string;
  };
  error?: string;
};

type OrderPaymentCardProps = {
  locale: Locale;
  orderType: 'class' | 'event' | 'shop';
  orderId: string;
  orderStatus: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  totalAmount: number | null;
  currency: string;
  paidAt?: string | Date | null;
};

const PAYABLE_EVENT_STATUSES = new Set(['CLIENT_CONFIRMED', 'PENDING_PAYMENT']);

function formatAmount(value: number | null, currency: string) {
  if (!Number.isFinite(value ?? NaN)) return `- ${currency}`;
  return formatAmountWithCurrency(Number(value), currency);
}

function formatDateTime(locale: Locale, value: string | Date | null | undefined) {
  if (!value) return null;

  return formatNoonDateTime(value, locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800';
    case 'REFUNDED':
      return 'bg-sky-100 text-sky-800';
    case 'FAILED':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

export function OrderPaymentCard({
  locale,
  orderType,
  orderId,
  orderStatus,
  paymentStatus,
  paymentMethod,
  totalAmount,
  currency,
  paidAt,
}: OrderPaymentCardProps) {
  const isArabic = locale === 'ar';
  const router = useRouter();

  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(paymentStatus ?? 'PENDING');
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<string | null>(paymentMethod);
  const [currentPaidAt, setCurrentPaidAt] = useState<string | Date | null | undefined>(paidAt);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ONLINE' | 'WALLET'>('ONLINE');

  const normalizedTotalAmount = useMemo(() => {
    const parsed = typeof totalAmount === 'number' ? totalAmount : Number(totalAmount);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(3)) : null;
  }, [totalAmount]);

  const hasAmount = normalizedTotalAmount !== null && normalizedTotalAmount > 0;
  const canPayEventOrder =
    orderType === 'event' &&
    currentPaymentStatus !== 'PAID' &&
    orderStatus !== 'CANCELLED' &&
    hasAmount &&
    PAYABLE_EVENT_STATUSES.has(orderStatus);
  const waitingForAmount = orderType === 'event' && currentPaymentStatus !== 'PAID' && !hasAmount;
  const waitingForApproval =
    orderType === 'event' &&
    currentPaymentStatus !== 'PAID' &&
    hasAmount &&
    orderStatus !== 'CANCELLED' &&
    !PAYABLE_EVENT_STATUSES.has(orderStatus);
  const walletBalance = wallet?.balance ?? 0;
  const hasEnoughBalance = walletBalance >= (normalizedTotalAmount ?? 0);

  const t = {
    title: isArabic ? 'حالة الدفع' : 'Payment Status',
    total: isArabic ? 'الإجمالي المطلوب' : 'Amount Due',
    method: isArabic ? 'طريقة الدفع' : 'Payment Method',
    paymentMethod: isArabic ? 'طريقة الدفع' : 'Payment Method',
    walletBalance: isArabic ? 'رصيد المحفظة' : 'Wallet Balance',
    topupHint: isArabic ? 'يمكنك شحن المحفظة من صفحة الحساب فقط.' : 'You can top up your wallet from your account only.',
    topupAction: isArabic ? 'شحن المحفظة من الحساب' : 'Top up in account',
    payAction: isArabic ? 'إتمام الدفع' : 'Complete Payment',
    payNow: isArabic ? 'الدفع الآن' : 'Pay now',
    payNowHint: isArabic ? 'الدفع الكامل عبر بوابة الدفع.' : 'Pay the full amount through the payment gateway.',
    walletPay: isArabic ? 'استخدام رصيد المحفظة' : 'Use wallet credit',
    walletPayHint: isArabic ? 'متاح فقط إذا كان الرصيد يغطي كامل المبلغ.' : 'Available only when the balance covers the full amount.',
    processing: isArabic ? 'جاري المعالجة...' : 'Processing...',
    insufficient: isArabic ? 'رصيد المحفظة غير كافٍ.' : 'Wallet balance is not enough.',
    paid: isArabic ? 'مدفوع' : 'Paid',
    pending: isArabic ? 'بانتظار الدفع' : 'Pending Payment',
    refunded: isArabic ? 'مسترجع' : 'Refunded',
    failed: isArabic ? 'فشل الدفع' : 'Payment Failed',
    wallet: isArabic ? 'المحفظة' : 'Wallet',
    notSet: isArabic ? 'غير محدد' : 'Not set',
    waitingAmount: isArabic
      ? 'سيتم تفعيل الدفع بعد أن يحدد الأدمن السعر النهائي لهذا الحجز.'
      : 'Payment will open after the admin sets the final price for this booking.',
    waitingApproval: isArabic
      ? 'بانتظار موافقة الإدارة.'
      : 'Waiting for admin approval.',
    paidHint: isArabic ? 'تم استلام الدفعة بنجاح.' : 'This order has been paid successfully.',
    paidAt: isArabic ? 'تاريخ الدفع' : 'Paid At',
    readyToPay: isArabic ? 'الحجز جاهز للدفع.' : 'This booking is ready for payment.',
    cancelled: isArabic ? 'تم إلغاء هذا الطلب.' : 'This order has been cancelled.',
    retry: isArabic ? 'أعيدي المحاولة بعد شحن الرصيد.' : 'Try again after adding credit.',
    paymentSuccess: isArabic ? 'تم الدفع بنجاح.' : 'Payment completed successfully.',
    walletMissing: isArabic ? 'المحفظة غير متاحة حالياً.' : 'Wallet is not available yet.',
  };

  const paymentStatusLabel =
    currentPaymentStatus === 'PAID'
      ? t.paid
      : currentPaymentStatus === 'REFUNDED'
        ? t.refunded
        : currentPaymentStatus === 'FAILED'
          ? t.failed
          : t.pending;

  const paymentMethodLabel = getPaymentMethodLabel(currentPaymentMethod, locale);

  const loadWallet = useCallback(async () => {
    if (!canPayEventOrder) {
      return;
    }

    setLoadingWallet(true);
    try {
      const response = await fetch('/api/wallet/balance', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load wallet');
      }

      setWallet(payload as WalletPayload);
    } catch (loadError) {
      setWallet(null);
      setError(loadError instanceof Error ? loadError.message : t.walletMissing);
    } finally {
      setLoadingWallet(false);
    }
  }, [canPayEventOrder, t.walletMissing]);

  useEffect(() => {
    if (canPayEventOrder) {
      void loadWallet();
    }
  }, [canPayEventOrder, loadWallet]);

  useEffect(() => {
    if (selectedPaymentMethod === 'WALLET' && !hasEnoughBalance) {
      setSelectedPaymentMethod('ONLINE');
    }
  }, [hasEnoughBalance, selectedPaymentMethod]);

  const handlePay = async () => {
    if (!canPayEventOrder) {
      return;
    }

    setError(null);
    setMessage(null);
    setProcessing(true);

    try {
      const response = await fetch(`/api/public/event-bookings/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: selectedPaymentMethod,
          locale,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as EventPaymentResult;

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to process payment');
      }

      if (payload.checkout) {
        const reference = payload.checkout.reference || payload.booking?.bookingNumber;
        if (!reference) {
          throw new Error(isArabic ? 'بيانات الدفع غير مكتملة.' : 'Payment details are incomplete.');
        }

        await startAmwalCheckout({
          checkout: payload.checkout,
          onComplete: async (gatewayPayload) => {
            const callbackResponse = await fetch('/api/public/event-bookings/payment/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference, gatewayPayload }),
            });
            const callbackPayload = (await callbackResponse.json().catch(() => ({}))) as {
              error?: string;
              paymentStatus?: string;
            };

            if (!callbackResponse.ok || callbackPayload.paymentStatus !== 'PAID') {
              throw new Error(callbackPayload.error || (isArabic ? 'فشل تأكيد الدفع.' : 'Failed to confirm payment.'));
            }

            setCurrentPaymentStatus('PAID');
            setCurrentPaymentMethod('ONLINE');
            setCurrentPaidAt(new Date().toISOString());
            setMessage(t.paymentSuccess);
            router.refresh();
          },
          onCancel: () => {
            setError(isArabic ? 'تم إلغاء الدفع.' : 'Payment was cancelled.');
          },
          onError: async (gatewayPayload) => {
            await fetch('/api/public/event-bookings/payment/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference, gatewayPayload: getAmwalCheckoutErrorPayload(gatewayPayload) }),
            }).catch(() => undefined);
            setError(isArabic ? 'فشل الدفع. يرجى المحاولة مرة أخرى.' : 'Payment failed. Please try again.');
          },
        });
        return;
      }

      setCurrentPaymentStatus(payload.booking?.paymentStatus ?? 'PAID');
      setCurrentPaymentMethod(payload.booking?.paymentMethod ?? 'WALLET');
      setCurrentPaidAt(payload.booking?.paidAt ?? new Date().toISOString());
      if (payload.wallet) {
        setWallet(payload.wallet);
      }
      setMessage(t.paymentSuccess);
      router.refresh();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  let helperText = t.paidHint;
  if (orderStatus === 'CANCELLED') {
    helperText = t.cancelled;
  } else if (currentPaymentStatus === 'FAILED') {
    helperText = t.retry;
  } else if (waitingForAmount) {
    helperText = t.waitingAmount;
  } else if (waitingForApproval) {
    helperText = t.waitingApproval;
  } else if (canPayEventOrder) {
    helperText = t.readyToPay;
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[color:var(--text)]">{t.title}</p>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">{helperText}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClasses(currentPaymentStatus)}`}>
          {paymentStatusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
          <p className="text-[color:var(--text-subtle)]">{t.total}</p>
          <p className="mt-1 font-semibold text-[color:var(--text)]">{formatAmount(normalizedTotalAmount, currency)}</p>
        </div>
        <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
          <p className="text-[color:var(--text-subtle)]">{t.method}</p>
          <p className="mt-1 font-semibold text-[color:var(--text)]">{paymentMethodLabel}</p>
        </div>
        <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
          <p className="text-[color:var(--text-subtle)]">{t.paidAt}</p>
          <p className="mt-1 font-semibold text-[color:var(--text)]">{formatDateTime(locale, currentPaidAt) || t.notSet}</p>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {canPayEventOrder ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4">
          <div>
            <p className="text-sm font-medium text-[color:var(--text)]">{t.paymentMethod}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm transition ${
                  selectedPaymentMethod === 'ONLINE'
                    ? 'border-[color:var(--primary)]'
                    : 'border-[color:var(--border)]'
                }`}
              >
                <input
                  type="radio"
                  name={`eventPaymentMethod-${orderId}`}
                  checked={selectedPaymentMethod === 'ONLINE'}
                  onChange={() => setSelectedPaymentMethod('ONLINE')}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-[color:var(--text)]">{t.payNow}</span>
                  <span className="mt-1 block text-xs text-[color:var(--text-muted)]">{t.payNowHint}</span>
                </span>
              </label>
              <label
                className={`flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm transition ${
                  hasEnoughBalance ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${
                  selectedPaymentMethod === 'WALLET'
                    ? 'border-[color:var(--primary)]'
                    : 'border-[color:var(--border)]'
                }`}
              >
                <input
                  type="radio"
                  name={`eventPaymentMethod-${orderId}`}
                  checked={selectedPaymentMethod === 'WALLET'}
                  onChange={() => {
                    if (hasEnoughBalance) setSelectedPaymentMethod('WALLET');
                  }}
                  disabled={!hasEnoughBalance}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-[color:var(--text)]">{t.walletPay}</span>
                  <span className="mt-1 block text-xs text-[color:var(--text-muted)]">{t.walletPayHint}</span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[color:var(--text)]">{t.walletBalance}</p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
                {loadingWallet ? '...' : formatAmount(wallet?.balance ?? 0, wallet?.currency ?? currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePay}
              disabled={processing || loadingWallet || (selectedPaymentMethod === 'WALLET' && (!wallet || !hasEnoughBalance))}
              className="rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? t.processing : t.payAction}
            </button>
          </div>

          {!loadingWallet && !hasEnoughBalance ? (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">{t.insufficient}</p>
              <p className="text-sm text-amber-800">{t.topupHint}</p>
              <Link
                href={`/${locale}/account/wallet`}
                className="inline-flex rounded-full border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                {t.topupAction}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
