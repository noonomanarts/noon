'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { FiCheckCircle, FiXCircle, FiX, FiLoader } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type RequestStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface WithdrawalRequest {
  id: string;
  amount: number;
  type: string;
  status: Exclude<RequestStatus, 'ALL'>;
  reason?: string;
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

interface WithdrawalRequestsTableProps {
  locale: Locale;
}

const PAGE_SIZE = 10;

export function WithdrawalRequestsTable({ locale }: WithdrawalRequestsTableProps) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationPayload>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const playNotificationSound = () => {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.07;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.12);
      oscillator.onended = () => {
        audioContext.close();
      };
    } catch {
      // Ignore playback errors
    }
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        status: statusFilter,
      });

      if (debouncedSearch.trim().length > 0) {
        params.set('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/admin/withdrawal-requests?${params.toString()}`);
      if (!response.ok) {
        setToastMessage(locale === 'ar' ? 'فشل في تحميل طلبات السحب' : 'Failed to load withdrawal requests');
        return;
      }

      const data = await response.json();
      setRequests(data.requests ?? []);
      setPagination(data.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } catch (error) {
      console.error('Error loading withdrawal requests:', error);
      setToastMessage(locale === 'ar' ? 'خطأ في تحميل طلبات السحب' : 'Error loading withdrawal requests');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, locale, statusFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!toastMessage) return;

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  useEffect(() => {
    const source = new EventSource('/api/admin/stream');

    const handleUpdate = () => {
      void fetchRequests();
      setToastMessage(locale === 'ar' ? 'تم تحديث طلبات السحب' : 'Withdrawal requests updated');
      playNotificationSound();
    };

    const handleWalletNotification = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (data.type === 'withdrawal_request_submitted') {
          setToastMessage(locale === 'ar' ? 'تم استلام طلب سحب جديد' : 'New withdrawal request received');
          playNotificationSound();
        }
      } catch {
        // Ignore malformed event
      }
    };

    source.addEventListener('withdrawal_requests_updated', handleUpdate as EventListener);
    source.addEventListener('wallet_notification', handleWalletNotification as EventListener);

    return () => {
      source.removeEventListener('withdrawal_requests_updated', handleUpdate as EventListener);
      source.removeEventListener('wallet_notification', handleWalletNotification as EventListener);
      source.close();
    };
  }, [fetchRequests, locale]);

  const handleProcessRequest = async (transactionId: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessingId(transactionId);
    try {
      const response = await fetch('/api/admin/withdrawal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          transactionId,
          reason: reason || undefined,
        }),
      });

      if (response.ok) {
        setToastMessage(locale === 'ar'
          ? (action === 'approve' ? 'تمت الموافقة على طلب السحب' : 'تم رفض طلب السحب')
          : (action === 'approve' ? 'Withdrawal request approved' : 'Withdrawal request rejected')
        );
        await fetchRequests();
      } else {
        const error = await response.json();
        setToastMessage(error.error || (locale === 'ar' ? 'فشل في معالجة الطلب' : 'Failed to process request'));
      }
    } catch (error) {
      console.error('Error processing withdrawal request:', error);
      setToastMessage(locale === 'ar' ? 'خطأ في معالجة الطلب' : 'Error processing request');
    } finally {
      setProcessingId(null);
    }
  };

  const openActionModal = (request: WithdrawalRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setActionReason('');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    if (processingId) return;
    setShowActionModal(false);
    setActionType(null);
    setSelectedRequest(null);
    setActionReason('');
  };

  const submitActionModal = async () => {
    if (!selectedRequest || !actionType) return;
    await handleProcessRequest(selectedRequest.id, actionType, actionReason || undefined);
    setShowActionModal(false);
    setActionType(null);
    setSelectedRequest(null);
    setActionReason('');
  };

  const getStatusColor = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-700 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900/30';
      case 'APPROVED': return 'text-teal-700 bg-teal-100 dark:text-teal-200 dark:bg-teal-900/30';
      case 'REJECTED': return 'text-coral bg-[color:var(--noon-coral-soft)]';
      case 'CANCELLED': return 'text-purple bg-[color:var(--noon-purple-soft)]';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'PENDING': return locale === 'ar' ? 'في الانتظار' : 'Pending';
      case 'APPROVED': return locale === 'ar' ? 'مقبول' : 'Approved';
      case 'REJECTED': return locale === 'ar' ? 'مرفوض' : 'Rejected';
      case 'CANCELLED': return locale === 'ar' ? 'ملغي' : 'Cancelled';
      default: return status;
    }
  };

  return (
    <>
      {toastMessage && (
        <div className={`fixed top-20 ${locale === 'ar' ? 'left-4' : 'right-4'} z-[140]`} aria-live="polite">
          <div className="rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-gray-200/70 dark:border-zinc-700/70 px-4 py-3 shadow-2xl text-sm font-medium text-gray-800 dark:text-zinc-100 backdrop-blur">
            {toastMessage}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {locale === 'ar' ? 'طلبات السحب (الأرشيف الكامل)' : 'Withdrawal Requests (Full History)'}
          </h2>
        </div>

        <div className="px-6 py-4 border-b border-gray-200/70 dark:border-zinc-700/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={locale === 'ar' ? 'بحث بالاسم / الإيميل / الهاتف' : 'Search by name / email / phone'}
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as RequestStatus);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                <option value="ALL">{locale === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
                <option value="PENDING">{locale === 'ar' ? 'في الانتظار' : 'Pending'}</option>
                <option value="APPROVED">{locale === 'ar' ? 'مقبول' : 'Approved'}</option>
                <option value="REJECTED">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                <option value="CANCELLED">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {locale === 'ar' ? `إجمالي السجلات: ${pagination.total}` : `Total records: ${pagination.total}`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-[color:var(--noon-teal)]" />
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              {locale === 'ar' ? 'لا توجد طلبات ضمن الفلتر الحالي' : 'No requests for the selected filter'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'المستخدم' : 'User'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'السبب' : 'Reason'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/60">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          {request.user_profile_image ? (
                            <Image
                              src={request.user_profile_image}
                              alt={request.user_full_name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                              {(request.user_full_name?.charAt(0) || 'U').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{request.user_full_name}</div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400">{request.user_email}</div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400">{request.user_phone_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatAmountWithCurrency(Math.abs(request.amount), 'OMR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-zinc-300 max-w-[280px]">
                      {request.reason?.trim() || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-zinc-200">
                      {new Date(request.created_at).toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'PENDING' ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="noon-btn-teal inline-flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50"
                            onClick={() => openActionModal(request, 'approve')}
                            disabled={processingId === request.id}
                          >
                            <FiCheckCircle className="size-4" />
                            {locale === 'ar' ? 'موافقة' : 'Approve'}
                          </button>
                          <button
                            className="noon-btn-coral inline-flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50"
                            onClick={() => openActionModal(request, 'reject')}
                            disabled={processingId === request.id}
                          >
                            <FiXCircle className="size-4" />
                            {locale === 'ar' ? 'رفض' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-zinc-500">{locale === 'ar' ? 'مؤرشف' : 'Archived'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200/70 px-6 py-4 dark:border-zinc-700/60">
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {locale === 'ar'
              ? `صفحة ${pagination.page} من ${pagination.totalPages}`
              : `Page ${pagination.page} of ${pagination.totalPages}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1 || loading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {locale === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {locale === 'ar' ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {showActionModal && selectedRequest && actionType && (
        <div className="fixed left-0 top-0 z-[150] flex h-[100dvh] w-screen items-center justify-center p-4 bg-black/40 dark:bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-700/70 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200/60 dark:border-zinc-700/60 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {actionType === 'approve'
                  ? (locale === 'ar' ? 'تأكيد الموافقة على الطلب' : 'Confirm Withdrawal Approval')
                  : (locale === 'ar' ? 'تأكيد رفض الطلب' : 'Confirm Withdrawal Rejection')}
              </h3>
              <button
                onClick={closeActionModal}
                disabled={!!processingId}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <FiX className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl p-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200/60 dark:border-zinc-700/60">
                <p className="text-sm text-gray-600 dark:text-zinc-300">
                  {locale === 'ar' ? 'المستخدم' : 'User'}: <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest.user_full_name}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-zinc-300 mt-1">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}: <span className="font-semibold text-gray-900 dark:text-white">{formatAmountWithCurrency(Math.abs(selectedRequest.amount), 'OMR')}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                  {locale === 'ar' ? 'ملاحظة (اختياري)' : 'Note (Optional)'}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={actionType === 'approve'
                    ? (locale === 'ar' ? 'ملاحظة للموافقة' : 'Approval note')
                    : (locale === 'ar' ? 'سبب الرفض' : 'Rejection reason')}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200/60 dark:border-zinc-700/60 flex justify-end gap-3">
              <button
                onClick={closeActionModal}
                disabled={!!processingId}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={submitActionModal}
                disabled={!!processingId}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                  actionType === 'approve' ? 'noon-btn-teal' : 'noon-btn-coral'
                }`}
              >
                {processingId ? <FiLoader className="size-4 animate-spin" /> : null}
                {actionType === 'approve'
                  ? (locale === 'ar' ? 'تأكيد الموافقة' : 'Confirm Approve')
                  : (locale === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
