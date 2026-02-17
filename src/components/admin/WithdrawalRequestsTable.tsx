'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiX, FiLoader } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

interface WithdrawalRequest {
  id: string;
  amount: number;
  type: string;
  status: string;
  reason?: string;
  created_at: string;
  user_full_name: string;
  user_email: string;
  user_phone_number: string;
}

interface WithdrawalRequestsTableProps {
  locale: Locale;
}

export function WithdrawalRequestsTable({ locale }: WithdrawalRequestsTableProps) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionReason, setActionReason] = useState('');

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
    try {
      const response = await fetch('/api/admin/withdrawal-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        setToastMessage(locale === "ar" ? "فشل في تحميل طلبات السحب" : "Failed to load withdrawal requests");
      }
    } catch (error) {
      console.error("Error loading withdrawal requests:", error);
      setToastMessage(locale === "ar" ? "خطأ في تحميل طلبات السحب" : "Error loading withdrawal requests");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const source = new EventSource('/api/admin/stream');
    const handleUpdate = () => {
      fetchRequests();
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
        setToastMessage(locale === "ar"
          ? (action === 'approve' ? 'تمت الموافقة على طلب السحب' : 'تم رفض طلب السحب')
          : (action === 'approve' ? 'Withdrawal request approved' : 'Withdrawal request rejected')
        );
        fetchRequests(); // Refresh the list
      } else {
        const error = await response.json();
        setToastMessage(error.error || (locale === "ar" ? "فشل في معالجة الطلب" : "Failed to process request"));
      }
    } catch (error) {
      console.error("Error processing withdrawal request:", error);
      setToastMessage(locale === "ar" ? "خطأ في معالجة الطلب" : "Error processing request");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return locale === "ar" ? 'في الانتظار' : 'Pending';
      case 'APPROVED': return locale === "ar" ? 'مُعتمد' : 'Approved';
      case 'REJECTED': return locale === "ar" ? 'مرفوض' : 'Rejected';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {locale === "ar" ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {toastMessage && (
        <div className={`fixed top-4 ${locale === 'ar' ? 'left-4' : 'right-4'} z-[140]`} aria-live="polite">
          <div className="rounded-xl bg-white/95 dark:bg-gray-800/95 border border-gray-200/70 dark:border-gray-700/70 px-4 py-3 shadow-2xl text-sm font-medium text-gray-800 dark:text-gray-100 backdrop-blur">
            {toastMessage}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          {locale === "ar" ? "طلبات سحب الأموال" : "Withdrawal Requests"}
        </h2>
      </div>

      <div className="overflow-x-auto">
        {requests.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {locale === "ar" ? "لا توجد طلبات سحب" : "No withdrawal requests"}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "المستخدم" : "User"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "المبلغ" : "Amount"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "التاريخ" : "Date"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "الحالة" : "Status"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {request.user_full_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {request.user_email}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {request.user_phone_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {Math.abs(request.amount).toFixed(3)} OMR
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(request.created_at).toLocaleDateString(locale === "ar" ? "ar-OM" : "en-US")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {request.status === 'PENDING' && (
                      <>
                        <button
                          className="noon-btn-teal inline-flex items-center gap-2 px-3 py-1.5 text-sm mr-2 disabled:opacity-50 transition-colors"
                          onClick={() => openActionModal(request, 'approve')}
                          disabled={processingId === request.id}
                        >
                          <FiCheckCircle className="size-4" />
                          {locale === "ar" ? "موافقة" : "Approve"}
                        </button>
                        <button
                          className="noon-btn-coral inline-flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
                          onClick={() => openActionModal(request, 'reject')}
                          disabled={processingId === request.id}
                        >
                          <FiXCircle className="size-4" />
                          {locale === "ar" ? "رفض" : "Reject"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>

      {showActionModal && selectedRequest && actionType && (
        <div className="fixed left-0 top-0 z-[150] flex h-[100dvh] w-screen items-center justify-center p-4 bg-black/40 dark:bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {actionType === 'approve'
                  ? (locale === 'ar' ? 'تأكيد الموافقة على الطلب' : 'Confirm Withdrawal Approval')
                  : (locale === 'ar' ? 'تأكيد رفض الطلب' : 'Confirm Withdrawal Rejection')}
              </h3>
              <button
                onClick={closeActionModal}
                disabled={!!processingId}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiX className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200/60 dark:border-gray-700/60">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {locale === 'ar' ? 'المستخدم' : 'User'}: <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest.user_full_name}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}: <span className="font-semibold text-gray-900 dark:text-white">{Math.abs(selectedRequest.amount).toFixed(3)} OMR</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {locale === 'ar' ? 'ملاحظة (اختياري)' : 'Note (Optional)'}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={actionType === 'approve'
                    ? (locale === 'ar' ? 'ملاحظة للموافقة' : 'Approval note')
                    : (locale === 'ar' ? 'سبب الرفض' : 'Rejection reason')}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200/60 dark:border-gray-700/60 flex justify-end gap-3">
              <button
                onClick={closeActionModal}
                disabled={!!processingId}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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