"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Locale } from "@/lib/locale";
import type { Wallet } from "@/lib/db/types";

interface AdminWalletDisplayProps {
  locale: Locale;
  userId: string;
}

export function AdminWalletDisplay({ locale, userId }: AdminWalletDisplayProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const toastTimeoutRef = useRef<number | null>(null);

  const playNotificationSound = () => {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 860;
      gainNode.gain.value = 0.06;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.13);
      oscillator.onended = () => {
        audioContext.close();
      };
    } catch {
      // Ignore audio errors
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastType(type);
    setToastMessage(message);
    playNotificationSound();

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const response = await fetch(`/api/wallet/balance?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setWallet(data);
      }
    } catch {
      console.error("Error fetching wallet");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleDeposit = () => {
    setAmount("");
    setDescription("");
    setShowDepositModal(true);
    setShowDropdown(false);
  };

  const handleWithdraw = () => {
    setAmount("");
    setDescription("");
    setShowWithdrawModal(true);
    setShowDropdown(false);
  };

  const submitDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount", 'error');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || undefined,
        }),
      });

      if (response.ok) {
        await fetchWallet(); // Refresh wallet data
        setShowDepositModal(false);
        showToast(locale === "ar" ? "تم الإيداع بنجاح" : "Deposit successful", 'success');
      } else {
        const data = await response.json();
        showToast(data.error || (locale === "ar" ? "فشل في الإيداع" : "Deposit failed"), 'error');
      }
    } catch {
      showToast(locale === "ar" ? "خطأ في الاتصال" : "Connection error", 'error');
    } finally {
      setProcessing(false);
    }
  };

  const submitWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount", 'error');
      return;
    }

    if (wallet && parseFloat(amount) > (wallet.available_balance || 0)) {
      showToast(locale === "ar" ? "المقدار القابل للسحب غير كافٍ" : "Insufficient withdrawable amount", 'error');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || undefined,
        }),
      });

      if (response.ok) {
        await fetchWallet(); // Refresh wallet data
        setShowWithdrawModal(false);
        showToast(locale === "ar" ? "تم السحب بنجاح" : "Withdrawal successful", 'success');
      } else {
        const data = await response.json();
        showToast(data.error || (locale === "ar" ? "فشل في السحب" : "Withdrawal failed"), 'error');
      }
    } catch {
      showToast(locale === "ar" ? "خطأ في الاتصال" : "Connection error", 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
        <div className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300"></div>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {locale === "ar" ? "جاري التحميل..." : "Loading..."}
        </span>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {locale === "ar" ? "لا يوجد محفظة" : "No wallet"}
        </span>
      </div>
    );
  }

  return (
    <>
      {toastMessage && (
        <div className={`fixed top-20 ${locale === 'ar' ? 'left-4' : 'right-4'} z-[140]`} aria-live="polite">
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${
            toastType === 'success'
              ? 'border-emerald-200/70 bg-emerald-50/95 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-100'
              : toastType === 'error'
                ? 'border-rose-200/70 bg-rose-50/95 text-rose-900 dark:border-rose-700/60 dark:bg-rose-900/30 dark:text-rose-100'
                : 'border-blue-200/70 bg-blue-50/95 text-blue-900 dark:border-blue-700/60 dark:bg-blue-900/30 dark:text-blue-100'
          }`}>
            <span className={`inline-flex size-8 items-center justify-center rounded-lg ${
              toastType === 'success'
                ? 'noon-soft-teal text-teal-800 dark:text-teal-300'
                : toastType === 'error'
                  ? 'noon-soft-coral text-coral dark:text-coral-light'
                  : 'noon-soft-purple text-purple dark:text-purple'
            }`}>
              {toastType === 'success' ? '✓' : toastType === 'error' ? '!' : 'i'}
            </span>
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Wallet Button */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="noon-btn-teal flex items-center gap-2 px-4 py-2 shadow-sm transition-all hover:shadow-md"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">
            {wallet.balance.toFixed(3)} {wallet.currency}
          </span>
          <svg
            className={`size-4 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            ></div>
            <div className={`absolute top-full z-20 mt-2 w-56 rounded-lg border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800 ${locale === "ar" ? "left-0" : "right-0"}`}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {locale === "ar" ? "محفظتي" : "My Wallet"}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {locale === "ar" ? "الرصيد الحالي" : "Current Balance"}
                </p>
              </div>

              <div className="p-2">
                <button
                  onClick={handleDeposit}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <svg className="size-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {locale === "ar" ? "إيداع" : "Deposit"}
                </button>

                <button
                  onClick={handleWithdraw}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <svg className="size-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  {locale === "ar" ? "سحب" : "Withdraw"}
                </button>

                <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
                  <Link
                    href={`/${locale}/account`}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    onClick={() => setShowDropdown(false)}
                  >
                    <svg className="size-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {locale === "ar" ? "عرض التفاصيل" : "View Details"}
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-center justify-center backdrop-blur-sm bg-black/40 dark:bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "إيداع رصيد" : "Deposit Funds"}
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
                  {locale === "ar" ? "المبلغ" : "Amount"} ({wallet.currency})
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0.000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {locale === "ar" ? "الوصف (اختياري)" : "Description (Optional)"}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder={locale === "ar" ? "سبب الإيداع" : "Deposit reason"}
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border border-green-100 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/30">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  {locale === "ar" ? "الرصيد الحالي:" : "Current balance:"} <span className="font-semibold">{wallet.balance.toFixed(3)} {wallet.currency}</span>
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={processing}
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitDeposit}
                  disabled={processing || !amount || parseFloat(amount) <= 0}
                  className="noon-btn-teal px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      {locale === "ar" ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    locale === "ar" ? "إيداع" : "Deposit"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-center justify-center backdrop-blur-sm bg-black/40 dark:bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "سحب رصيد" : "Withdraw Funds"}
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
                  {locale === "ar" ? "المبلغ" : "Amount"} ({wallet.currency})
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0.000"
                  min="0"
                  max={wallet.available_balance || 0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {locale === "ar" ? "الوصف (اختياري)" : "Description (Optional)"}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder={locale === "ar" ? "سبب السحب" : "Withdrawal reason"}
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800/30">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  {locale === "ar" ? "المقدار القابل للسحب:" : "Withdrawable amount:"} <span className="font-semibold">{(wallet.available_balance || 0).toFixed(3)} {wallet.currency}</span>
                </p>
                <p className="mt-2 text-sm text-rose-700 dark:text-rose-300 font-medium">
                  {locale === "ar" ? 'المبلغ المحجوز:' : 'Blocked amount:'} <span className="font-semibold">{(wallet.blocked_balance || 0).toFixed(3)} {wallet.currency}</span>
                </p>
                {amount && parseFloat(amount) > (wallet.available_balance || 0) && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                    {locale === "ar" ? "المبلغ المطلوب أكبر من المقدار القابل للسحب" : "Amount exceeds withdrawable amount"}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={processing}
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitWithdraw}
                  disabled={processing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > (wallet.available_balance || 0)}
                  className="noon-btn-coral px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      {locale === "ar" ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    locale === "ar" ? "سحب" : "Withdraw"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}