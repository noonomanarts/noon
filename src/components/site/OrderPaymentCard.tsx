'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import { getPaymentMethodLabel } from '@/lib/paymentMethod';
import { buildAmwalErrorUiMessage, getAmwalCheckoutErrorPayload, startAmwalCheckout } from '@/lib/amwalClient';

type WalletPayload = {
  balance: number;
  available_balance: number;
  currency: string;
};

type EventPaymentResult = {
  success: boolean;
  booking?: {
    paymentStatus?: string;
    paymentMethod?: string | null;
    paidAt?: string | null;
  };
  wallet?: WalletPayload;
};

type WalletTopupCheckoutPayload = {
  payment?: {
    reference?: string;
    returnUrl?: string;
    checkout?: {
      scriptUrl: string;
      config: Record<string, unknown>;
    };
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

  return new Date(value).toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(paymentStatus ?? 'PENDING');
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<string | null>(paymentMethod);
  const [currentPaidAt, setCurrentPaidAt] = useState<string | Date | null | undefined>(paidAt);

  const redirectWithTopupStatus = useCallback((status: 'paid' | 'failed' | 'cancelled' | 'pending', reference?: string, targetPath?: string) => {
    if (typeof window === 'undefined') return;
    const destination = new URL(targetPath && targetPath.startsWith('/') ? targetPath : pathname, window.location.origin);
    destination.searchParams.set('topup', status);
    if (reference) {
      destination.searchParams.set('reference', reference);
    }
    window.location.href = `${destination.pathname}${destination.search}`;
  }, [pathname]);

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
    walletBalance: isArabic ? 'الرصيد المتاح للدفع داخل الموقع' : 'Wallet Balance for Website Payments',
    topupTitle: isArabic ? 'شحن المحفظة' : 'Top Up Wallet',
    topupHint: isArabic ? 'يمكنك شحن المحفظة والعودة لإتمام الدفع مباشرة.' : 'Top up your wallet and complete payment right away.',
    topupAmount: isArabic ? 'مبلغ الشحن' : 'Top Up Amount',
    topupAction: isArabic ? 'شحن الآن' : 'Top Up Now',
    payAction: isArabic ? 'الدفع من المحفظة' : 'Pay With Wallet',
    processing: isArabic ? 'جاري المعالجة...' : 'Processing...',
    insufficient: isArabic ? 'رصيد المحفظة المستخدم داخل الموقع غير كافٍ لإتمام الدفع.' : 'Your website wallet balance is not enough for this payment.',
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
      ? 'تم حجز الوقت مؤقتاً. بعد موافقة الأدمن سيتاح الدفع من المحفظة.'
      : 'The selected slot is held. Wallet payment opens after admin approval.',
    paidHint: isArabic ? 'تم استلام الدفعة بنجاح.' : 'This order has been paid successfully.',
    paidAt: isArabic ? 'تاريخ الدفع' : 'Paid At',
    readyToPay: isArabic ? 'الحجز جاهز للدفع من المحفظة.' : 'This booking is ready for wallet payment.',
    cancelled: isArabic ? 'تم إلغاء هذا الطلب.' : 'This order has been cancelled.',
    retry: isArabic ? 'يمكنك إعادة المحاولة بعد تجهيز الرصيد.' : 'You can retry once your wallet balance is ready.',
    topupRedirect: isArabic
      ? 'سيتم فتح نافذة الدفع الآن.'
      : 'The payment window will open now.',
    topupPaid: isArabic ? 'تم شحن المحفظة بنجاح.' : 'Wallet topped up successfully.',
    topupFailed: isArabic ? 'فشلت عملية شحن المحفظة.' : 'Wallet top-up failed.',
    topupCancelled: isArabic ? 'تم إلغاء شحن المحفظة.' : 'Wallet top-up was cancelled.',
    paymentSuccess: isArabic ? 'تم الدفع من المحفظة بنجاح.' : 'Wallet payment completed successfully.',
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
    const topupStatus = searchParams.get('topup');
    if (!topupStatus) return;

    if (topupStatus === 'paid') {
      setMessage(t.topupPaid);
      setError(null);
      if (canPayEventOrder) {
        void loadWallet();
      }
    } else if (topupStatus === 'failed') {
      setError(buildAmwalErrorUiMessage({
        locale,
        context: 'checkout-topup',
        reason: searchParams.get('reason') || t.topupFailed,
      }));
      setMessage(null);
    } else if (topupStatus === 'cancelled') {
      setError(t.topupCancelled);
      setMessage(null);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('topup');
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [canPayEventOrder, loadWallet, pathname, router, searchParams, t.topupCancelled, t.topupFailed, t.topupPaid]);

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
            source: 'account_order_payment',
            orderId,
            orderType,
            locale,
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as WalletTopupCheckoutPayload;
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to top up wallet');
      }

      const payment = payload?.payment;
      const reference = typeof payment?.reference === 'string' ? payment.reference : undefined;
      const checkout = payment?.checkout;
      const targetReturnUrl = typeof payment?.returnUrl === 'string' ? payment.returnUrl : pathname;

      if (!reference || !checkout) {
        throw new Error(isArabic ? 'بيانات الدفع غير مكتملة.' : 'Payment details are incomplete.');
      }

      setTopupAmount('');
      setMessage(t.topupRedirect);
      await startAmwalCheckout({
        checkout,
        onComplete: async (gatewayPayload) => {
          const callbackResponse = await fetch('/api/wallet/topup/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference, gatewayPayload }),
          });
          const callbackPayload = (await callbackResponse.json().catch(() => ({}))) as {
            error?: string;
            topupStatus?: string;
          };

          if (!callbackResponse.ok) {
            throw new Error(callbackPayload.error || 'Failed to confirm payment');
          }

          const topupStatus = callbackPayload.topupStatus === 'PAID'
            ? 'paid'
            : callbackPayload.topupStatus === 'CANCELLED'
              ? 'cancelled'
              : callbackPayload.topupStatus === 'FAILED'
                ? 'failed'
                : 'pending';

          redirectWithTopupStatus(topupStatus, reference, targetReturnUrl);
        },
        onCancel: () => {
          redirectWithTopupStatus('cancelled', reference, targetReturnUrl);
        },
        onError: async (gatewayPayload) => {
          await fetch('/api/wallet/topup/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference, gatewayPayload: getAmwalCheckoutErrorPayload(gatewayPayload) }),
          }).catch(() => undefined);

          redirectWithTopupStatus('failed', reference, targetReturnUrl);
        },
      });
    } catch (topupError) {
      setError(topupError instanceof Error ? topupError.message : 'Failed to top up wallet');
    } finally {
      setTopupLoading(false);
    }
  };

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
      });

      const payload = (await response.json().catch(() => ({}))) as EventPaymentResult & { error?: string };

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to process payment');
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
              disabled={processing || loadingWallet || !wallet || !hasEnoughBalance}
              className="rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? t.processing : t.payAction}
            </button>
          </div>

          {!loadingWallet && !hasEnoughBalance ? (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">{t.insufficient}</p>
              <p className="text-sm text-amber-800">{t.topupHint}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="number"
                  min="1"
                  step="0.001"
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(event.target.value)}
                  placeholder={t.topupAmount}
                  className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-[color:var(--text)] outline-none ring-0"
                />
                <button
                  type="button"
                  onClick={handleTopup}
                  disabled={topupLoading}
                  className="rounded-full border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {topupLoading ? t.processing : t.topupAction}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
