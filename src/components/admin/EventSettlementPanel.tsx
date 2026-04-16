'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoAdd, IoCheckmarkCircle, IoCubeOutline, IoReceiptOutline, IoWalletOutline } from 'react-icons/io5';
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
  manualCostAmount?: number | null;
  notes?: string | null;
  unitCost?: number;
  totalCost?: number;
  status?: 'PLANNED' | 'POSTED';
  itemName?: string;
  itemUnit?: string;
};

type SettlementSnapshot = {
  eventId: string;
  bookingNumber: string;
  eventType: string;
  eventTitle: string;
  currency: string;
  paymentStatus: string;
  finance: {
    materialsCostAmount: number;
    totalCostsAmount: number;
    netProfitAmount: number;
  };
  summary: {
    grossRevenue: number;
    materialsCostAmount: number;
    totalCostsAmount: number;
    netProfitAmount: number;
  };
  expenses: Array<{
    id: string;
    title: string;
    amount: number;
    notes: string | null;
  }>;
  inventoryUsageItems: Array<{
    id: string;
    eventId: string;
    inventoryItemId: string;
    itemName: string;
    itemUnit: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    manualCostAmount: number | null;
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
    allowsManualCost: boolean;
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
  return { title: '', amount: 0, notes: '' };
}

function emptyInventoryUsage(): InventoryUsageItemInput {
  return { inventoryItemId: '', quantity: 0, manualCostAmount: null, notes: '' };
}

export default function EventSettlementPanel({
  eventId,
  locale,
  eventStatus,
  onClosed,
}: {
  eventId: string;
  locale: string;
  eventStatus: string;
  onClosed?: () => Promise<void> | void;
}) {
  const isArabic = locale === 'ar';
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
    title: isArabic ? 'تسوية وإغلاق الفعالية' : 'Event Settlement & Close',
    loading: isArabic ? 'جاري تحميل بيانات التسوية...' : 'Loading settlement data...',
    manualExpenses: isArabic ? 'تكاليف المواد اليدوية' : 'Manual Material Costs',
    inventoryUsage: isArabic ? 'سحب المواد من المخزون' : 'Inventory Usage',
    notes: isArabic ? 'ملاحظات الإدارة' : 'Admin Notes',
    expenseTitle: isArabic ? 'اسم التكلفة' : 'Cost Title',
    expenseAmount: isArabic ? 'المبلغ' : 'Amount',
    expenseNotes: isArabic ? 'ملاحظات' : 'Notes',
    addExpense: isArabic ? 'إضافة تكلفة' : 'Add Cost',
    addInventoryUsage: isArabic ? 'إضافة سحب' : 'Add Usage',
    inventoryItem: isArabic ? 'المادة' : 'Inventory Item',
    selectItem: isArabic ? 'اختر المادة' : 'Select item',
    usageQuantity: isArabic ? 'الكمية' : 'Quantity',
    unitCost: isArabic ? 'تكلفة الوحدة' : 'Unit Cost',
    lineTotal: isArabic ? 'الإجمالي' : 'Line Total',
    manualMaterialCost: isArabic ? 'تكلفة يدوية' : 'Manual Cost',
    stockAvailable: isArabic ? 'المتوفر' : 'Available',
    remove: isArabic ? 'حذف' : 'Remove',
    grossRevenue: isArabic ? 'الإيراد المدفوع' : 'Paid Revenue',
    materialsCost: isArabic ? 'تكلفة المواد' : 'Material Costs',
    totalCosts: isArabic ? 'إجمالي التكاليف' : 'Total Costs',
    netProfit: isArabic ? 'صافي الربح' : 'Net Profit',
    saveDraft: isArabic ? 'حفظ المسودة' : 'Save Draft',
    closeEvent: isArabic ? 'إغلاق الفعالية واعتماد التسوية' : 'Close Event & Post Settlement',
    saved: isArabic ? 'تم حفظ مسودة التسوية.' : 'Settlement draft saved.',
    closed: isArabic ? 'تم إغلاق الفعالية واعتماد التسوية.' : 'Event closed and settlement posted.',
    noInventoryItems: isArabic ? 'لا توجد عناصر مخزون متاحة.' : 'No inventory items available.',
    closedAt: isArabic ? 'تاريخ الإغلاق' : 'Closed At',
    paymentRequired: isArabic ? 'يجب تعليم الحجز كمدفوع قبل الإغلاق.' : 'Booking must be marked as paid before closing.',
  };

  const formatMoney = (value: number, currency: string) => formatAmountWithCurrency(value, currency, { locale });

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(isArabic ? 'ar-OM-u-nu-latn' : 'en-OM', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/events/${eventId}/settlement`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as SettlementSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load event settlement');
      }

      setSnapshot(payload);
      setExpenseItems(payload.expenses.length > 0 ? payload.expenses.map((item) => ({ id: item.id, title: item.title, amount: item.amount, notes: item.notes })) : [emptyExpense()]);
      setInventoryUsageItems(payload.inventoryUsageItems.length > 0 ? payload.inventoryUsageItems.map((item) => ({ id: item.id, inventoryItemId: item.inventoryItemId, quantity: item.quantity, manualCostAmount: item.manualCostAmount, notes: item.notes, unitCost: item.unitCost, totalCost: item.totalCost, status: item.status, itemName: item.itemName, itemUnit: item.itemUnit })) : []);
      setNotes(payload.settlement?.notes || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load event settlement');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const canEdit = snapshot?.settlement?.status !== 'CLOSED' && eventStatus !== 'COMPLETED';
  const inventoryCatalogById = useMemo(() => new Map((snapshot?.inventoryCatalog || []).map((item) => [item.id, item])), [snapshot]);
  const previewInventoryTotal = useMemo(() => inventoryUsageItems.reduce((sum, item) => {
    const catalogItem = inventoryCatalogById.get(item.inventoryItemId);
    const manualCostAmount = Number(item.manualCostAmount ?? 0);
    if (catalogItem?.allowsManualCost && manualCostAmount > 0) return sum + manualCostAmount;
    const unitCost = item.unitCost ?? catalogItem?.averageUnitCost ?? 0;
    return sum + Number(item.quantity || 0) * unitCost;
  }, 0), [inventoryCatalogById, inventoryUsageItems]);
  const previewManualExpenseTotal = useMemo(() => expenseItems.reduce((sum, item) => sum + Number(item.amount || 0), 0), [expenseItems]);
  const previewTotalCosts = previewManualExpenseTotal + previewInventoryTotal;
  const previewNetProfit = (snapshot?.summary.grossRevenue ?? 0) - previewTotalCosts;
  const hasInventoryShortage = useMemo(() => inventoryUsageItems.some((item) => {
    const catalogItem = inventoryCatalogById.get(item.inventoryItemId);
    if (!catalogItem) return false;
    const manualCostAmount = Number(item.manualCostAmount ?? 0);
    const requiredQuantity = catalogItem.allowsManualCost && manualCostAmount > 0 ? (catalogItem.averageUnitCost > 0 ? manualCostAmount / catalogItem.averageUnitCost : Number.POSITIVE_INFINITY) : Number(item.quantity || 0);
    return requiredQuantity > catalogItem.currentStock;
  }), [inventoryCatalogById, inventoryUsageItems]);

  const persist = async (mode: 'draft' | 'close') => {
    const response = await fetch(mode === 'close' ? `/api/admin/events/${eventId}/settlement/close` : `/api/admin/events/${eventId}/settlement`, {
      method: mode === 'close' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseItems, inventoryUsageItems, notes }),
    });
    const payload = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string; snapshot?: SettlementSnapshot };
    if (!response.ok || !payload.success || !payload.snapshot) {
      throw new Error(payload.error || 'Failed to save event settlement');
    }
    setSnapshot(payload.snapshot);
    setExpenseItems(payload.snapshot.expenses.length > 0 ? payload.snapshot.expenses.map((item) => ({ id: item.id, title: item.title, amount: item.amount, notes: item.notes })) : [emptyExpense()]);
    setInventoryUsageItems(payload.snapshot.inventoryUsageItems.map((item) => ({ id: item.id, inventoryItemId: item.inventoryItemId, quantity: item.quantity, manualCostAmount: item.manualCostAmount, notes: item.notes, unitCost: item.unitCost, totalCost: item.totalCost, status: item.status, itemName: item.itemName, itemUnit: item.itemUnit })));
    setNotes(payload.snapshot.settlement?.notes || '');
  };

  if (loading) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{t.loading}</div>;
  }

  if (!snapshot) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</h2>
          {snapshot.settlement?.settledAt ? <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.closedAt}: {formatDateTime(snapshot.settlement.settledAt)}</p> : null}
        </div>
        {snapshot.settlement?.status === 'CLOSED' ? <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"><IoCheckmarkCircle className="h-4 w-4" />{isArabic ? 'مغلقة' : 'Closed'}</span> : null}
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">{error}</p> : null}
      {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300">{success}</p> : null}
      {snapshot.warnings.length > 0 ? <div className="mt-4 space-y-2">{snapshot.warnings.map((warning) => <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300">{warning}</p>)}</div> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><IoWalletOutline className="h-4 w-4" />{t.grossRevenue}</div><p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(snapshot.summary.grossRevenue, snapshot.currency)}</p></div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><IoReceiptOutline className="h-4 w-4" />{t.materialsCost}</div><p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(previewTotalCosts, snapshot.currency)}</p></div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><IoReceiptOutline className="h-4 w-4" />{t.totalCosts}</div><p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(previewTotalCosts, snapshot.currency)}</p></div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><IoWalletOutline className="h-4 w-4" />{t.netProfit}</div><p className={`mt-2 text-xl font-semibold ${previewNetProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{formatMoney(previewNetProfit, snapshot.currency)}</p></div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t.manualExpenses}</h3>{canEdit ? <button type="button" onClick={() => setExpenseItems((current) => [...current, emptyExpense()])} className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"><IoAdd className="h-4 w-4" />{t.addExpense}</button> : null}</div>
          <div className="space-y-3">{expenseItems.map((item, index) => <div key={`${item.id || 'expense'}-${index}`} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm text-zinc-600 dark:text-zinc-300"><span className="mb-1 block">{t.expenseTitle}</span><input value={item.title} onChange={(event) => setExpenseItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry))} disabled={!canEdit} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100" /></label><label className="text-sm text-zinc-600 dark:text-zinc-300"><span className="mb-1 block">{t.expenseAmount}</span><input type="number" min="0" step="0.001" value={item.amount} onChange={(event) => setExpenseItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, amount: Number(event.target.value || 0) } : entry))} disabled={!canEdit} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100" /></label></div><label className="mt-3 block text-sm text-zinc-600 dark:text-zinc-300"><span className="mb-1 block">{t.expenseNotes}</span><textarea value={item.notes || ''} onChange={(event) => setExpenseItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} disabled={!canEdit} rows={2} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100" /></label>{canEdit && expenseItems.length > 1 ? <button type="button" onClick={() => setExpenseItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">{t.remove}</button> : null}</div>)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100"><IoCubeOutline className="h-4 w-4" />{t.inventoryUsage}</h3>{canEdit ? <button type="button" onClick={() => setInventoryUsageItems((current) => [...current, emptyInventoryUsage()])} className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"><IoAdd className="h-4 w-4" />{t.addInventoryUsage}</button> : null}</div>
          {snapshot.inventoryCatalog.length === 0 ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noInventoryItems}</p> : null}
          <div className="space-y-3">{inventoryUsageItems.map((item, index) => { const catalogItem = inventoryCatalogById.get(item.inventoryItemId); const previewUnitCost = item.unitCost ?? catalogItem?.averageUnitCost ?? 0; const previewLineTotal = catalogItem?.allowsManualCost && Number(item.manualCostAmount ?? 0) > 0 ? Number(item.manualCostAmount ?? 0) : Number(item.quantity || 0) * previewUnitCost; return <div key={`${item.id || 'usage'}-${index}`} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm text-zinc-600 dark:text-zinc-300"><span className="mb-1 block">{t.inventoryItem}</span><select value={item.inventoryItemId} onChange={(event) => setInventoryUsageItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, inventoryItemId: event.target.value, quantity: 0, manualCostAmount: null } : entry))} disabled={!canEdit} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100"><option value="">{t.selectItem}</option>{snapshot.inventoryCatalog.map((catalogEntry) => <option key={catalogEntry.id} value={catalogEntry.id}>{catalogEntry.name}</option>)}</select></label><label className="text-sm text-zinc-600 dark:text-zinc-300"><span className="mb-1 block">{catalogItem?.allowsManualCost ? t.manualMaterialCost : t.usageQuantity}</span><input type="number" min="0" step="0.001" value={catalogItem?.allowsManualCost ? Number(item.manualCostAmount ?? 0) : Number(item.quantity || 0)} onChange={(event) => setInventoryUsageItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: catalogItem?.allowsManualCost ? entry.quantity : Number(event.target.value || 0), manualCostAmount: catalogItem?.allowsManualCost ? Number(event.target.value || 0) : null } : entry))} disabled={!canEdit || !catalogItem} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100" /></label></div><div className="mt-3 grid gap-3 text-sm text-zinc-600 dark:text-zinc-300 md:grid-cols-3"><p>{t.stockAvailable}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{catalogItem ? `${formatPlainNumber(catalogItem.currentStock)} ${catalogItem.unit}` : '—'}</span></p><p>{t.unitCost}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(previewUnitCost, snapshot.currency)}</span></p><p>{t.lineTotal}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(previewLineTotal, snapshot.currency)}</span></p></div><label className="mt-3 block text-sm text-zinc-600 dark:text-zinc-300"><span className="mb-1 block">{t.expenseNotes}</span><textarea value={item.notes || ''} onChange={(event) => setInventoryUsageItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} disabled={!canEdit} rows={2} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100" /></label>{canEdit ? <button type="button" onClick={() => setInventoryUsageItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">{t.remove}</button> : null}</div>; })}</div>
        </div>
      </div>

      <label className="mt-6 block text-sm text-zinc-600 dark:text-zinc-300"><span className="mb-1 block">{t.notes}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!canEdit} rows={3} className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-zinc-900 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100" /></label>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end"><button type="button" onClick={async () => { setSaving(true); setError(null); setSuccess(null); try { await persist('draft'); setSuccess(t.saved); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Failed to save event settlement draft'); } finally { setSaving(false); } }} disabled={!canEdit || saving || closing} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">{saving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : t.saveDraft}</button><button type="button" onClick={async () => { setClosing(true); setError(null); setSuccess(null); try { await persist('close'); setSuccess(t.closed); await onClosed?.(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Failed to close event settlement'); } finally { setClosing(false); } }} disabled={!canEdit || closing || saving || snapshot.paymentStatus !== 'PAID' || hasInventoryShortage || previewNetProfit < 0} className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-60">{closing ? (isArabic ? 'جاري الإغلاق...' : 'Closing...') : t.closeEvent}</button></div>
      {snapshot.paymentStatus !== 'PAID' ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{t.paymentRequired}</p> : null}
    </section>
  );
}