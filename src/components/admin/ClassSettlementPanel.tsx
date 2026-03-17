'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateWorkshopFinanceBreakdown } from '@/lib/classFinanceRules';
import { IoAdd, IoCheckmarkCircle, IoCubeOutline, IoPeopleOutline, IoReceiptOutline, IoWalletOutline } from 'react-icons/io5';
import { formatAmountWithCurrency, formatPlainNumber } from '@/lib/formatNumber';

type ExpenseItem = {
  id?: string;
  title: string;
  amount: number;
  notes?: string | null;
};

type InventoryUsageItemInput = {
  id?: string;
  inventoryItemId: string;
  quantity: number;
  notes?: string | null;
  unitCost?: number;
  totalCost?: number;
  status?: 'PLANNED' | 'POSTED';
  itemName?: string;
  itemUnit?: string;
};

type SettlementSnapshot = {
  classId: string;
  currency: string;
  trainer: {
    id: string;
    fullName: string;
  } | null;
  finance: {
    fixedCosts: {
      kitchenUsageRatePerHour: number;
      workshopContentRatePerParticipant: number;
      durationHours: number;
      kitchenUsageAmount: number;
      workshopContentAmount: number;
      total: number;
    };
    materialsCostAmount: number;
    trainerFee: {
      percent: number;
      baseAmount: number;
      amount: number;
    };
    noonFeeAmount: number;
    totalCostsAmount: number;
  };
  summary: {
    bookingsCount: number;
    participantsCount: number;
    grossRevenue: number;
    fixedCostsAmount: number;
    materialsCostAmount: number;
    trainerFeePercent: number;
    trainerFeeBaseAmount: number;
    trainerFeeAmount: number;
    noonFeeAmount: number;
    totalCostsAmount: number;
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
  inventoryUsageItems: Array<{
    id: string;
    classId: string;
    inventoryItemId: string;
    itemName: string;
    itemUnit: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    notes: string | null;
    status: 'PLANNED' | 'POSTED';
    postedAt: string | null;
    availableStock: number;
    averageUnitCost: number;
  }>;
  inventoryCatalog: Array<{
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    averageUnitCost: number;
    reorderLevel: number;
    isLowStock: boolean;
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

function emptyInventoryUsage(): InventoryUsageItemInput {
  return {
    inventoryItemId: '',
    quantity: 0,
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
  const [inventoryUsageItems, setInventoryUsageItems] = useState<InventoryUsageItemInput[]>([]);
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
    expenses: isArabic ? 'تكلفة المواد' : 'Material Costs',
    inventoryUsage: isArabic ? 'سحب المواد من المخزون' : 'Inventory Usage',
    manualExpenses: isArabic ? 'مصاريف يدوية إضافية' : 'Manual Material Costs',
    notes: isArabic ? 'ملاحظات الإدارة' : 'Admin Notes',
    saveDraft: isArabic ? 'حفظ المسودة' : 'Save Draft',
    closingAction: isArabic ? 'إغلاق الكلاس وتحويل المستحقات' : 'Close Class & Payout',
    closingDone: isArabic ? 'تم إغلاق الكلاس وتحويل المستحقات.' : 'Class closed and payouts transferred.',
    saved: isArabic ? 'تم حفظ مسودة التسوية.' : 'Settlement draft saved.',
    addExpense: isArabic ? 'إضافة تكلفة مواد' : 'Add Material Cost',
    expenseTitle: isArabic ? 'اسم المادة / التكلفة' : 'Material / Cost Title',
    expenseAmount: isArabic ? 'المبلغ' : 'Amount',
    expenseNotes: isArabic ? 'ملاحظات' : 'Notes',
    inventoryItem: isArabic ? 'المادة من المخزون' : 'Inventory Item',
    selectItem: isArabic ? 'اختر المادة' : 'Select item',
    usageQuantity: isArabic ? 'الكمية المستخدمة' : 'Used Quantity',
    unitCost: isArabic ? 'تكلفة الوحدة' : 'Unit Cost',
    lineTotal: isArabic ? 'إجمالي التكلفة' : 'Line Total',
    stockAvailable: isArabic ? 'المتوفر' : 'Available',
    noInventoryItems: isArabic ? 'لا توجد مواد في المخزون بعد. أضفها من صفحة Inventory.' : 'No inventory items found yet. Add items from the Inventory page.',
    addInventoryUsage: isArabic ? 'إضافة سحب من المخزون' : 'Add Inventory Usage',
    inventoryHint: isArabic
      ? 'اختر المادة والكمية ليتم احتساب التكلفة تلقائياً حسب متوسط تكلفة المخزون.'
      : 'Select item and quantity to calculate material cost automatically from inventory average cost.',
    remove: isArabic ? 'حذف' : 'Remove',
    grossRevenue: isArabic ? 'إجمالي الإيراد' : 'Gross Revenue',
    fixedCosts: isArabic ? 'التكاليف الثابتة' : 'Fixed Costs',
    materialsCosts: isArabic ? 'تكلفة المواد' : 'Material Costs',
    trainerPayout: isArabic ? 'أتعاب المدرب' : 'Trainer Fee',
    adminPayout: isArabic ? 'رسوم نون' : 'Noon Fee',
    totalCosts: isArabic ? 'إجمالي التكاليف' : 'Total Costs',
    bookedBy: isArabic ? 'الحجز باسم' : 'Booked By',
    participantName: isArabic ? 'اسم المشارك' : 'Participant Name',
    booking: isArabic ? 'الحجز' : 'Booking',
    session: isArabic ? 'الجلسة' : 'Session',
    dob: isArabic ? 'الميلاد' : 'DOB',
    language: isArabic ? 'اللغة' : 'Language',
    finance: isArabic ? 'تفصيل الورشة المالي' : 'Workshop Finance Breakdown',
    kitchenUsage: isArabic ? 'استخدام المطبخ' : 'Kitchen Usage',
    workshopContent: isArabic ? 'محتوى الورشة' : 'Workshop Content',
    fixedCostFormula: isArabic ? 'تحسب تلقائياً من مدة الورشة وعدد المشاركين.' : 'Calculated automatically from workshop duration and participant count.',
    trainerRule: isArabic ? 'تحسب على الإيراد المتبقي بعد التكاليف الثابتة وتكلفة المواد.' : 'Calculated from revenue remaining after fixed costs and material costs.',
    trainerBase: isArabic ? 'الأساس المحتسب' : 'Fee Base',
    remainingAfterCosts: isArabic ? 'المتبقي لنون' : 'Remaining for Noon',
    closed: isArabic ? 'مغلق' : 'Closed',
    open: isArabic ? 'مفتوح' : 'Open',
    noParticipants: isArabic ? 'لا يوجد مشاركون مدفوعون لهذا الكلاس حتى الآن.' : 'No paid participants for this class yet.',
    noExpenses: isArabic ? 'لم يتم تسجيل أي تكلفة مواد بعد.' : 'No material costs recorded yet.',
    insufficientStock: isArabic ? 'الكمية المطلوبة أكبر من المتوفر في المخزون.' : 'Required quantity is greater than available stock.',
    closedAt: isArabic ? 'تاريخ الإغلاق' : 'Closed At',
    plannerHint: isArabic
      ? 'التكاليف الثابتة تحسب تلقائياً: استخدام المطبخ = 2.8 × مدة الورشة بالساعات، ومحتوى الورشة = 0.2 × عدد المشاركين. تكلفة المواد يمكن تسجيلها يدوياً أو عبر السحب من المخزون.'
      : 'Fixed costs are automatic: kitchen usage = 2.8 x workshop duration in hours, and workshop content = 0.2 x participant count. Material costs can be tracked manually or via inventory usage.',
    negativeNoonFee: isArabic
      ? 'رسوم نون أصبحت سالبة. راجع تكاليف المواد أو الإيراد قبل الإغلاق.'
      : 'Noon fee is negative. Review material costs or revenue before closing.',
  };

  const formatMoney = (value: number, currency: string) => formatAmountWithCurrency(value, currency);

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(localeCode, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const loadSnapshot = useCallback(async () => {
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
      setInventoryUsageItems(
        payload.inventoryUsageItems.length > 0
          ? payload.inventoryUsageItems.map((item) => ({
              id: item.id,
              inventoryItemId: item.inventoryItemId,
              quantity: item.quantity,
              notes: item.notes,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              status: item.status,
              itemName: item.itemName,
              itemUnit: item.itemUnit,
            }))
          : []
      );
      setNotes(payload.settlement?.notes || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load class settlement');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const canEdit = snapshot?.settlement?.status !== 'CLOSED' && classStatus !== 'COMPLETED';
  const inventoryCatalogById = useMemo(() => {
    if (!snapshot) return new Map<string, SettlementSnapshot['inventoryCatalog'][number]>();
    return new Map(snapshot.inventoryCatalog.map((item) => [item.id, item]));
  }, [snapshot]);
  const totalManualExpenseAmount = useMemo(
    () => expenseItems.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0),
    [expenseItems]
  );
  const totalInventoryUsageAmount = useMemo(
    () =>
      inventoryUsageItems.reduce((sum, item) => {
        const catalogItem = inventoryCatalogById.get(item.inventoryItemId);
        const unitCost = canEdit ? (catalogItem?.averageUnitCost ?? item.unitCost ?? 0) : (item.unitCost ?? catalogItem?.averageUnitCost ?? 0);
        return sum + (Number.isFinite(item.quantity) ? Number(item.quantity) : 0) * unitCost;
      }, 0),
    [canEdit, inventoryCatalogById, inventoryUsageItems]
  );
  const totalExpenseAmount = useMemo(
    () => totalManualExpenseAmount + totalInventoryUsageAmount,
    [totalInventoryUsageAmount, totalManualExpenseAmount]
  );
  const hasInventoryShortage = useMemo(
    () =>
      canEdit
        && inventoryUsageItems.some((item) => {
          const catalogItem = inventoryCatalogById.get(item.inventoryItemId);
          if (!catalogItem) return false;
          return item.quantity > catalogItem.currentStock;
        }),
    [canEdit, inventoryCatalogById, inventoryUsageItems]
  );
  const grossRevenue = snapshot?.summary.grossRevenue ?? 0;
  const financePreview = useMemo(() => {
    if (!snapshot) return null;

    const trainerPercent = snapshot.finance.trainerFee.percent;

    return calculateWorkshopFinanceBreakdown({
      grossRevenue,
      participantsCount: snapshot.summary.participantsCount,
      durationMinutes: Math.round(snapshot.finance.fixedCosts.durationHours * 60),
      materialsCostAmount: totalExpenseAmount,
      costSettings: {
        kitchenUsageRatePerHour: snapshot.finance.fixedCosts.kitchenUsageRatePerHour,
        workshopContentRatePerParticipant: snapshot.finance.fixedCosts.workshopContentRatePerParticipant,
      },
      trainerShareTiers: [
        {
          minParticipants: 0,
          maxParticipants: null,
          percent: trainerPercent,
        },
      ],
    });
  }, [grossRevenue, snapshot, totalExpenseAmount]);

  const canClosePreview = Boolean(
    snapshot
      && snapshot.summary.participantsCount > 0
      && snapshot.trainer?.id
      && (financePreview?.noonFeeAmount ?? -1) >= 0
      && !hasInventoryShortage
  );

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/settlement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseItems, inventoryUsageItems, notes }),
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
      setExpenseItems(
        payload.snapshot.expenses.length > 0
          ? payload.snapshot.expenses.map((item) => ({ id: item.id, title: item.title, amount: item.amount, notes: item.notes }))
          : [emptyExpense()]
      );
      setInventoryUsageItems(
        payload.snapshot.inventoryUsageItems.map((item) => ({
          id: item.id,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          notes: item.notes,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          status: item.status,
          itemName: item.itemName,
          itemUnit: item.itemUnit,
        }))
      );
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
      const response = await fetch(`/api/admin/classes/${classId}/settlement/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseItems, inventoryUsageItems, notes }),
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
      setExpenseItems(
        payload.snapshot.expenses.length > 0
          ? payload.snapshot.expenses.map((item) => ({ id: item.id, title: item.title, amount: item.amount, notes: item.notes }))
          : [emptyExpense()]
      );
      setInventoryUsageItems(
        payload.snapshot.inventoryUsageItems.map((item) => ({
          id: item.id,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          notes: item.notes,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          status: item.status,
          itemName: item.itemName,
          itemUnit: item.itemUnit,
        }))
      );
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
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.fixedCosts}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(financePreview?.fixedCosts.total ?? snapshot.summary.fixedCostsAmount, snapshot.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.materialsCosts}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(totalExpenseAmount, snapshot.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.trainerPayout}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(financePreview?.trainerFee.amount ?? snapshot.summary.trainerFeeAmount, snapshot.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.adminPayout}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(financePreview?.noonFeeAmount ?? snapshot.summary.noonFeeAmount, snapshot.currency)}
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

            <div className="mt-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.manualExpenses}</h4>
              <div className="mt-3 space-y-3">
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

            <div className="mt-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <IoCubeOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.inventoryUsage}</h4>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.inventoryHint}</p>

              {snapshot.inventoryCatalog.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t.noInventoryItems}</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {inventoryUsageItems.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noExpenses}</p>
                  ) : null}
                  {inventoryUsageItems.map((item, index) => {
                    const catalogItem = inventoryCatalogById.get(item.inventoryItemId);
                    const unitCost = canEdit
                      ? (catalogItem?.averageUnitCost ?? item.unitCost ?? 0)
                      : (item.unitCost ?? catalogItem?.averageUnitCost ?? 0);
                    const lineTotal = Number((item.quantity * unitCost).toFixed(3));
                    const hasShortage = canEdit && Boolean(catalogItem) && item.quantity > (catalogItem?.currentStock ?? 0);
                    return (
                      <div key={`inventory-usage-${index}`} className="grid gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
                          <label className="text-sm">
                            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.inventoryItem}</span>
                            <select
                              value={item.inventoryItemId}
                              disabled={!canEdit}
                              onChange={(event) =>
                                setInventoryUsageItems((prev) =>
                                  prev.map((row, rowIndex) =>
                                    rowIndex === index ? { ...row, inventoryItemId: event.target.value } : row
                                  )
                                )
                              }
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            >
                              <option value="">{t.selectItem}</option>
                              {snapshot.inventoryCatalog.map((catalog) => (
                                <option key={catalog.id} value={catalog.id}>
                                  {catalog.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm">
                            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.usageQuantity}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.quantity}
                              disabled={!canEdit}
                              onChange={(event) =>
                                setInventoryUsageItems((prev) =>
                                  prev.map((row, rowIndex) =>
                                    rowIndex === index ? { ...row, quantity: Number(event.target.value || 0) } : row
                                  )
                                )
                              }
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                          <div className="grid gap-2">
                            <div className="text-sm">
                              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.unitCost}</span>
                              <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                                {formatMoney(unitCost, snapshot.currency)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                          <label className="text-sm">
                            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.expenseNotes}</span>
                            <input
                              value={item.notes || ''}
                              disabled={!canEdit}
                              onChange={(event) =>
                                setInventoryUsageItems((prev) =>
                                  prev.map((row, rowIndex) =>
                                    rowIndex === index ? { ...row, notes: event.target.value } : row
                                  )
                                )
                              }
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                          <div className="text-sm">
                            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.lineTotal}</span>
                            <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                              {formatMoney(lineTotal, snapshot.currency)}
                            </div>
                          </div>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => setInventoryUsageItems((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                              className="self-end rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                            >
                              {t.remove}
                            </button>
                          ) : null}
                        </div>

                        {catalogItem ? (
                          <p className={`text-xs ${hasShortage ? 'text-rose-600 dark:text-rose-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {`${t.stockAvailable}: ${formatPlainNumber(catalogItem.currentStock)} ${catalogItem.unit}${hasShortage ? ` - ${t.insufficientStock}` : ''}`}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {canEdit && snapshot.inventoryCatalog.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setInventoryUsageItems((prev) => [...prev, emptyInventoryUsage()])}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <IoAdd className="h-4 w-4" />
                  {t.addInventoryUsage}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <IoWalletOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.finance}</h3>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.fixedCostFormula}</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.kitchenUsage}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.fixedCosts.kitchenUsageAmount ?? snapshot.finance.fixedCosts.kitchenUsageAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {`${formatPlainNumber(snapshot.finance.fixedCosts.kitchenUsageRatePerHour)} x ${formatPlainNumber(financePreview?.fixedCosts.durationHours ?? snapshot.finance.fixedCosts.durationHours, { maxFractionDigits: 2 })} h`}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.workshopContent}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.fixedCosts.workshopContentAmount ?? snapshot.finance.fixedCosts.workshopContentAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {`${formatPlainNumber(snapshot.finance.fixedCosts.workshopContentRatePerParticipant)} x ${snapshot.summary.participantsCount}`}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.materialsCosts}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(totalExpenseAmount, snapshot.currency)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.trainerPayout}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.trainerFee.amount ?? snapshot.summary.trainerFeeAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.trainerRule}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {`${t.trainerBase}: ${formatMoney(financePreview?.trainerFee.baseAmount ?? snapshot.summary.trainerFeeBaseAmount, snapshot.currency)} x ${formatPlainNumber(financePreview?.trainerFee.percent ?? snapshot.summary.trainerFeePercent, { maxFractionDigits: 0 })}%`}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.adminPayout}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.noonFeeAmount ?? snapshot.summary.noonFeeAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.remainingAfterCosts}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.totalCosts}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.totalCostsAmount ?? snapshot.summary.totalCostsAmount, snapshot.currency)}
                  </span>
                </div>
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
                  {formatMoney(financePreview?.trainerFee.amount ?? snapshot.summary.trainerFeeAmount, snapshot.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">{t.adminPayout}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMoney(financePreview?.noonFeeAmount ?? snapshot.summary.noonFeeAmount, snapshot.currency)}
                </span>
              </div>
            </div>

            {financePreview && financePreview.noonFeeAmount < 0 ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                {t.negativeNoonFee}
              </div>
            ) : null}
            {hasInventoryShortage ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                {t.insufficientStock}
              </div>
            ) : null}

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
                  disabled={closing || !canClosePreview}
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
