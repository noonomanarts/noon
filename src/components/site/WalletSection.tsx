'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const isArabic = locale === 'ar';

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
          currency?: string;
        };

        setWalletData((prev) => ({
          ...prev,
          balance: data.balance ?? prev.balance,
          available_balance: data.available_balance ?? prev.available_balance,
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
      alert(isArabic ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          description: depositDescription || undefined,
        }),
      });

      if (response.ok) {
        const deposited = parseFloat(depositAmount);
        setWalletData((prev) => ({
          ...prev,
          balance: prev.balance + deposited,
          available_balance: (prev.available_balance || 0) + deposited,
        }));
        setMessage(isArabic ? 'تم الإيداع بنجاح' : 'Deposit successful');
        setShowDepositModal(false);
      } else {
        const data = await response.json();
        alert(data.error || (isArabic ? 'فشل في الإيداع' : 'Deposit failed'));
      }
    } catch {
      alert(isArabic ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const submitWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert(isArabic ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
      return;
    }

    if (parseFloat(withdrawAmount) > (walletData.available_balance || 0)) {
      alert(isArabic ? "الرصيد المتاح غير كافي" : "Insufficient available balance");
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
          available_balance: Math.max(0, (prev.available_balance || 0) - requestedAmount),
        }));
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
        alert(data.error || (isArabic ? 'فشل في إرسال طلب السحب' : 'Failed to submit withdrawal request'));
      }
    } catch {
      alert(isArabic ? 'خطأ في الاتصال' : 'Connection error');
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

  return (
    <>
      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {isArabic ? "إيداع رصيد" : "Deposit Funds"}
                </h3>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-200"
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
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
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
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder={isArabic ? "سبب الإيداع" : "Deposit reason"}
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border border-green-100 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/30">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  {isArabic ? "الرصيد الحالي:" : "Current balance:"} <span className="font-semibold">{walletData.balance.toFixed(3)} {walletData.currency}</span>
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitDeposit}
                  disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0}
                  className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      {isArabic ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    isArabic ? "إيداع" : "Deposit"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  {isArabic ? "طلب سحب رصيد" : "Request Withdrawal"}
                </h3>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-200"
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
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
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
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder={isArabic ? "سبب السحب" : "Withdrawal reason"}
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800/30">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  {isArabic ? "الرصيد المتاح:" : "Available balance:"} <span className="font-semibold">{walletData.available_balance?.toFixed(3) || '0.000'} {walletData.currency}</span>
                </p>
                {withdrawAmount && parseFloat(withdrawAmount) > (walletData.available_balance || 0) && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                    {isArabic ? "المبلغ المطلوب أكبر من الرصيد المتاح" : "Amount exceeds available balance"}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitWithdraw}
                  disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (walletData.available_balance || 0)}
                  className="rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200/40 p-6">
      <h3 className="text-lg font-semibold mb-4">
        {isArabic ? 'المحفظة' : 'Wallet'}
      </h3>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700">
          {message}
        </div>
      )}

      {/* Balance */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-600 mb-1">
          {isArabic ? 'الرصيد الإجمالي' : 'Total Balance'}
        </div>
        <div className="text-2xl font-bold text-green-600">
          {walletData.balance.toFixed(3)} {walletData.currency}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-600 mb-1">
          {isArabic ? 'الرصيد المتاح للسحب' : 'Available for Withdrawal'}
        </div>
        <div className="text-xl font-semibold text-blue-600">
          {walletData.available_balance?.toFixed(3) || '0.000'} {walletData.currency}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {isArabic ? 'يجب الموافقة من الإدارة للسحب' : 'Admin approval required for withdrawal'}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={handleDeposit}
          disabled={loading}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isArabic ? 'إيداع' : 'Deposit'}
        </button>
        <button
          onClick={handleWithdraw}
          disabled={loading}
          className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-rose-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isArabic ? 'طلب سحب' : 'Request Withdrawal'}
        </button>
        <button
          onClick={() => setShowTransfer(!showTransfer)}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isArabic ? 'تحويل' : 'Transfer'}
        </button>
      </div>

      {/* Transfer Form */}
      {showTransfer && (
        <div className="border border-zinc-200/60 rounded-lg p-4 mb-6 bg-gray-50/50">
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
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
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
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
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
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              />
            </div>
            <button
              onClick={handleTransfer}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
            <p className="text-gray-500 text-sm">
              {isArabic ? 'لم يتم العثور على معاملات' : 'No transactions found'}
            </p>
          ) : (
            transactionsData.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center py-3 border-b border-zinc-100/60 last:border-b-0">
                <div>
                  <div className="font-medium">
                    {transaction.type.replace('_', ' ')}
                  </div>
                  {transaction.reason && (
                    <div className="text-sm text-gray-600">{transaction.reason}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString(locale === 'ar' ? 'ar' : 'en')}
                  </div>
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
      </div>
    </div>
    </>
  );
}