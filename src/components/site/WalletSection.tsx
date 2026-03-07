'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Wallet, WalletTransaction } from '@/lib/db/types';
import { formatNotificationContent } from '@/lib/notifications/formatNotification';

interface WalletSectionProps {
  wallet: Wallet;
  transactions: WalletTransaction[];
  locale: 'en' | 'ar';
}

export function WalletSection({ wallet, transactions, locale }: WalletSectionProps) {
  const [walletData, setWalletData] = useState(wallet);
  const [transactionsData, setTransactionsData] = useState(transactions);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cancelingTransactionId, setCancelingTransactionId] = useState<string | null>(null);

  const isArabic = locale === 'ar';
  const transactionsPerPage = 8;
  const blockedBalance = walletData.blocked_balance ?? 0;

  const transactionsTotalPages = Math.max(1, Math.ceil(transactionsData.length / transactionsPerPage));
  const effectiveTransactionsPage = Math.min(transactionsPage, transactionsTotalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (effectiveTransactionsPage - 1) * transactionsPerPage;
    return transactionsData.slice(start, start + transactionsPerPage);
  }, [transactionsData, effectiveTransactionsPage]);

  const playNotificationSound = () => {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 740;
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

  useEffect(() => {
    setWalletData(wallet);
    setTransactionsData(transactions);
  }, [wallet, transactions]);

  const refreshWalletBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      if (!response.ok) return;
      const data = await response.json();
      setWalletData((prev) => ({
        ...prev,
        balance: typeof data.balance === 'number' ? data.balance : prev.balance,
        available_balance: typeof data.available_balance === 'number' ? data.available_balance : prev.available_balance,
        blocked_balance: typeof data.blocked_balance === 'number' ? data.blocked_balance : prev.blocked_balance,
        currency: typeof data.currency === 'string' ? data.currency : prev.currency,
      }));
    } catch {
      // ignore refresh errors
    }
  }, []);

  useEffect(() => {
    const source = new EventSource('/api/stream');

    const handleWalletUpdated = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          balance?: number;
          available_balance?: number;
          blocked_balance?: number;
          currency?: string;
        };

        setWalletData((prev) => ({
          ...prev,
          balance: data.balance ?? prev.balance,
          available_balance: data.available_balance ?? prev.available_balance,
          blocked_balance: data.blocked_balance ?? prev.blocked_balance,
          currency: data.currency ?? prev.currency,
        }));
        if (typeof data.balance !== 'number' || typeof data.available_balance !== 'number') {
          void refreshWalletBalance();
        }
      } catch {
        // Ignore malformed event
      }
    };

    const handleWalletNotification = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { messageEn?: string; messageAr?: string };
        const text = isArabic ? data.messageAr : data.messageEn;
        if (text) {
          setMessage(text);
          playNotificationSound();
        }
        void refreshWalletBalance();
      } catch {
        // Ignore malformed event
      }
    };

    const handleNotificationCreated = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          notification?: {
            type?: string;
            title?: string;
            message?: string;
            data?: Record<string, unknown> | null;
          };
        };
        const notification = data.notification;
        const localized = notification?.type
          ? formatNotificationContent(
              {
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
              },
              locale
            )
          : null;
        const text = localized?.message || notification?.message || notification?.title;
        if (text) {
          setMessage(text);
          playNotificationSound();
        }
      } catch {
        // Ignore malformed event
      }
    };

    source.addEventListener('wallet_updated', handleWalletUpdated as EventListener);
    source.addEventListener('wallet_notification', handleWalletNotification as EventListener);
    source.addEventListener('notification_created', handleNotificationCreated as EventListener);

    return () => {
      source.removeEventListener('wallet_updated', handleWalletUpdated as EventListener);
      source.removeEventListener('wallet_notification', handleWalletNotification as EventListener);
      source.removeEventListener('notification_created', handleNotificationCreated as EventListener);
      source.close();
    };
  }, [isArabic, locale, refreshWalletBalance]);

  const handleDeposit = () => {
    setDepositAmount('');
    setDepositDescription('');
    setShowDepositModal(true);
  };

  const handleWithdraw = () => {
    setWithdrawAmount('');
    setWithdrawDescription('');
    setShowWithdrawModal(true);
  };

  const submitDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setMessage(isArabic ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          gateway: 'SANDBOX_GATEWAY',
          metadata: {
            description: depositDescription || undefined,
            source: 'wallet_section',
            locale,
          },
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const reference = payload?.payment?.reference;
        if (!reference) {
          setMessage(isArabic ? 'تعذر إنشاء رابط الدفع.' : 'Failed to create payment link.');
          return;
        }

        const returnUrl = `/${locale}/account/wallet`;
        setShowDepositModal(false);
        setMessage(isArabic ? 'سيتم تحويلك الآن لبوابة الدفع التجريبية.' : 'Redirecting you to sandbox payment gateway.');
        window.location.href = `/${locale}/wallet/topup/sandbox?reference=${encodeURIComponent(reference)}&returnUrl=${encodeURIComponent(returnUrl)}`;
      } else {
        const data = await response.json();
        setMessage(data.error || (isArabic ? 'فشل في إنشاء عملية الشحن' : 'Failed to create top-up request'));
      }
    } catch {
      setMessage(isArabic ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const submitWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setMessage(isArabic ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > (walletData.available_balance || 0)) {
      setMessage(isArabic ? 'المقدار القابل للسحب غير كافٍ' : 'Insufficient withdrawable amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          reason: withdrawDescription || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const requestedAmount = parseFloat(withdrawAmount);
        setWalletData((prev) => ({
          ...prev,
          balance: Math.max(0, prev.balance - requestedAmount),
          available_balance: Math.max(0, (prev.available_balance || 0) - requestedAmount),
          blocked_balance: (prev.blocked_balance || 0) + requestedAmount,
        }));
        void refreshWalletBalance();
        if (data?.transaction) {
          setTransactionsData((prev) => [
            {
              id: data.transaction.id,
              wallet_id: walletData.id,
              amount: data.transaction.amount,
              type: 'WITHDRAWAL_REQUEST',
              reason: withdrawDescription || null,
              status: data.transaction.status || 'PENDING',
              created_at: data.transaction.created_at ? new Date(data.transaction.created_at) : new Date(),
            },
            ...prev,
          ]);
        }
        setMessage(isArabic ? 'تم إرسال طلب السحب بنجاح. سيتم مراجعته من قبل الإدارة.' : 'Withdrawal request submitted successfully. It will be reviewed by administration.');
        setShowWithdrawModal(false);
      } else {
        const data = await response.json();
        setMessage(data.error || (isArabic ? 'فشل في إرسال طلب السحب' : 'Failed to submit withdrawal request'));
      }
    } catch {
      setMessage(isArabic ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) {
      setMessage(isArabic ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPhone: transferTo,
          amount: Number(transferAmount),
          reason: transferReason,
        }),
      });

      if (response.ok) {
        setMessage(isArabic ? 'تم التحويل بنجاح' : 'Transfer successful');
        setShowTransfer(false);
        setTransferAmount('');
        setTransferTo('');
        setTransferReason('');
        void refreshWalletBalance();
      } else {
        const data = await response.json();
        setMessage(data.error || (isArabic ? 'فشل في التحويل' : 'Transfer failed'));
      }
    } catch {
      setMessage(isArabic ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelWithdrawalRequest = async (transactionId: string) => {
    setCancelingTransactionId(transactionId);
    try {
      const response = await fetch('/api/wallet/withdraw/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setMessage(data.error || (isArabic ? 'فشل في إلغاء طلب السحب' : 'Failed to cancel withdrawal request'));
        return;
      }

      setTransactionsData((prev) =>
        prev.map((item) =>
          item.id === transactionId
            ? { ...item, status: 'CANCELLED', reason: item.reason ? `${item.reason} - Cancelled by user` : 'Cancelled by user' }
            : item
        )
      );

      setMessage(isArabic ? 'تم إلغاء طلب السحب وإرجاع المبلغ.' : 'Withdrawal request cancelled and funds restored.');
      void refreshWalletBalance();
    } catch {
      setMessage(isArabic ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setCancelingTransactionId(null);
    }
  };

  return (
    <>
      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[color:var(--surface)]/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[color:var(--surface)] shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-[color:var(--border)]/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[color:var(--text)] dark:text-white bg-gradient-to-r from-teal to-teal-light bg-clip-text text-transparent">
                  {isArabic ? "شحن المحفظة" : "Wallet Top-up"}
                </h3>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="text-zinc-400 hover:text-[color:var(--text-muted)] dark:hover:text-zinc-300 rounded-full p-1 hover:bg-[color:var(--muted)] dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {isArabic ? "المبلغ" : "Amount"} ({walletData.currency})
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0.000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {isArabic ? "الوصف (اختياري)" : "Description (Optional)"}
                </label>
                <input
                  type="text"
                  value={depositDescription}
                  onChange={(e) => setDepositDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder={isArabic ? "سبب الإيداع" : "Deposit reason"}
                />
              </div>

              <div className="rounded-xl noon-soft-teal p-4 border border-teal/20 dark:border-teal/30">
                <p className="text-sm text-teal-900 dark:text-teal-200 font-medium">
                  {isArabic ? "الرصيد الحالي:" : "Current balance:"} <span className="font-semibold">{walletData.balance.toFixed(3)} {walletData.currency}</span>
                </p>
                 <p className="mt-1 text-xs text-teal-800 dark:text-teal-300">
                   {isArabic
                     ? 'بعد تأكيد الدفع، يضاف هذا المبلغ إلى رصيد الشراء وليس للمبلغ القابل للسحب.'
                     : 'After payment confirmation, this amount is added to purchase balance, not withdrawable amount.'}
                 </p>
              </div>
            </div>

            <div className="border-t border-[color:var(--border)]/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-[color:var(--muted)] hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitDeposit}
                  disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0}
                  className="noon-btn-teal px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      {isArabic ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                      isArabic ? "المتابعة للدفع" : "Continue to Payment"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[color:var(--surface)]/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[color:var(--surface)] shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-[color:var(--border)]/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[color:var(--text)] dark:text-white bg-gradient-to-r from-coral to-coral-light bg-clip-text text-transparent">
                  {isArabic ? "طلب سحب رصيد" : "Request Withdrawal"}
                </h3>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-zinc-400 hover:text-[color:var(--text-muted)] dark:hover:text-zinc-300 rounded-full p-1 hover:bg-[color:var(--muted)] dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {isArabic ? "المبلغ" : "Amount"} ({walletData.currency})
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0.000"
                  min="0"
                  max={walletData.available_balance || 0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {isArabic ? "الوصف (اختياري)" : "Description (Optional)"}
                </label>
                <input
                  type="text"
                  value={withdrawDescription}
                  onChange={(e) => setWithdrawDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder={isArabic ? "سبب السحب" : "Withdrawal reason"}
                />
              </div>

              <div className="rounded-xl noon-soft-yellow p-4 border border-yellow/30 dark:border-yellow/35">
                <p className="text-sm text-yellow-900 dark:text-yellow-200 font-medium">
                  {isArabic ? 'المقدار القابل للسحب:' : 'Withdrawable amount:'} <span className="font-semibold">{walletData.available_balance?.toFixed(3) || '0.000'} {walletData.currency}</span>
                </p>
                {withdrawAmount && parseFloat(withdrawAmount) > (walletData.available_balance || 0) && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                    {isArabic ? 'المبلغ المطلوب أكبر من المقدار القابل للسحب' : 'Amount exceeds withdrawable amount'}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-[color:var(--border)]/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-[color:var(--muted)] hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitWithdraw}
                  disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (walletData.available_balance || 0)}
                  className="noon-btn-coral px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      {isArabic ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    isArabic ? "طلب سحب" : "Request Withdrawal"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[color:var(--surface)] rounded-xl shadow-sm border border-[color:var(--border)]/40 p-6">
      <h3 className="text-lg font-semibold mb-4">
        {isArabic ? 'المحفظة' : 'Wallet'}
      </h3>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700">
          {message}
        </div>
      )}

      {/* Balance */}
      <div className="noon-soft-teal rounded-lg p-4 mb-4 border border-teal/20 dark:border-teal/30">
        <div className="text-sm text-[color:var(--text-muted)] mb-1">
          {isArabic ? 'رصيد المحفظة (للدفع)' : 'Wallet Balance (for payments)'}
        </div>
        <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
          {walletData.balance.toFixed(3)} {walletData.currency}
        </div>
      </div>

      <div className="noon-soft-yellow rounded-lg p-4 mb-6 border border-yellow/30 dark:border-yellow/35">
        <div className="text-sm text-[color:var(--text-muted)] mb-1">
          {isArabic ? 'المقدار القابل للسحب (نقدًا)' : 'Withdrawable Amount (cash out)'}
        </div>
        <div className="text-xl font-semibold text-yellow-800 dark:text-yellow-300">
          {walletData.available_balance?.toFixed(3) || '0.000'} {walletData.currency}
        </div>
        <div className="text-xs text-[color:var(--text-subtle)] mt-1">
          {isArabic ? 'للسحب النقدي فقط ويتطلب موافقة الإدارة' : 'For cash withdrawal only, admin approval required'}
        </div>
      </div>

      <div className="noon-soft-coral rounded-lg p-4 mb-6 border border-coral/20 dark:border-coral/30">
        <div className="text-sm text-[color:var(--text-muted)] mb-1">
          {isArabic ? 'المبلغ المحجوز' : 'Blocked Amount'}
        </div>
        <div className="text-xl font-semibold text-coral dark:text-coral-light">
          {blockedBalance.toFixed(3)} {walletData.currency}
        </div>
        <div className="text-xs text-[color:var(--text-subtle)] mt-1">
          {isArabic ? 'طلبات سحب قيد المراجعة' : 'Pending withdrawal requests'}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={handleDeposit}
          disabled={loading}
          className="noon-btn-teal px-4 py-2 transition-all duration-200 disabled:opacity-50 hover:shadow-xl transform hover:scale-105"
        >
          {isArabic ? 'شحن المحفظة' : 'Top Up Wallet'}
        </button>
        <button
          onClick={handleWithdraw}
          disabled={loading}
          className="noon-btn-coral px-4 py-2 transition-all duration-200 disabled:opacity-50 hover:shadow-xl transform hover:scale-105"
        >
          {isArabic ? 'طلب سحب' : 'Request Withdrawal'}
        </button>
        <button
          onClick={() => setShowTransfer(!showTransfer)}
          disabled={loading}
          className="noon-btn-purple px-4 py-2 transition-all duration-200 disabled:opacity-50 hover:shadow-xl transform hover:scale-105"
        >
          {isArabic ? 'تحويل' : 'Transfer'}
        </button>
      </div>

      {/* Transfer Form */}
      {showTransfer && (
        <div className="border border-[color:var(--border)]/60 rounded-lg p-4 mb-6 bg-gray-50/50">
          <h4 className="font-medium mb-3">
            {isArabic ? 'تحويل الأموال' : 'Transfer Funds'}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                {isArabic ? 'رقم هاتف المستلم (مع رمز البلد)' : 'Recipient Phone (with country code)'}
              </label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="96812345678"
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {isArabic ? 'المبلغ' : 'Amount'}
              </label>
              <input
                type="number"
                step="0.001"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {isArabic ? 'السبب' : 'Reason'} ({isArabic ? 'اختياري' : 'Optional'})
              </label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              />
            </div>
            <button
              onClick={handleTransfer}
              disabled={loading}
              className="noon-btn-purple w-full px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              {loading ? (isArabic ? 'جاري المعالجة...' : 'Processing...') : (isArabic ? 'تحويل' : 'Transfer')}
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h4 className="font-medium mb-3">
          {isArabic ? 'تاريخ المعاملات' : 'Transaction History'}
        </h4>
        <div className="space-y-2">
          {transactionsData.length === 0 ? (
            <p className="text-[color:var(--text-subtle)] text-sm">
              {isArabic ? 'لم يتم العثور على معاملات' : 'No transactions found'}
            </p>
          ) : (
            paginatedTransactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center py-3 border-b border-zinc-100/60 last:border-b-0">
                <div>
                  <div className="font-medium">
                    {transaction.type.replace('_', ' ')}
                  </div>
                  {transaction.reason && (
                    <div className="text-sm text-[color:var(--text-muted)]">{transaction.reason}</div>
                  )}
                  <div className="text-xs text-[color:var(--text-subtle)]">
                    {new Date(transaction.created_at).toLocaleDateString(locale === 'ar' ? 'ar' : 'en')}
                  </div>
                  {transaction.type === 'WITHDRAWAL_REQUEST' && transaction.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancelWithdrawalRequest(transaction.id)}
                      disabled={cancelingTransactionId === transaction.id}
                      className="mt-2 rounded-md border border-[color:var(--noon-coral)]/40 px-2.5 py-1 text-xs font-semibold text-[color:var(--noon-coral)] hover:bg-[color:var(--noon-coral-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancelingTransactionId === transaction.id
                        ? (isArabic ? 'جاري الإلغاء...' : 'Cancelling...')
                        : (isArabic ? 'إلغاء الطلب' : 'Cancel Request')}
                    </button>
                  )}
                </div>
                <div className={`font-medium ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(3)} {walletData.currency}
                </div>
              </div>
            ))
          )}
        </div>

        {transactionsData.length > transactionsPerPage && (
          <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)]/70 pt-4 dark:border-zinc-700/60">
            <p className="text-xs text-[color:var(--text-subtle)] dark:text-zinc-400">
              {isArabic
                ? `صفحة ${effectiveTransactionsPage} من ${transactionsTotalPages}`
                : `Page ${effectiveTransactionsPage} of ${transactionsTotalPages}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransactionsPage(Math.max(1, effectiveTransactionsPage - 1))}
                disabled={effectiveTransactionsPage === 1}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {isArabic ? 'السابق' : 'Previous'}
              </button>
              <button
                onClick={() => setTransactionsPage(Math.min(transactionsTotalPages, effectiveTransactionsPage + 1))}
                disabled={effectiveTransactionsPage === transactionsTotalPages}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {isArabic ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
