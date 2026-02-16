'use client';

import { useState, useEffect } from 'react';
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

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/withdrawal-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        alert(locale === "ar" ? "فشل في تحميل طلبات السحب" : "Failed to load withdrawal requests");
      }
    } catch (error) {
      console.error("Error loading withdrawal requests:", error);
      alert(locale === "ar" ? "خطأ في تحميل طلبات السحب" : "Error loading withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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
        alert(locale === "ar"
          ? (action === 'approve' ? 'تمت الموافقة على طلب السحب' : 'تم رفض طلب السحب')
          : (action === 'approve' ? 'Withdrawal request approved' : 'Withdrawal request rejected')
        );
        fetchRequests(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || (locale === "ar" ? "فشل في معالجة الطلب" : "Failed to process request"));
      }
    } catch (error) {
      console.error("Error processing withdrawal request:", error);
      alert(locale === "ar" ? "خطأ في معالجة الطلب" : "Error processing request");
    } finally {
      setProcessingId(null);
    }
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
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-2 disabled:opacity-50"
                          onClick={() => handleProcessRequest(request.id, 'approve')}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (locale === "ar" ? "جاري..." : "Processing...") : (locale === "ar" ? "موافقة" : "Approve")}
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          onClick={() => {
                            const reason = prompt(locale === "ar" ? "سبب الرفض:" : "Reason for rejection:");
                            if (reason !== null) {
                              handleProcessRequest(request.id, 'reject', reason);
                            }
                          }}
                          disabled={processingId === request.id}
                        >
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
  );
}