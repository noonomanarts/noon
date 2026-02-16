'use client';

import { useState, useMemo, useEffect } from 'react';
import { FiUsers, FiDollarSign, FiTrendingDown, FiCheck, FiArrowRight, FiX, FiLoader, FiMoreVertical, FiTrendingUp } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import type { Wallet, WalletTransaction } from '@/lib/db/types';

interface WalletsTableProps {
  wallets: (Wallet & { user_full_name: string; user_email: string; user_phone_number: string })[];
  locale: Locale;
}

export function WalletsTable({ wallets: initialWallets, locale }: WalletsTableProps) {
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
  const [loading, setLoading] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const totalAvailable = wallets.reduce((sum, w) => sum + (w.available_balance || 0), 0);
    const walletsWithBalance = wallets.filter(w => w.balance > 0).length;
    const walletsWithAvailable = wallets.filter(w => (w.available_balance || 0) > 0).length;

    return {
      totalBalance,
      totalAvailable,
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
        (filterStatus === 'pending-withdrawals' && (wallet.available_balance || 0) < wallet.balance);

      return matchesSearch && matchesFilter;
    });
  }, [wallets, searchTerm, filterStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

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
        alert(locale === "ar" ? "فشل في تحميل المعاملات" : "Failed to load transactions");
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      alert(locale === "ar" ? "خطأ في تحميل المعاملات" : "Error loading transactions");
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
      alert(locale === "ar" ? "لا يوجد رصيد قابل للسحب" : "No available balance for withdrawal");
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

  const toggleDropdown = (userId: string) => {
    setOpenDropdown(openDropdown === userId ? null : userId);
  };

  const submitAddCredit = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      alert(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
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
          w.user_id === selectedUser ? { ...w, balance: result.wallet.balance, available_balance: result.wallet.available_balance } : w
        ));
        setShowAddCredit(false);
        alert(locale === "ar" ? "تم إضافة الرصيد بنجاح" : "Credit added successfully");
      } else {
        const error = await response.json();
        alert(error.error || (locale === "ar" ? "فشل في إضافة الرصيد" : "Failed to add credit"));
      }
    } catch (error) {
      console.error("Error adding credit:", error);
      alert(locale === "ar" ? "خطأ في إضافة الرصيد" : "Error adding credit");
    } finally {
      setLoading(false);
    }
  };

  const submitDeductCredit = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      alert(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
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
          w.user_id === selectedUser ? { ...w, balance: result.wallet.balance, available_balance: result.wallet.available_balance } : w
        ));
        setShowDeductCredit(false);
        alert(locale === "ar" ? "تم خصم الرصيد بنجاح" : "Credit deducted successfully");
      } else {
        const error = await response.json();
        alert(error.error || (locale === "ar" ? "فشل في خصم الرصيد" : "Failed to deduct credit"));
      }
    } catch (error) {
      console.error("Error deducting credit:", error);
      alert(locale === "ar" ? "خطأ في خصم الرصيد" : "Error deducting credit");
    } finally {
      setLoading(false);
    }
  };

  const submitEditAvailableBalance = async () => {
    if (!selectedUser || availableBalanceAmount === "") {
      alert(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
      return;
    }

    const newAmount = parseFloat(availableBalanceAmount);
    if (newAmount < 0) {
      alert(locale === "ar" ? "لا يمكن أن يكون الرصيد سالباً" : "Balance cannot be negative");
      return;
    }

    const wallet = wallets.find(w => w.user_id === selectedUser);
    if (!wallet || newAmount > wallet.balance) {
      alert(locale === "ar" ? "لا يمكن أن يكون الرصيد المتاح أكبر من الرصيد الإجمالي" : "Available balance cannot exceed total balance");
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
          w.user_id === selectedUser ? { ...w, available_balance: result.wallet.available_balance } : w
        ));
        setShowEditAvailableBalance(false);
        alert(locale === "ar" ? "تم تحديث الرصيد المتاح بنجاح" : "Available balance updated successfully");
      } else {
        const error = await response.json();
        alert(error.error || (locale === "ar" ? "فشل في تحديث الرصيد المتاح" : "Failed to update available balance"));
      }
    } catch (error) {
      console.error("Error updating available balance:", error);
      alert(locale === "ar" ? "خطأ في تحديث الرصيد المتاح" : "Error updating available balance");
    } finally {
      setLoading(false);
    }
  };

  const submitRequestWithdrawal = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      alert(locale === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
      return;
    }

    const wallet = wallets.find(w => w.user_id === selectedUser);
    if (!wallet || parseFloat(amount) > (wallet.available_balance || 0)) {
      alert(locale === "ar" ? "المبلغ المطلوب أكبر من الرصيد المتاح" : "Requested amount exceeds available balance");
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
          w.user_id === selectedUser ? { ...w, balance: result.wallet.balance, available_balance: result.wallet.available_balance } : w
        ));
        setShowRequestWithdrawal(false);
        alert(locale === "ar" ? "تم طلب السحب بنجاح" : "Withdrawal request submitted successfully");
      } else {
        const error = await response.json();
        alert(error.error || (locale === "ar" ? "فشل في طلب السحب" : "Failed to request withdrawal"));
      }
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      alert(locale === "ar" ? "خطأ في طلب السحب" : "Error requesting withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">
                {locale === "ar" ? "إجمالي المحافظ" : "Total Wallets"}
              </p>
              <p className="text-2xl font-bold">{stats.totalWallets}</p>
            </div>
            <div className="text-blue-200">
              <FiUsers className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">
                {locale === "ar" ? "الرصيد الإجمالي" : "Total Balance"}
              </p>
              <p className="text-2xl font-bold">{stats.totalBalance.toFixed(3)} OMR</p>
            </div>
            <div className="text-green-200">
              <FiDollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">
                {locale === "ar" ? "الرصيد المتاح" : "Available Balance"}
              </p>
              <p className="text-2xl font-bold">{stats.totalAvailable.toFixed(3)} OMR</p>
            </div>
            <div className="text-purple-200">
              <FiTrendingDown className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">
                {locale === "ar" ? "محافظ برصيد" : "Wallets with Balance"}
              </p>
              <p className="text-2xl font-bold">{stats.walletsWithBalance}</p>
            </div>
            <div className="text-yellow-200">
              <FiCheck className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">
                {locale === "ar" ? "محافظ قابل السحب" : "Withdrawable Wallets"}
              </p>
              <p className="text-2xl font-bold">{stats.walletsWithAvailable}</p>
            </div>
            <div className="text-red-200">
              <FiArrowRight className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder={locale === "ar" ? "البحث في المحافظ..." : "Search wallets..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'has-balance' | 'has-available' | 'pending-withdrawals')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {locale === "ar" ? "إدارة المحافظ" : "Wallet Management"}
          </h2>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedWallets.size === filteredWallets.length && filteredWallets.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "المستخدم" : "User"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "رقم الهاتف" : "Phone Number"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "الرصيد الإجمالي" : "Total Balance"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "الرصيد المتاح" : "Available Balance"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "العملة" : "Currency"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredWallets.map((wallet) => (
                <tr key={wallet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedWallets.has(wallet.user_id)}
                      onChange={(e) => handleSelectWallet(wallet.user_id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {wallet.user_full_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {wallet.user_email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {wallet.user_phone_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {wallet.balance.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                    {wallet.available_balance?.toFixed(3) || '0.000'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {wallet.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => toggleDropdown(wallet.user_id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        disabled={loading}
                      >
                        <FiMoreVertical className="w-4 h-4" />
                      </button>

                      {openDropdown === wallet.user_id && (
                        <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm focus:outline-none overflow-hidden">
                          <div className="py-2">
                            <button
                              onClick={() => {
                                handleViewTransactions(wallet.user_id);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 group"
                              disabled={loading}
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors duration-200">
                                <FiArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="font-medium">{locale === "ar" ? "المعاملات" : "Transactions"}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleAddCredit(wallet.user_id);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 hover:text-green-700 dark:hover:text-green-300 transition-all duration-200 group"
                              disabled={loading}
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 mr-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors duration-200">
                                <FiTrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="font-medium">{locale === "ar" ? "إضافة رصيد" : "Add Credit"}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleDeductCredit(wallet.user_id);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 dark:hover:from-red-900/20 dark:hover:to-rose-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 group"
                              disabled={loading}
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 mr-3 group-hover:bg-red-200 dark:group-hover:bg-red-800/40 transition-colors duration-200">
                                <FiTrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </div>
                              <span className="font-medium">{locale === "ar" ? "خصم رصيد" : "Deduct Credit"}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleEditAvailableBalance(wallet.user_id);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 dark:hover:from-purple-900/20 dark:hover:to-violet-900/20 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 group"
                              disabled={loading}
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 mr-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors duration-200">
                                <FiCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <span className="font-medium">{locale === "ar" ? "تعديل المتاح" : "Edit Available"}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleRequestWithdrawal(wallet.user_id);
                                setOpenDropdown(null);
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 dark:hover:from-orange-900/20 dark:hover:to-amber-900/20 hover:text-orange-700 dark:hover:text-orange-300 transition-all duration-200 group"
                              disabled={loading || (wallet.available_balance || 0) <= 0}
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 mr-3 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/40 transition-colors duration-200">
                                <FiArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              </div>
                              <span className="font-medium">{locale === "ar" ? "طلب سحب" : "Request Withdrawal"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Modal */}
      {showTransactions && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 rounded-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto transform transition-all duration-300 scale-100">
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
            <div className="p-6 space-y-3">
              {transactions.map((transaction) => (
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
                        {new Date(transaction.created_at).toLocaleString(locale === 'ar' ? 'ar' : 'en')}
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Credit Modal */}
      {showAddCredit && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
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
                  placeholder="0.000"
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
                  className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
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
                  placeholder="0.000"
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
                  className="rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 dark:bg-zinc-800 dark:border-zinc-700/50 transform transition-all duration-300 scale-100">
            <div className="border-b border-zinc-200/60 px-6 py-5 dark:border-zinc-700/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {locale === "ar" ? "تعديل الرصيد المتاح" : "Edit Available Balance"}
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
                  {locale === "ar" ? "الرصيد المتاح الجديد" : "New Available Balance"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={availableBalanceAmount}
                  onChange={(e) => setAvailableBalanceAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                  placeholder="0.000"
                />
              </div>

              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800/30">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  {locale === "ar" ? "سيتم تحديث الرصيد المتاح للمستخدم المحدد" : "Available balance will be updated for the selected user"}
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
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
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
                  placeholder="0.000"
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
                  className="rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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