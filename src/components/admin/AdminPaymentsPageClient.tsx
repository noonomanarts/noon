'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/locale';

type PaymentStatus = 'ALL' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

interface TopupPayment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  gateway: string;
  gateway_transaction_id: string | null;
  status: Exclude<PaymentStatus, 'ALL'>;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  user_full_name: string;
  user_email: string;
  user_phone_number: string;
  user_profile_image: string | null;
}

interface PaginationPayload {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminPaymentsPageClientProps {
  locale: Locale;
}

export default function AdminPaymentsPageClient({ locale }: AdminPaymentsPageClientProps) {
  const [payments, setPayments] = useState<TopupPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingReference, setProcessingReference] = useState<string | null>(null);
  const [failureReasonByReference, setFailureReasonByReference] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('ALL');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationPayload>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        status,
      });

      if (debouncedSearch.trim().length > 0) {
        params.set('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load payments');
      }

      const data = await response.json();
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
      setPagination(data?.pagination ?? { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, status]);

  const simulateStatus = async (
    reference: string,
    nextStatus: Exclude<PaymentStatus, 'ALL'>,
    failureReason?: string
  ) => {
    setProcessingReference(reference);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/payments/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, status: nextStatus, failureReason }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Sandbox simulation failed');
      }

      setInfo(
        locale === 'ar'
          ? `تم تحديث الحالة تجريبياً إلى ${nextStatus}.`
          : `Sandbox status updated to ${nextStatus}.`
      );
      if (nextStatus === 'FAILED') {
        setFailureReasonByReference((prev) => ({ ...prev, [reference]: '' }));
      }
      await fetchPayments();
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : 'Sandbox simulation failed');
    } finally {
      setProcessingReference(null);
    }
  };

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const statusBadge = (paymentStatus: Exclude<PaymentStatus, 'ALL'>) => {
    const styles: Record<Exclude<PaymentStatus, 'ALL'>, string> = {
      PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      FAILED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
      CANCELLED: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
    };

    return styles[paymentStatus];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {locale === 'ar' ? 'مدفوعات شحن المحافظ' : 'Wallet Top-up Payments'}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {locale === 'ar'
            ? 'جميع عمليات شحن المحافظ من بوابات الدفع (حاليًا جاهز للتكامل)'
            : 'All wallet top-up payment records from payment gateways (integration-ready).'}
        </p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          {locale === 'ar'
            ? 'Sandbox: يمكنك محاكاة نجاح/فشل الدفع من الجدول حتى قبل ربط البوابة الحقيقية.'
            : 'Sandbox: You can simulate payment success/failure from the table before real gateway integration.'}
        </p>
      </div>

      {info && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالاسم/البريد/المرجع/رقم المعاملة' : 'Search by name/email/reference/txn id'}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentStatus);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="ALL">{locale === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            <option value="PENDING">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
            <option value="PAID">{locale === 'ar' ? 'مدفوع' : 'Paid'}</option>
            <option value="FAILED">{locale === 'ar' ? 'فاشل' : 'Failed'}</option>
            <option value="CANCELLED">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
          </select>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {locale === 'ar' ? `إجمالي السجلات: ${pagination.total}` : `Total records: ${pagination.total}`}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        {loading ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {locale === 'ar' ? 'جاري تحميل المدفوعات...' : 'Loading payments...'}
          </div>
        ) : error && payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {locale === 'ar'
              ? 'لا توجد بيانات مدفوعات حتى الآن. عند ربط بوابة الدفع ستظهر هنا تلقائيًا.'
              : 'No payment records yet. Once payment gateway is connected, records will appear here automatically.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{locale === 'ar' ? 'البوابة' : 'Gateway'}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{locale === 'ar' ? 'التاريخ' : 'Created At'}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{locale === 'ar' ? 'Sandbox' : 'Sandbox'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          {payment.user_profile_image ? (
                            <Image src={payment.user_profile_image} alt={payment.user_full_name} fill sizes="36px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                              {(payment.user_full_name?.charAt(0) || 'U').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{payment.user_full_name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{payment.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{payment.reference}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-900 dark:text-white">{payment.amount.toFixed(3)} {payment.currency}</td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{payment.gateway}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{new Date(payment.created_at).toLocaleString(locale === 'ar' ? 'ar-OM' : 'en-US')}</td>
                    <td className="px-6 py-4">
                      {payment.status === 'PENDING' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => simulateStatus(payment.reference, 'PAID')}
                              disabled={processingReference === payment.reference}
                              className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {locale === 'ar' ? 'محاكاة نجاح' : 'Simulate Paid'}
                            </button>
                            <button
                              onClick={() =>
                                simulateStatus(
                                  payment.reference,
                                  'FAILED',
                                  failureReasonByReference[payment.reference]?.trim() || undefined
                                )
                              }
                              disabled={processingReference === payment.reference}
                              className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {locale === 'ar' ? 'محاكاة فشل' : 'Simulate Failed'}
                            </button>
                            <button
                              onClick={() => simulateStatus(payment.reference, 'CANCELLED')}
                              disabled={processingReference === payment.reference}
                              className="rounded-md bg-zinc-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {locale === 'ar' ? 'محاكاة إلغاء' : 'Simulate Cancelled'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={failureReasonByReference[payment.reference] ?? ''}
                            onChange={(e) =>
                              setFailureReasonByReference((prev) => ({
                                ...prev,
                                [payment.reference]: e.target.value,
                              }))
                            }
                            placeholder={locale === 'ar' ? 'سبب الفشل (اختياري)' : 'Failure reason (optional)'}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {locale === 'ar' ? 'مكتمل' : 'Done'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {locale === 'ar' ? `صفحة ${pagination.page} من ${pagination.totalPages}` : `Page ${pagination.page} of ${pagination.totalPages}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={loading || pagination.page <= 1}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
            >
              {locale === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={loading || pagination.page >= pagination.totalPages}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
            >
              {locale === 'ar' ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
