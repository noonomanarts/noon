'use client';

import { AnimatedTabs } from '@/components/ui/AnimatedTabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

type PaymentSource = 'WALLET_TOPUP' | 'CLASS_BOOKING' | 'EVENT_BOOKING' | 'SHOP_ORDER';
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
type StatusFilter = 'ALL' | PaymentStatus;
type SourceFilter = 'ALL' | PaymentSource;

interface PaymentRow {
  key: string;
  source: PaymentSource;
  id: string;
  reference: string;
  related_id: string | null;
  title: string | null;
  title_ar: string | null;
  amount: number;
  currency: string;
  method: string | null;
  status: PaymentStatus;
  gateway_transaction_id: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  activity_at: string;
  user_id: string | null;
  user_full_name: string;
  user_email: string | null;
  user_phone_number: string | null;
  user_profile_image: string | null;
}

interface PaginationPayload {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SummaryPayload {
  paidAmount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  totalCount: number;
}

interface AdminPaymentsPageClientProps {
  locale: Locale;
  initialSearch?: string;
  initialSource?: string;
}

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30_000;

const SOURCES: PaymentSource[] = ['WALLET_TOPUP', 'CLASS_BOOKING', 'EVENT_BOOKING', 'SHOP_ORDER'];
const STATUSES: PaymentStatus[] = ['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'];

const emptySummary: SummaryPayload = { paidAmount: 0, paidCount: 0, pendingCount: 0, failedCount: 0, totalCount: 0 };

const statusStyles: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  FAILED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  CANCELLED: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
  REFUNDED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
};

const sourceStyles: Record<PaymentSource, string> = {
  WALLET_TOPUP: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-300',
  CLASS_BOOKING: 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900/50 dark:bg-teal-900/20 dark:text-teal-300',
  EVENT_BOOKING: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-300',
  SHOP_ORDER: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300',
};

export default function AdminPaymentsPageClient({
  locale,
  initialSearch = '',
  initialSource = 'ALL',
}: AdminPaymentsPageClientProps) {
  const isArabic = locale === 'ar';
  const { confirm } = useAppFeedback();

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<SummaryPayload>(emptySummary);
  const [sandboxEnabled, setSandboxEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingReference, setProcessingReference] = useState<string | null>(null);
  const [batchReprocessing, setBatchReprocessing] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [source, setSource] = useState<SourceFilter>(
    SOURCES.includes(initialSource.toUpperCase() as PaymentSource) ? (initialSource.toUpperCase() as PaymentSource) : 'ALL'
  );
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [pagination, setPagination] = useState<PaginationPayload>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  // Every request gets a sequence number; only the newest response is applied,
  // so a slow earlier request can never overwrite fresher results.
  const requestSeq = useRef(0);
  const hasLoadedOnce = useRef(false);

  const text = {
    title: isArabic ? 'المدفوعات' : 'Payments',
    subtitle: isArabic
      ? 'كل المدفوعات في مكان واحد: شحن المحافظ، حجوزات الورش، حجوزات الفعاليات وطلبات المتجر.'
      : 'Every payment in one place: wallet top-ups, class bookings, event bookings and shop orders.',
    refresh: isArabic ? 'تحديث' : 'Refresh',
    live: isArabic ? 'تحديث تلقائي' : 'Auto-updating',
    lastUpdated: isArabic ? 'آخر تحديث' : 'Last updated',
    paidAmount: isArabic ? 'إجمالي المدفوع' : 'Total paid',
    paidCount: isArabic ? 'مدفوعات ناجحة' : 'Successful',
    pendingCount: isArabic ? 'قيد الانتظار' : 'Pending',
    failedCount: isArabic ? 'فاشلة' : 'Failed',
    searchPlaceholder: isArabic
      ? 'بحث بالاسم، البريد، الهاتف، المرجع أو رقم المعاملة'
      : 'Search by name, email, phone, reference or transaction ID',
    allStatuses: isArabic ? 'كل الحالات' : 'All statuses',
    allSources: isArabic ? 'الكل' : 'All',
    reprocess: isArabic ? 'إعادة فحص المعلّق' : 'Recheck pending top-ups',
    reprocessing: isArabic ? 'جارٍ التحقق...' : 'Checking...',
    loading: isArabic ? 'جاري تحميل المدفوعات...' : 'Loading payments...',
    empty: isArabic ? 'لا توجد مدفوعات مطابقة.' : 'No payments match these filters.',
    clearFilters: isArabic ? 'مسح الفلاتر' : 'Clear filters',
    retry: isArabic ? 'إعادة المحاولة' : 'Try again',
    customer: isArabic ? 'العميل' : 'Customer',
    type: isArabic ? 'النوع' : 'Type',
    reference: isArabic ? 'المرجع' : 'Reference',
    amount: isArabic ? 'المبلغ' : 'Amount',
    method: isArabic ? 'طريقة الدفع' : 'Method',
    status: isArabic ? 'الحالة' : 'Status',
    date: isArabic ? 'التاريخ' : 'Date',
    actions: isArabic ? 'إجراءات' : 'Actions',
    guest: isArabic ? 'ضيف' : 'Guest',
    open: isArabic ? 'فتح' : 'Open',
    checkGateway: isArabic ? 'فحص من البوابة' : 'Check gateway',
    markPaid: isArabic ? 'تأكيد الدفع يدوياً' : 'Mark as paid',
    markFailed: isArabic ? 'تحديد كفاشل' : 'Mark as failed',
    markCancelled: isArabic ? 'إلغاء' : 'Cancel',
    previous: isArabic ? 'السابق' : 'Previous',
    next: isArabic ? 'التالي' : 'Next',
    loadFailed: isArabic ? 'تعذّر تحميل المدفوعات.' : 'Failed to load payments.',
    actionFailed: isArabic ? 'تعذّر تنفيذ الإجراء.' : 'The action could not be completed.',
  };

  const sourceLabel = (value: PaymentSource): string => {
    const labels: Record<PaymentSource, [string, string]> = {
      WALLET_TOPUP: ['Wallet top-up', 'شحن محفظة'],
      CLASS_BOOKING: ['Class booking', 'حجز ورشة'],
      EVENT_BOOKING: ['Event booking', 'حجز فعالية'],
      SHOP_ORDER: ['Shop order', 'طلب متجر'],
    };
    return labels[value][isArabic ? 1 : 0];
  };

  const statusLabel = (value: PaymentStatus): string => {
    const labels: Record<PaymentStatus, [string, string]> = {
      PENDING: ['Pending', 'قيد الانتظار'],
      PAID: ['Paid', 'مدفوع'],
      FAILED: ['Failed', 'فاشل'],
      CANCELLED: ['Cancelled', 'ملغي'],
      REFUNDED: ['Refunded', 'مُسترد'],
    };
    return labels[value][isArabic ? 1 : 0];
  };

  const methodLabel = (value: string | null): string => {
    if (!value) return '—';
    const labels: Record<string, [string, string]> = {
      ONLINE: ['Online card', 'بطاقة إلكترونية'],
      AMWAL: ['Online card (Amwal)', 'بطاقة إلكترونية (أموال)'],
      WALLET: ['Wallet', 'المحفظة'],
      BANK_TRANSFER: ['Bank transfer', 'تحويل بنكي'],
      CASH: ['Cash', 'نقداً'],
      PAYMENT_LINK: ['Payment link', 'رابط دفع'],
      PENDING_GATEWAY: ['Not started', 'لم يبدأ'],
    };
    const match = labels[value.toUpperCase()];
    return match ? match[isArabic ? 1 : 0] : value;
  };

  const detailsHref = (payment: PaymentRow): string | null => {
    if (payment.source === 'CLASS_BOOKING' && payment.related_id) {
      return `/${locale}/admin/classes/${payment.related_id}`;
    }
    if (payment.source === 'EVENT_BOOKING' && payment.related_id) {
      return `/${locale}/admin/events/${payment.related_id}`;
    }
    if (payment.source === 'SHOP_ORDER' && payment.related_id) {
      return `/${locale}/admin/shop/orders/${payment.related_id}`;
    }
    return null;
  };

  const formatDate = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(isArabic ? 'ar-OM-u-nu-latn' : 'en-GB', {
      timeZone: 'Asia/Muscat',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchPayments = useCallback(
    async (options?: { silent?: boolean }) => {
      const seq = ++requestSeq.current;
      const silent = Boolean(options?.silent) && hasLoadedOnce.current;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          status,
          source,
        });

        if (debouncedSearch.length > 0) {
          params.set('search', debouncedSearch);
        }

        const response = await fetch(`/api/admin/payments?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));

        if (seq !== requestSeq.current) return;

        if (!response.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load payments');
        }

        const nextPagination: PaginationPayload = data?.pagination ?? {
          page: 1,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 1,
        };

        setPayments(Array.isArray(data?.payments) ? data.payments : []);
        setSummary(data?.summary ?? emptySummary);
        setSandboxEnabled(Boolean(data?.sandboxEnabled));
        setPagination(nextPagination);
        setLastUpdatedAt(new Date());
        setError(null);
        hasLoadedOnce.current = true;

        // Rows were removed or filtered away and this page no longer exists.
        if (page > nextPagination.totalPages) {
          setPage(nextPagination.totalPages);
        }
      } catch (fetchError) {
        if (seq !== requestSeq.current) return;
        // A background refresh that fails keeps the rows already on screen.
        if (!silent) {
          setError(isArabic ? 'تعذّر تحميل المدفوعات.' : 'Failed to load payments.');
          setPayments([]);
        }
        console.error('Failed to load admin payments:', fetchError);
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedSearch, isArabic, page, source, status]
  );

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  // Live updates: server-sent events when available, plus a slow poll as a
  // safety net (events are in-memory and do not cross server instances).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void fetchPayments({ silent: true });
      }
    };

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/admin/stream');
      eventSource.addEventListener('payments_updated', refresh);
      eventSource.addEventListener('wallet_updated', refresh);
    } catch {
      eventSource = null;
    }

    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      eventSource?.close();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchPayments]);

  const updateTopupStatus = async (reference: string, nextStatus: 'PAID' | 'FAILED' | 'CANCELLED') => {
    const confirmed = await confirm({
      title:
        nextStatus === 'PAID'
          ? (isArabic ? 'تأكيد الدفع يدوياً؟' : 'Mark this top-up as paid?')
          : (isArabic ? 'تغيير حالة عملية الشحن؟' : 'Change this top-up status?'),
      message:
        nextStatus === 'PAID'
          ? (isArabic
              ? `سيُضاف المبلغ إلى محفظة العميل فوراً ولا يمكن التراجع. استخدم هذا فقط بعد التأكد من استلام المبلغ فعلياً. المرجع: ${reference}`
              : `The amount will be credited to the customer's wallet immediately and this cannot be undone. Only do this after confirming the money was actually received. Reference: ${reference}`)
          : (isArabic
              ? `سيتم تحديد عملية الشحن ${reference} كـ${statusLabel(nextStatus)}.`
              : `Top-up ${reference} will be marked as ${statusLabel(nextStatus).toLowerCase()}.`),
      confirmLabel: isArabic ? 'تأكيد' : 'Confirm',
      cancelLabel: isArabic ? 'رجوع' : 'Back',
      tone: 'danger',
    });
    if (!confirmed) return;

    setProcessingReference(reference);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/payments/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, status: nextStatus }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : text.actionFailed);
      }

      setInfo(
        isArabic
          ? `تم تحديث ${reference} إلى: ${statusLabel(nextStatus)}.`
          : `${reference} was updated to ${statusLabel(nextStatus).toLowerCase()}.`
      );
      await fetchPayments({ silent: true });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : text.actionFailed);
    } finally {
      setProcessingReference(null);
    }
  };

  const reprocessPendingTopups = async (reference?: string) => {
    if (reference) {
      setProcessingReference(reference);
    } else {
      setBatchReprocessing(true);
    }

    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/payments/wallet-topups/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reference ? { reference } : { limit: 50 }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : text.actionFailed);
      }

      if (reference) {
        const reprocessed = Boolean(payload?.reprocessed);
        const reason = typeof payload?.reason === 'string' ? payload.reason : '';
        const reasonText: Record<string, [string, string]> = {
          missing_raw_payload: [
            'The gateway never sent a result for this top-up (the customer most likely closed the payment window).',
            'لم ترسل البوابة أي نتيجة لهذه العملية (غالباً أغلق العميل نافذة الدفع).',
          ],
          still_pending: ['The gateway still reports this payment as pending.', 'ما زالت البوابة تعتبر العملية قيد الانتظار.'],
          merchant_mismatch: ['The gateway response belongs to a different merchant.', 'ردّ البوابة يخص تاجراً آخر.'],
          not_pending: ['This top-up is no longer pending.', 'هذه العملية لم تعد قيد الانتظار.'],
        };
        const explanation = reasonText[reason]?.[isArabic ? 1 : 0] ?? reason;
        setInfo(
          reprocessed
            ? (isArabic ? `تم تحديث حالة ${reference}.` : `${reference} was updated.`)
            : (isArabic ? `لم تتغير حالة ${reference}. ${explanation}` : `${reference} was not changed. ${explanation}`)
        );
      } else {
        const processedCount = typeof payload?.processedCount === 'number' ? payload.processedCount : 0;
        const reprocessedCount = typeof payload?.reprocessedCount === 'number' ? payload.reprocessedCount : 0;
        setInfo(
          isArabic
            ? `تمت مراجعة ${processedCount} عملية معلّقة وتحديث ${reprocessedCount} منها.`
            : `Checked ${processedCount} pending top-ups and updated ${reprocessedCount}.`
        );
      }

      await fetchPayments({ silent: true });
    } catch (reprocessError) {
      setError(reprocessError instanceof Error ? reprocessError.message : text.actionFailed);
    } finally {
      if (reference) {
        setProcessingReference(null);
      } else {
        setBatchReprocessing(false);
      }
    }
  };

  const hasActiveFilters = status !== 'ALL' || source !== 'ALL' || search.trim().length > 0;

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('ALL');
    setSource('ALL');
    setPage(1);
  };

  const summaryCurrency = payments[0]?.currency ?? 'OMR';
  const cellHead = 'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{text.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{text.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
            <span className="me-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" aria-hidden="true" />
            {text.live}
            {lastUpdatedAt
              ? ` · ${text.lastUpdated} ${lastUpdatedAt.toLocaleTimeString(isArabic ? 'ar-OM-u-nu-latn' : 'en-GB', {
                  timeZone: 'Asia/Muscat',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
          <button
            type="button"
            onClick={() => void fetchPayments({ silent: true })}
            disabled={loading || refreshing}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {refreshing ? text.reprocessing : text.refresh}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: text.paidAmount, value: formatAmountWithCurrency(summary.paidAmount, summaryCurrency), tone: 'text-emerald-700 dark:text-emerald-300' },
          { label: text.paidCount, value: String(summary.paidCount), tone: 'text-zinc-900 dark:text-white' },
          { label: text.pendingCount, value: String(summary.pendingCount), tone: 'text-amber-700 dark:text-amber-300' },
          { label: text.failedCount, value: String(summary.failedCount), tone: 'text-rose-700 dark:text-rose-300' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{card.label}</p>
            <p className={`mt-1 text-xl font-bold ${card.tone}`} dir="ltr">{card.value}</p>
          </div>
        ))}
      </div>

      {info && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      )}

      {error && payments.length > 0 && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <AnimatedTabs
          variant="solid"
          size="sm"
          ariaLabel={text.type}
          value={source}
          onValueChange={(next) => {
            setSource(next);
            setPage(1);
          }}
          items={(['ALL', ...SOURCES] as SourceFilter[]).map((value) => ({
            value,
            label: value === 'ALL' ? text.allSources : sourceLabel(value),
          }))}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={text.searchPlaceholder}
            placeholder={text.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
          <select
            value={status}
            aria-label={text.status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="shrink-0 rounded-lg md:w-44 border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="ALL">{text.allStatuses}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void reprocessPendingTopups()}
            disabled={loading || batchReprocessing}
            className="shrink-0 rounded-lg border border-[color:var(--noon-teal)] px-3 py-2 text-sm font-semibold text-[color:var(--noon-teal)] hover:bg-[color:var(--noon-teal)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {batchReprocessing ? text.reprocessing : text.reprocess}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        {loading && payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">{text.loading}</div>
        ) : error && payments.length === 0 ? (
          <div className="space-y-3 p-10 text-center" role="alert">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <button
              type="button"
              onClick={() => void fetchPayments()}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {text.retry}
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="space-y-3 p-10 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{text.empty}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {text.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  <th scope="col" className={cellHead}>{text.customer}</th>
                  <th scope="col" className={cellHead}>{text.type}</th>
                  <th scope="col" className={cellHead}>{text.reference}</th>
                  <th scope="col" className={cellHead}>{text.amount}</th>
                  <th scope="col" className={cellHead}>{text.method}</th>
                  <th scope="col" className={cellHead}>{text.status}</th>
                  <th scope="col" className={cellHead}>{text.date}</th>
                  <th scope="col" className={cellHead}>{text.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {payments.map((payment) => {
                  const href = detailsHref(payment);
                  const displayName = payment.user_full_name || text.guest;
                  const title = (isArabic ? payment.title_ar : null) || payment.title;
                  const busy = processingReference === payment.reference || batchReprocessing;
                  const isPendingTopup = payment.source === 'WALLET_TOPUP' && payment.status === 'PENDING';

                  return (
                    <tr key={payment.key} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            {payment.user_profile_image ? (
                              <Image src={payment.user_profile_image} alt="" fill sizes="36px" className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{displayName}</p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">
                              {payment.user_email || payment.user_phone_number || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${sourceStyles[payment.source]}`}>
                          {sourceLabel(payment.source)}
                        </span>
                        {title && payment.source === 'CLASS_BOOKING' ? (
                          <p className="mt-1 max-w-[14rem] truncate text-xs text-zinc-500 dark:text-zinc-400">{title}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <span dir="ltr" className="font-mono-ref whitespace-nowrap">{payment.reference}</span>
                        {payment.gateway_transaction_id && payment.gateway_transaction_id !== payment.reference ? (
                          <p className="mt-0.5 max-w-[12rem] truncate text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">
                            {payment.gateway_transaction_id}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-white" dir="ltr">
                        {formatAmountWithCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{methodLabel(payment.method)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[payment.status] ?? statusStyles.PENDING}`}>
                          {statusLabel(payment.status)}
                        </span>
                        {payment.failure_reason ? (
                          <p className="mt-1 max-w-[14rem] text-xs text-rose-600 dark:text-rose-400">{payment.failure_reason}</p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{formatDate(payment.activity_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {href ? (
                            <Link
                              href={href}
                              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              {text.open}
                            </Link>
                          ) : null}
                          {isPendingTopup ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void reprocessPendingTopups(payment.reference)}
                                disabled={busy}
                                className="rounded-md border border-[color:var(--noon-teal)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--noon-teal)] hover:bg-[color:var(--noon-teal)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processingReference === payment.reference ? text.reprocessing : text.checkGateway}
                              </button>
                              <button
                                type="button"
                                onClick={() => void updateTopupStatus(payment.reference, 'PAID')}
                                disabled={busy}
                                className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {text.markPaid}
                              </button>
                              <button
                                type="button"
                                onClick={() => void updateTopupStatus(payment.reference, 'FAILED')}
                                disabled={busy}
                                className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              >
                                {text.markFailed}
                              </button>
                              {sandboxEnabled ? (
                                <button
                                  type="button"
                                  onClick={() => void updateTopupStatus(payment.reference, 'CANCELLED')}
                                  disabled={busy}
                                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                  {text.markCancelled}
                                </button>
                              ) : null}
                            </>
                          ) : null}
                          {!href && !isPendingTopup ? <span className="text-xs text-zinc-400">—</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isArabic
              ? `صفحة ${pagination.page} من ${pagination.totalPages} · ${pagination.total} سجل`
              : `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} records`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={loading || page <= 1}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
            >
              {text.previous}
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={loading || page >= pagination.totalPages}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
            >
              {text.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
