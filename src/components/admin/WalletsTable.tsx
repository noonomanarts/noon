'use client';

import { useState } from 'react';
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
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

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
          w.user_id === selectedUser ? { ...w, balance: result.wallet.balance } : w
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
          w.user_id === selectedUser ? { ...w, balance: result.wallet.balance } : w
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

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {locale === "ar" ? "جميع المحافظ" : "All Wallets"}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "المستخدم" : "User"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "رقم الهاتف" : "Phone Number"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {locale === "ar" ? "الرصيد" : "Balance"}
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
              {wallets.map((wallet) => (
                <tr key={wallet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {wallet.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                      onClick={() => handleViewTransactions(wallet.user_id)}
                      disabled={loading}
                    >
                      {locale === "ar" ? "عرض المعاملات" : "View Transactions"}
                    </button>
                    <button
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                      onClick={() => handleAddCredit(wallet.user_id)}
                      disabled={loading}
                    >
                      {locale === "ar" ? "إضافة رصيد" : "Add Credit"}
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => handleDeductCredit(wallet.user_id)}
                      disabled={loading}
                    >
                      {locale === "ar" ? "خصم رصيد" : "Deduct Credit"}
                    </button>
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
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
    </>
  );
}