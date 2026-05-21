'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FiUsers, FiDollarSign, FiTrendingDown, FiCheck, FiArrowRight, FiX, FiLoader, FiMoreVertical, FiTrendingUp } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import type { Wallet, WalletTransaction } from '@/lib/db/types';
import { formatAmountWithCurrency, formatPlainNumber } from '@/lib/formatNumber';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

interface WalletsTableProps {
  wallets: (Wallet & {
    user_full_name: string;
    user_email: string;
    user_phone_number: string;
    user_profile_image: string | null;
  })[];
  locale: Locale;
}

export function WalletsTable({ wallets: initialWallets, locale }: WalletsTableProps) {
  const { confirm } = useAppFeedback();
  const [wallets, setWallets] = useState(initialWallets);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [showDeductCredit, setShowDeductCredit] = useState(false);
  const [showEditAvailableBalance, setShowEditAvailableBalance] = useState(false);
  const [showRequestWithdrawal, setShowRequestWithdrawal] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [availableBalanceAmount, setAvailableBalanceAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'has-balance' | 'has-available' | 'pending-withdrawals'>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const toastTimeoutRef = useRef<number | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const totalAvailable = wallets.reduce((sum, w) => sum + (w.available_balance || 0), 0);
    const totalBlocked = wallets.reduce((sum, w) => sum + (w.blocked_balance || 0), 0);
    const walletsWithBalance = wallets.filter(w => w.balance > 0).length;
    const walletsWithAvailable = wallets.filter(w => (w.available_balance || 0) > 0).length;

    return {
      totalBalance,
      totalAvailable,
      totalBlocked,
      walletsWithBalance,
      walletsWithAvailable,
      totalWallets: wallets.length
    };
  }, [wallets]);

  // Filtered wallets
  const filteredWallets = useMemo(() => {
    return wallets.filter(wallet => {
      const matchesSearch = searchTerm === '' ||
        wallet.user_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.user_phone_number.includes(searchTerm);

      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'has-balance' && wallet.balance > 0) ||
        (filterStatus === 'has-available' && (wallet.available_balance || 0) > 0) ||
        (filterStatus === 'pending-withdrawals' && (wallet.blocked_balance || 0) > 0);

      return matchesSearch && matchesFilter;
    });
  }, [wallets, searchTerm, filterStatus]);

  const openWallet = useMemo(
    () => wallets.find((wallet) => wallet.user_id === openDropdown) ?? null,
    [wallets, openDropdown]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        openDropdown &&
        !target.closest('.dropdown-container') &&
        !target.closest('.wallet-actions-menu')
      ) {
        setOpenDropdown(null);
        setDropdownPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    const handleViewportChange = () => {
      setOpenDropdown(null);
      setDropdownPosition(null);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastType(type);
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const notifyWithSound = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    showToast(message, type);
    playNotificationSound();
  };

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
      gainNode.gain.value = 0.06;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.14);
      oscillator.onended = () => {
        audioContext.close();
      };
    } catch {
      // Ignore audio errors
    }
  };

  useEffect(() => {
    const source = new EventSource('/api/admin/stream');

    const handleWalletUpdated = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          user_id: string;
          balance?: number;
          available_balance?: number;
          blocked_balance?: number;
          currency?: string;
        };

        setWallets((prev) => {
          const index = prev.findIndex((wallet) => wallet.user_id === data.user_id);
          if (index === -1) return prev;
          return prev.map((wallet) =>
            wallet.user_id === data.user_id
              ? {
                  ...wallet,
                  balance: data.balance ?? wallet.balance,
                  available_balance: data.available_balance ?? wallet.available_balance,
                  blocked_balance: data.blocked_balance ?? wallet.blocked_balance,
                  currency: data.currency ?? wallet.currency,
                }
              : wallet
          );
        });

        showToast(locale === 'ar' ? 'تم تحديث محفظة' : 'Wallet updated', 'info');
        playNotificationSound();
      } catch {
        // Ignore malformed events
      }
    };

    source.addEventListener('wallet_updated', handleWalletUpdated as EventListener);

    return () => {
      source.removeEventListener('wallet_updated', handleWalletUpdated as EventListener);
      source.close();
    };
  }, [locale]);

  const handleViewTransactions = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/wallet/transactions?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        setSelectedUser(userId);
        setShowTransactions(true);
      } else {
        notifyWithSound(locale === "ar" ? "فشل في تحميل المعاملات" : "Failed to load transactions", 'error');
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      notifyWithSound(locale === "ar" ? "خطأ في تحميل المعاملات" : "Error loading transactions", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredit = (userId: string) => {
    setSelectedUser(userId);
    setAmount("");
    setDescription("");
    setShowAddCredit(true);
  };

  const handleDeductCredit = (userId: string) => {
    setSelectedUser(userId);
    setAmount("");
    setDescription("");
    setShowDeductCredit(true);
  };

  const handleEditAvailableBalance = (userId: string) => {
    const wallet = wallets.find(w => w.user_id === userId);
    if (wallet) {
      setSelectedUser(userId);
      setAvailableBalanceAmount((wallet.available_balance || 0).toString());
      setShowEditAvailableBalance(true);
    }
  };

  const handleRequestWithdrawal = (userId: string) => {
    const wallet = wallets.find(w => w.user_id === userId);
    if (wallet && (wallet.available_balance || 0) > 0) {
      setSelectedUser(userId);
      setAmount("");
      setDescription("");
      setShowRequestWithdrawal(true);
    } else {
      notifyWithSound(locale === "ar" ? "لا يوجد مقدار قابل للسحب" : "No withdrawable amount for withdrawal", 'error');
    }
  };

  const handleClearWallet = async (userId: string) => {
    const confirmed = await confirm({
      title: locale === 'ar' ? 'تأكيد تصفير المحفظة' : 'Clear wallet',
      message: locale === 'ar'
        ? 'سيتم تصفير المحفظة وحذف كل حركاتها. هل تريد المتابعة؟'
        : 'This will clear the wallet and delete all its transactions. Continue?',
      confirmLabel: locale === 'ar' ? 'تأكيد' : 'Confirm',
      cancelLabel: locale === 'ar' ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/wallet/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const result = await response.json();
        setWallets((prev) => prev.map((wallet) =>
          wallet.user_id === userId
            ? {
                ...wallet,
                balance: result.wallet.balance,
                available_balance: result.wallet.available_balance,
                blocked_balance: result.wallet.blocked_balance ?? 0,
              }
            : wallet
        ));
        notifyWithSound(locale === 'ar' ? 'تم تصفير المحفظة' : 'Wallet cleared successfully', 'success');
      } else {
        const error = await response.json();
        notifyWithSound(error.error || (locale === 'ar' ? 'فشل في تصفير المحفظة' : 'Failed to clear wallet'), 'error');
      }
    } catch (error) {
      console.error('Error clearing wallet:', error);
      notifyWithSound(locale === 'ar' ? 'خطأ في تصفير المحفظة' : 'Error clearing wallet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWallet = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedWallets);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedWallets(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWallets(new Set(filteredWallets.map(w => w.user_id)));
    } else {
      setSelectedWallets(new Set());
    }
  };

  const toggleDropdown = (userId: string, triggerElement: HTMLElement) => {
    if (openDropdown === userId) {
      setOpenDropdown(null);
      setDropdownPosition(null);
      return;
    }

    const rect = triggerElement.getBoundingClientRect();
    const menuWidth = 224;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const top = rect.bottom + 8;

    setOpenDropdown(userId);
    setDropdownPosition({ top, left });
  };

  const submitAddCredit = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      notifyWithSound(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount", 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/wallet/add-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          amount: parseFloat(amount),
          description: description || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update the wallet in the list
        setWallets(prev => prev.map(w =>
          w.user_id === selectedUser
            ? { ...w, balance: result.wallet.balance, available_balance: result.wallet.available_balance, blocked_balance: result.wallet.blocked_balance ?? w.blocked_balance }
            : w
        ));
        setShowAddCredit(false);
        notifyWithSound(locale === "ar" ? "تم إضافة الرصيد بنجاح" : "Credit added successfully", 'success');
      } else {
        const error = await response.json();
        notifyWithSound(error.error || (locale === "ar" ? "فشل في إضافة الرصيد" : "Failed to add credit"), 'error');
      }
    } catch (error) {
      console.error("Error adding credit:", error);
      notifyWithSound(locale === "ar" ? "خطأ في إضافة الرصيد" : "Error adding credit", 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitDeductCredit = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      notifyWithSound(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount", 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/wallet/deduct-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          amount: parseFloat(amount),
          description: description || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update the wallet in the list
        setWallets(prev => prev.map(w =>
          w.user_id === selectedUser
            ? { ...w, balance: result.wallet.balance, available_balance: result.wallet.available_balance, blocked_balance: result.wallet.blocked_balance ?? w.blocked_balance }
            : w
        ));
        setShowDeductCredit(false);
        notifyWithSound(locale === "ar" ? "تم خصم الرصيد بنجاح" : "Credit deducted successfully", 'success');
      } else {
        const error = await response.json();
        notifyWithSound(error.error || (locale === "ar" ? "فشل في خصم الرصيد" : "Failed to deduct credit"), 'error');
      }
    } catch (error) {
      console.error("Error deducting credit:", error);
      notifyWithSound(locale === "ar" ? "خطأ في خصم الرصيد" : "Error deducting credit", 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitEditAvailableBalance = async () => {
    if (!selectedUser || availableBalanceAmount === "") {
      notifyWithSound(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount", 'error');
      return;
    }

    const newAmount = parseFloat(availableBalanceAmount);
    if (newAmount < 0) {
      notifyWithSound(locale === "ar" ? "لا يمكن أن يكون الرصيد سالباً" : "Balance cannot be negative", 'error');
      return;
    }

    const wallet = wallets.find(w => w.user_id === selectedUser);
    if (!wallet || newAmount > wallet.balance) {
      notifyWithSound(locale === "ar" ? "لا يمكن أن يكون المقدار القابل للسحب أكبر من الرصيد الإجمالي" : "Withdrawable amount cannot exceed total balance", 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/wallet/edit-available-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          availableBalance: newAmount,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setWallets(prev => prev.map(w =>
          w.user_id === selectedUser
            ? { ...w, available_balance: result.wallet.available_balance, blocked_balance: result.wallet.blocked_balance ?? w.blocked_balance }
            : w
        ));
        setShowEditAvailableBalance(false);
        notifyWithSound(locale === "ar" ? "تم تحديث المقدار القابل للسحب بنجاح" : "Withdrawable amount updated successfully", 'success');
      } else {
        const error = await response.json();
        notifyWithSound(error.error || (locale === "ar" ? "فشل في تحديث المقدار القابل للسحب" : "Failed to update withdrawable amount"), 'error');
      }
    } catch (error) {
      console.error("Error updating available balance:", error);
      notifyWithSound(locale === "ar" ? "خطأ في تحديث المقدار القابل للسحب" : "Error updating withdrawable amount", 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitRequestWithdrawal = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      notifyWithSound(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount", 'error');
      return;
    }

    const wallet = wallets.find(w => w.user_id === selectedUser);
    if (!wallet || parseFloat(amount) > (wallet.available_balance || 0)) {
      notifyWithSound(locale === "ar" ? "المبلغ المطلوب أكبر من المقدار القابل للسحب" : "Requested amount exceeds withdrawable amount", 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/wallet/request-withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          amount: parseFloat(amount),
          description: description || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update the wallet in the list
        setWallets(prev => prev.map(w =>
          w.user_id === selectedUser ? { ...w, balance: result.wallet.balance, available_balance: result.wallet.available_balance, blocked_balance: result.wallet.blocked_balance } : w
        ));
        setShowRequestWithdrawal(false);
        notifyWithSound(locale === "ar" ? "تم طلب السحب بنجاح" : "Withdrawal request submitted successfully", 'success');
      } else {
        const error = await response.json();
        notifyWithSound(error.error || (locale === "ar" ? "فشل في طلب السحب" : "Failed to request withdrawal"), 'error');
      }
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      notifyWithSound(locale === "ar" ? "خطأ في طلب السحب" : "Error requesting withdrawal", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toastMessage && (
        <div className={`fixed top-20 ${locale === 'ar' ? 'left-4' : 'right-4'} z-50`}
          aria-live="polite"
        >
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${
            toastType === 'success'
              ? 'border-emerald-200/70 bg-emerald-50/95 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-100'
              : toastType === 'error'
                ? 'border-rose-200/70 bg-rose-50/95 text-rose-900 dark:border-rose-700/60 dark:bg-rose-900/30 dark:text-rose-100'
                : 'border-blue-200/70 bg-blue-50/95 text-blue-900 dark:border-blue-700/60 dark:bg-blue-900/30 dark:text-blue-100'
          }`}>
            <span className={`inline-flex items-center justify-center size-8 rounded-lg ${
              toastType === 'success'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300'
                : toastType === 'error'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300'
            }`}>
              {toastType === 'success' ? <FiCheck className="size-4" /> : toastType === 'error' ? <FiX className="size-4" /> : <FiDollarSign className="size-4" />}
            </span>
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        <div className="bg-gradient-to-r from-coral to-coral-light rounded-xl p-3 text-white">
          <p className="text-white/85 text-[10px] font-bold uppercase tracking-[0.08em]">
            {locale === "ar" ? "المحافظ" : "Wallets"}
          </p>
          <p className="mt-1 text-xl font-black">{stats.totalWallets}</p>
        </div>

        <div className="bg-gradient-to-r from-teal to-teal-light rounded-xl p-3 text-white">
          <p className="text-white/85 text-[10px] font-bold uppercase tracking-[0.08em]">
            {locale === "ar" ? "رصيد الدفع" : "Pay Balance"}
          </p>
          <p className="mt-1 text-xl font-black">{formatAmountWithCurrency(stats.totalBalance, 'OMR')}</p>
        </div>

        <div className="bg-gradient-to-r from-purple to-purple-dark rounded-xl p-3 text-white">
          <p className="text-white/85 text-[10px] font-bold uppercase tracking-[0.08em]">
            {locale === "ar" ? "قابل للسحب" : "Withdrawable"}
          </p>
          <p className="mt-1 text-xl font-black">{formatAmountWithCurrency(stats.totalAvailable, 'OMR')}</p>
        </div>

        <div className="bg-gradient-to-r from-yellow to-yellow-light rounded-xl p-3 text-zinc-900">
          <p className="text-zinc-800/80 text-[10px] font-bold uppercase tracking-[0.08em]">
            {locale === "ar" ? "محجوز" : "Blocked"}
          </p>
          <p className="mt-1 text-xl font-black">{formatAmountWithCurrency(stats.totalBlocked, 'OMR')}</p>
        </div>

        <div className="bg-gradient-to-r from-teal to-purple rounded-xl p-3 text-white">
          <p className="text-white/85 text-[10px] font-bold uppercase tracking-[0.08em]">
            {locale === "ar" ? "مع رصيد سحب" : "Cash-Out"}
          </p>
          <p className="mt-1 text-xl font-black">{stats.walletsWithAvailable} / {stats.walletsWithBalance}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder={locale === "ar" ? "البحث في المحافظ..." : "Search wallets..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'has-balance' | 'has-available' | 'pending-withdrawals')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
            >
              <option value="all">{locale === "ar" ? "جميع المحافظ" : "All Wallets"}</option>
              <option value="has-balance">{locale === "ar" ? "لديها رصيد" : "Has Balance"}</option>
              <option value="has-available">{locale === "ar" ? "قابلة للسحب" : "Withdrawable"}</option>
              <option value="pending-withdrawals">{locale === "ar" ? "طلبات سحب معلقة" : "Pending Withdrawals"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {locale === "ar" ? "إدارة المحافظ" : "Wallet Management"}
          </h2>
        </div>

        <div className="relative overflow-x-auto overflow-y-visible">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-zinc-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-300 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedWallets.size === filteredWallets.length && filteredWallets.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-900 focus:ring-2 dark:bg-zinc-800 dark:border-zinc-600"
                    />
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-300 uppercase tracking-wide">
                  {locale === "ar" ? "المستخدم" : "User"}
                </th>
                <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-300 uppercase tracking-wide">
                  {locale === "ar" ? "الهاتف" : "Phone"}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-300 uppercase tracking-wide">
                  {locale === "ar" ? "رصيد الدفع" : "Pay Bal."}
                </th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-300 uppercase tracking-wide">
                  {locale === "ar" ? "قابل للسحب" : "Withdrawable"}
                </th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-300 uppercase tracking-wide">
                  {locale === "ar" ? "محجوز" : "Blocked"}
                </th>
                <th className="hidden xl:table-cell px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-300 uppercase tracking-wide">
                  {locale === "ar" ? "العملة" : "Curr."}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-300 uppercase tracking-wide">
                  {locale === "ar" ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
              {filteredWallets.map((wallet) => (
                <tr
                  key={wallet.id}
                  className={`relative hover:bg-gray-50 dark:hover:bg-zinc-800 ${
                    openDropdown === wallet.user_id ? 'z-[80]' : 'z-0'
                  }`}
                >
                  <td className="px-3 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedWallets.has(wallet.user_id)}
                      onChange={(e) => handleSelectWallet(wallet.user_id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-900 focus:ring-2 dark:bg-zinc-800 dark:border-zinc-600"
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        {wallet.user_profile_image ? (
                          <Image
                            src={wallet.user_profile_image}
                            alt={wallet.user_full_name}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                            {(wallet.user_full_name?.charAt(0) || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">
                          {wallet.user_full_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 sm:hidden">
                          {wallet.user_phone_number}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                    {wallet.user_phone_number}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold text-gray-900 dark:text-white">
                    {formatPlainNumber(wallet.balance)}
                  </td>
                  <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-xs text-blue-600 dark:text-blue-400">
                    {formatPlainNumber(wallet.available_balance ?? 0)}
                  </td>
                  <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-xs text-rose-600 dark:text-rose-400">
                    {formatPlainNumber(wallet.blocked_balance || 0)}
                  </td>
                  <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                    {wallet.currency}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-medium relative">
                    <div className="relative dropdown-container">
                      <button
                        onClick={(event) => toggleDropdown(wallet.user_id, event.currentTarget)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:text-gray-800 dark:hover:text-zinc-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                        disabled={loading}
                      >
                        <FiMoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openDropdown && dropdownPosition && openWallet && (
        <div
          className="wallet-actions-menu fixed z-[160] w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200/50 dark:border-zinc-700/50 backdrop-blur-sm focus:outline-none overflow-hidden"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          <div className="py-2">
            <button
              onClick={() => {
                handleViewTransactions(openWallet.user_id);
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 group"
              disabled={loading}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors duration-200">
                <FiArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">{locale === "ar" ? "المعاملات" : "Transactions"}</span>
            </button>
            <button
              onClick={() => {
                handleAddCredit(openWallet.user_id);
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 hover:text-green-700 dark:hover:text-green-300 transition-all duration-200 group"
              disabled={loading}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 mr-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors duration-200">
                <FiTrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-medium">{locale === "ar" ? "إضافة رصيد" : "Add Credit"}</span>
            </button>
            <button
              onClick={() => {
                handleDeductCredit(openWallet.user_id);
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 dark:hover:from-red-900/20 dark:hover:to-rose-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 group"
              disabled={loading}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 mr-3 group-hover:bg-red-200 dark:group-hover:bg-red-800/40 transition-colors duration-200">
                <FiTrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="font-medium">{locale === "ar" ? "خصم رصيد" : "Deduct Credit"}</span>
            </button>
            <button
              onClick={() => {
                handleEditAvailableBalance(openWallet.user_id);
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 dark:hover:from-purple-900/20 dark:hover:to-violet-900/20 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 group"
              disabled={loading}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 mr-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors duration-200">
                <FiCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium">{locale === "ar" ? "تعديل السحب النقدي" : "Edit Cash-Out Amount"}</span>
            </button>
            <button
              onClick={() => {
                handleRequestWithdrawal(openWallet.user_id);
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 dark:hover:from-orange-900/20 dark:hover:to-amber-900/20 hover:text-orange-700 dark:hover:text-orange-300 transition-all duration-200 group"
              disabled={loading || (openWallet.available_balance || 0) <= 0}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 mr-3 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/40 transition-colors duration-200">
                <FiArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="font-medium">{locale === "ar" ? "طلب سحب" : "Request Withdrawal"}</span>
            </button>
            <button
              onClick={() => {
                void handleClearWallet(openWallet.user_id);
                setOpenDropdown(null);
                setDropdownPosition(null);
              }}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gradient-to-r hover:from-rose-50 hover:to-red-50 dark:hover:from-rose-900/20 dark:hover:to-red-900/20 hover:text-rose-700 dark:hover:text-rose-300 transition-all duration-200 group"
              disabled={loading}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 mr-3 group-hover:bg-rose-200 dark:group-hover:bg-rose-800/40 transition-colors duration-200">
                <FiX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="font-medium">{locale === 'ar' ? 'تصفير المحفظة' : 'Clear Wallet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactions && (
        <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-center justify-center p-4 backdrop-blur-sm bg-black/40 dark:bg-black/55">
          <div className="mx-4 flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl transition-all duration-300 scale-100 dark:border-zinc-700/50 dark:bg-zinc-800">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "معاملات المحفظة" : "Wallet Transactions"}
                </h3>
                <button
                  onClick={() => setShowTransactions(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  <FiX className="size-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200/60 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700/60 dark:text-zinc-400">
                    {locale === 'ar' ? 'لا توجد معاملات' : 'No transactions found'}
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30 transition-colors duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-semibold text-zinc-900 dark:text-white text-sm">
                            {transaction.type.replace('_', ' ')}
                          </span>
                          {transaction.reason && (
                            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                              {transaction.reason}
                            </div>
                          )}
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                            {new Date(transaction.created_at).toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })}
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatPlainNumber(transaction.amount)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-4 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {locale === 'ar' ? `إجمالي المعاملات: ${transactions.length}` : `Total transactions: ${transactions.length}`}
                </p>
                <button
                  onClick={() => setShowTransactions(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  {locale === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Credit Modal */}
      {showAddCredit && (
        <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-center justify-center p-4 backdrop-blur-sm bg-black/40 dark:bg-black/55">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "إضافة رصيد" : "Add Credit"}
                </h3>
                <button
                  onClick={() => setShowAddCredit(false)}
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
                  {locale === "ar" ? "المبلغ" : "Amount"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0"
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
                  placeholder={locale === "ar" ? "سبب الإضافة" : "Reason for addition"}
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border border-green-100 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/30">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  {locale === "ar" ? "سيتم إضافة الرصيد إلى حساب المستخدم المحدد" : "Credit will be added to the selected user's account"}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddCredit(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitAddCredit}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="noon-btn-teal px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      {locale === "ar" ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    locale === "ar" ? "إضافة" : "Add"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deduct Credit Modal */}
      {showDeductCredit && (
        <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-center justify-center p-4 backdrop-blur-sm bg-black/40 dark:bg-black/55">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "خصم رصيد" : "Deduct Credit"}
                </h3>
                <button
                  onClick={() => setShowDeductCredit(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  <FiX className="size-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {locale === "ar" ? "المبلغ" : "Amount"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0"
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
                  placeholder={locale === "ar" ? "سبب الخصم" : "Reason for deduction"}
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-red-50 to-rose-50 p-4 border border-red-100 dark:from-red-900/20 dark:to-rose-900/20 dark:border-red-800/30">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  {locale === "ar" ? "سيتم خصم الرصيد من حساب المستخدم المحدد" : "Credit will be deducted from the selected user's account"}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeductCredit(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitDeductCredit}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="noon-btn-coral px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <FiLoader className="size-4 animate-spin" />
                      {locale === "ar" ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    locale === "ar" ? "خصم" : "Deduct"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Available Balance Modal */}
      {showEditAvailableBalance && (
        <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-center justify-center p-4 backdrop-blur-sm bg-black/40 dark:bg-black/55">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "تعديل رصيد السحب النقدي" : "Edit Cash-Withdrawable Amount"}
                </h3>
                <button
                  onClick={() => setShowEditAvailableBalance(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  <FiX className="size-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {locale === "ar" ? "قيمة السحب النقدي الجديدة" : "New Cash-Withdrawable Amount"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={availableBalanceAmount}
                  onChange={(e) => setAvailableBalanceAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0"
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800/30">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  {locale === "ar"
                    ? "هذا الحقل يغيّر فقط الرصيد المسموح سحبه نقدًا. لا يغيّر قدرة المستخدم على الدفع داخل الموقع، لأن الدفع يعتمد على رصيد المحفظة الأساسي."
                    : "This field only changes the amount allowed for cash withdrawal. It does not change whether the user can pay on the website, because website payments use the main wallet balance."}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditAvailableBalance(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitEditAvailableBalance}
                  disabled={loading || availableBalanceAmount === ""}
                  className="noon-btn-purple px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <FiLoader className="size-4 animate-spin" />
                      {locale === "ar" ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    locale === "ar" ? "تحديث" : "Update"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Withdrawal Modal */}
      {showRequestWithdrawal && (
        <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-center justify-center p-4 backdrop-blur-sm bg-black/40 dark:bg-black/55">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "طلب سحب رصيد" : "Request Withdrawal"}
                </h3>
                <button
                  onClick={() => setShowRequestWithdrawal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  <FiX className="size-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {locale === "ar" ? "مبلغ السحب" : "Withdrawal Amount"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0"
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
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder={locale === "ar" ? "سبب السحب" : "Reason for withdrawal"}
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 p-4 border border-orange-100 dark:from-orange-900/20 dark:to-amber-900/20 dark:border-orange-800/30">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                  {locale === "ar" ? "سيتم إرسال طلب السحب للمراجعة والمعالجة" : "Withdrawal request will be submitted for review and processing"}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRequestWithdrawal(false)}
                  className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
                  disabled={loading}
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitRequestWithdrawal}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="noon-btn-yellow px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <FiLoader className="size-4 animate-spin" />
                      {locale === "ar" ? "جاري..." : "Processing..."}
                    </div>
                  ) : (
                    locale === "ar" ? "طلب السحب" : "Request Withdrawal"
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
