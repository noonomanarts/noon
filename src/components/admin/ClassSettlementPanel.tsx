'use client';

import { useEffect, useMemo, useState } from 'react';
import { IoAdd, IoCheckmarkCircle, IoPeopleOutline, IoReceiptOutline, IoWalletOutline } from 'react-icons/io5';

type ExpenseItem = {
  id?: string;
  title: string;
  amount: number;
  notes?: string | null;
};

type SettlementSnapshot = {
  classId: string;
  currency: string;
  trainer: {
    id: string;
    fullName: string;
  } | null;
  finance: {
    trainerSharePercent: number;
    noonSharePercent: number;
    expenseSharePercent: number;
    totalPercent: number;
  };
  summary: {
    bookingsCount: number;
    participantsCount: number;
    grossRevenue: number;
    trainerPayoutAmount: number;
    adminShareAmount: number;
    expenseBudgetAmount: number;
    adminTotalPayoutAmount: number;
    actualExpensesTotal: number;
    expenseVarianceAmount: number;
  };
  participants: Array<{
    bookingId: string;
    bookingNumber: string;
    customerName: string;
    customerEmail: string | null;
    sessionStartTime: string;
    participantIndex: number;
    participantName: string;
    participantDateOfBirth: string | null;
    participantPreferredLanguage: string | null;
  }>;
  expenses: Array<{
    id: string;
    title: string;
    amount: number;
    notes: string | null;
  }>;
  settlement: {
    status: 'DRAFT' | 'CLOSED';
    notes: string | null;
    settledAt: string | null;
    settledByUserId: string | null;
  } | null;
  warnings: string[];
  canClose: boolean;
};

function emptyExpense(): ExpenseItem {
  return {
    title: '',
    amount: 0,
    notes: '',
  };
}

export default function ClassSettlementPanel({
  classId,
  locale,
  classStatus,
  onClosed,
}: {
  classId: string;
  locale: string;
  classStatus: string;
  onClosed?: () => Promise<void> | void;
}) {
  const isArabic = locale === 'ar';
  const localeCode = isArabic ? 'ar-OM' : 'en-OM';

  const [snapshot, setSnapshot] = useState<SettlementSnapshot | null>(null);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [finance, setFinance] = useState({
    trainerSharePercent: 0,
    noonSharePercent: 0,
    expenseSharePercent: 0,
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة إغلاق الكلاس والتسوية' : 'Class Closure & Settlement',
    subtitle: isArabic
      ? 'من هنا تراجع المشتركين، تضيف المصاريف، ثم تغلق الكلاس وتوزع الحصص على المحافظ.'
      : 'Review participants, record expenses, then close the class and distribute the payouts to wallets.',
    loading: isArabic ? 'جاري تحميل بيانات التسوية...' : 'Loading settlement data...',
    participants: isArabic ? 'المشاركون المسجلون' : 'Registered Participants',
    expenses: isArabic ? 'مصاريف الكلاس' : 'Class Expenses',
    notes: isArabic ? 'ملاحظات الإدارة' : 'Admin Notes',
    saveDraft: isArabic ? 'حفظ المسودة' : 'Save Draft',
    closingAction: isArabic ? 'إغلاق الكلاس وتحويل المستحقات' : 'Close Class & Payout',
    closingDone: isArabic ? 'تم إغلاق الكلاس وتحويل المستحقات.' : 'Class closed and payouts transferred.',
    saved: isArabic ? 'تم حفظ مسودة التسوية.' : 'Settlement draft saved.',
    addExpense: isArabic ? 'إضافة مصروف' : 'Add Expense',
    expenseTitle: isArabic ? 'اسم المصروف' : 'Expense Title',
    expenseAmount: isArabic ? 'المبلغ' : 'Amount',
    expenseNotes: isArabic ? 'ملاحظات' : 'Notes',
    remove: isArabic ? 'حذف' : 'Remove',
    grossRevenue: isArabic ? 'إيراد الكلاس' : 'Gross Revenue',
    trainerPayout: isArabic ? 'مستحق المدرب' : 'Trainer Payout',
    adminPayout: isArabic ? 'مستحق الإدارة + المصاريف' : 'Admin Share + Expense Budget',
    actualExpenses: isArabic ? 'المصاريف الفعلية' : 'Actual Expenses',
    expenseVariance: isArabic ? 'فرق المصروف' : 'Expense Variance',
    bookedBy: isArabic ? 'الحجز باسم' : 'Booked By',
    participantName: isArabic ? 'اسم المشارك' : 'Participant Name',
    booking: isArabic ? 'الحجز' : 'Booking',
    session: isArabic ? 'الجلسة' : 'Session',
    dob: isArabic ? 'الميلاد' : 'DOB',
    language: isArabic ? 'اللغة' : 'Language',
    finance: isArabic ? 'توزيع النسب' : 'Finance Split',
    trainerShare: isArabic ? 'نسبة المدرب' : 'Trainer Share',
    noonShare: isArabic ? 'نسبة نون' : 'Noon Share',
    expenseShare: isArabic ? 'نسبة المصاريف' : 'Expense Share',
    totalShare: isArabic ? 'المجموع' : 'Total',
    closed: isArabic ? 'مغلق' : 'Closed',
    open: isArabic ? 'مفتوح' : 'Open',
    noParticipants: isArabic ? 'لا يوجد مشاركون مدفوعون لهذا الكلاس حتى الآن.' : 'No paid participants for this class yet.',
    noExpenses: isArabic ? 'لم يتم تسجيل أي مصروف بعد.' : 'No expenses recorded yet.',
    closedAt: isArabic ? 'تاريخ الإغلاق' : 'Closed At',
    plannerHint: isArabic
      ? 'إيداع الإدارة يتم بناءً على نسبة نون + نسبة المصاريف المعرّفة على الكلاس. المصاريف الفعلية هنا للمتابعة والمراجعة.'
      : 'Admin payout uses the configured Noon share plus expense budget. Actual expenses here are for tracking and review.',
  };

  const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat(localeCode, {
      style: 'currency',
      currency,
      maximumFractionDigits: 3,
    }).format(value);

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(localeCode, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/settlement`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as SettlementSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load class settlement');
      }

      setSnapshot(payload);
      setExpenseItems(
        payload.expenses.length > 0
          ? payload.expenses.map((item) => ({ id: item.id, title: item.title, amount: item.amount, notes: item.notes }))
          : [emptyExpense()]
      );
      setFinance({
        trainerSharePercent: payload.finance.trainerSharePercent,
        noonSharePercent: payload.finance.noonSharePercent,
        expenseSharePercent: payload.finance.expenseSharePercent,
      });
      setNotes(payload.settlement?.notes || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load class settlement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, [classId]);

  const canEdit = snapshot?.settlement?.status !== 'CLOSED' && classStatus !== 'COMPLETED';
  const financeTotal = useMemo(
    () => finance.trainerSharePercent + finance.noonSharePercent + finance.expenseSharePercent,
    [finance]
  );
  const totalExpenseAmount = useMemo(
    () => expenseItems.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0),
    [expenseItems]
  );
  const grossRevenue = snapshot?.summary.grossRevenue ?? 0;
  const trainerPayoutPreview = useMemo(
    () => Number(((grossRevenue * finance.trainerSharePercent) / 100).toFixed(3)),
    [finance.trainerSharePercent, grossRevenue]
  );
  const adminSharePreview = useMemo(
    () => Number(((grossRevenue * finance.noonSharePercent) / 100).toFixed(3)),
    [finance.noonSharePercent, grossRevenue]
  );
  const expenseBudgetPreview = useMemo(
    () => Number(((grossRevenue * finance.expenseSharePercent) / 100).toFixed(3)),
    [finance.expenseSharePercent, grossRevenue]
  );
  const adminTotalPayoutPreview = useMemo(
    () => Number((adminSharePreview + expenseBudgetPreview).toFixed(3)),
    [adminSharePreview, expenseBudgetPreview]
  );

  const persistFinance = async () => {
    const response = await fetch(`/api/admin/classes/${classId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finance),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update class finance');
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await persistFinance();

      const response = await fetch(`/api/admin/classes/${classId}/settlement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseItems, notes }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        snapshot?: SettlementSnapshot;
      };

      if (!response.ok || !payload.success || !payload.snapshot) {
        throw new Error(payload.error || 'Failed to save settlement draft');
      }

      setSnapshot(payload.snapshot);
      setSuccess(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save settlement draft');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseClass = async () => {
    setClosing(true);
    setError(null);
    setSuccess(null);

    try {
      await persistFinance();

      const response = await fetch(`/api/admin/classes/${classId}/settlement/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseItems, notes }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        snapshot?: SettlementSnapshot;
      };

      if (!response.ok || !payload.success || !payload.snapshot) {
        throw new Error(payload.error || 'Failed to close class');
      }

      setSnapshot(payload.snapshot);
      setSuccess(t.closingDone);
      if (onClosed) {
        await onClosed();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to close class');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.loading}</p>
      </section>
    );
  }

  if (!snapshot) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            snapshot.settlement?.status === 'CLOSED' || classStatus === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          }`}
        >
          {snapshot.settlement?.status === 'CLOSED' || classStatus === 'COMPLETED' ? t.closed : t.open}
        </span>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      {snapshot.warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          <ul className="list-disc space-y-1 ps-5">
            {snapshot.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.grossRevenue}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(snapshot.summary.grossRevenue, snapshot.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.trainerPayout}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(trainerPayoutPreview, snapshot.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.adminPayout}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(adminTotalPayoutPreview, snapshot.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.actualExpenses}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(totalExpenseAmount, snapshot.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.expenseVariance}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(expenseBudgetPreview - totalExpenseAmount, snapshot.currency)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <IoPeopleOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.participants}</h3>
            </div>
            {snapshot.participants.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noParticipants}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                  <thead>
                    <tr className="text-left text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 pe-4">{t.participantName}</th>
                      <th className="py-2 pe-4">{t.bookedBy}</th>
                      <th className="py-2 pe-4">{t.session}</th>
                      <th className="py-2 pe-4">{t.booking}</th>
                      <th className="py-2 pe-4">{t.dob}</th>
                      <th className="py-2">{t.language}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {snapshot.participants.map((participant) => (
                      <tr key={`${participant.bookingId}-${participant.participantIndex}`}>
                        <td className="py-3 pe-4 font-medium text-zinc-900 dark:text-zinc-100">{participant.participantName}</td>
                        <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">
                          <div>{participant.customerName}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{participant.customerEmail || '—'}</div>
                        </td>
                        <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{formatDateTime(participant.sessionStartTime)}</td>
                        <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{participant.bookingNumber}</td>
                        <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{participant.participantDateOfBirth || '—'}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-300">{participant.participantPreferredLanguage || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <IoReceiptOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.expenses}</h3>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.plannerHint}</p>

            <div className="mt-4 space-y-3">
              {expenseItems.map((item, index) => (
                <div key={`expense-${index}`} className="grid gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.expenseTitle}</span>
                      <input
                        value={item.title}
                        onChange={(event) =>
                          setExpenseItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, title: event.target.value } : row)))
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.expenseAmount}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.amount}
                        onChange={(event) =>
                          setExpenseItems((prev) =>
                            prev.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, amount: Number(event.target.value || 0) } : row
                            )
                          )
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.expenseNotes}</span>
                      <input
                        value={item.notes || ''}
                        onChange={(event) =>
                          setExpenseItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, notes: event.target.value } : row)))
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpenseItems((prev) => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : [emptyExpense()]))
                        }
                        className="self-end rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        {t.remove}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => setExpenseItems((prev) => [...prev, emptyExpense()])}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <IoAdd className="h-4 w-4" />
                {t.addExpense}
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <IoWalletOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.finance}</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <span className="text-zinc-500 dark:text-zinc-400">{t.trainerShare}</span>
                {canEdit ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={finance.trainerSharePercent}
                    onChange={(event) =>
                      setFinance((prev) => ({ ...prev, trainerSharePercent: Number(event.target.value || 0) }))
                    }
                    className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-right text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                ) : (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{snapshot.finance.trainerSharePercent.toFixed(2)}%</span>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <span className="text-zinc-500 dark:text-zinc-400">{t.noonShare}</span>
                {canEdit ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={finance.noonSharePercent}
                    onChange={(event) =>
                      setFinance((prev) => ({ ...prev, noonSharePercent: Number(event.target.value || 0) }))
                    }
                    className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-right text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                ) : (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{snapshot.finance.noonSharePercent.toFixed(2)}%</span>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <span className="text-zinc-500 dark:text-zinc-400">{t.expenseShare}</span>
                {canEdit ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={finance.expenseSharePercent}
                    onChange={(event) =>
                      setFinance((prev) => ({ ...prev, expenseSharePercent: Number(event.target.value || 0) }))
                    }
                    className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-right text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                ) : (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{snapshot.finance.expenseSharePercent.toFixed(2)}%</span>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <span className="text-zinc-500 dark:text-zinc-400">{t.totalShare}</span>
                <span
                  className={`font-semibold ${
                    Math.abs(financeTotal - 100) <= 0.01
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {financeTotal.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <label className="text-sm">
              <span className="mb-1.5 block text-zinc-700 dark:text-zinc-200">{t.notes}</span>
              <textarea
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={!canEdit}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            {snapshot.settlement?.settledAt ? (
              <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-300">
                <strong>{t.closedAt}:</strong> {formatDateTime(snapshot.settlement.settledAt)}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">{t.trainerPayout}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMoney(trainerPayoutPreview, snapshot.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">{t.adminPayout}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMoney(adminTotalPayoutPreview, snapshot.currency)}
                </span>
              </div>
            </div>

            {canEdit ? (
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {saving ? '...' : t.saveDraft}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCloseClass()}
                  disabled={closing || snapshot.summary.participantsCount === 0 || Math.abs(financeTotal - 100) > 0.01}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IoCheckmarkCircle className="h-4 w-4" />
                  {closing ? '...' : t.closingAction}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
