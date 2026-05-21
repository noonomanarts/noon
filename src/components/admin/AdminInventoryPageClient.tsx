'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import {
  FiAlertTriangle,
  FiBox,
  FiCheckCircle,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiShoppingCart,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi';
import { formatAmountWithCurrency, formatPlainNumber } from '@/lib/formatNumber';
import { roundDateToQuarterHour } from '@/lib/dateTime';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
import QuarterHourDateTimeInput from '@/components/admin/QuarterHourDateTimeInput';

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  reorderLevel: number;
  currentStock: number;
  averageUnitCost: number;
  stockValue: number;
  totalPurchaseCost: number;
  totalConsumedCost: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PurchaseLine = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  itemUnit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
};

type Purchase = {
  id: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  occurredAt: string;
  notes: string | null;
  totalCost: number;
  lines: PurchaseLine[];
  createdAt: string;
};

type InventoryOverview = {
  summary: {
    itemsCount: number;
    totalStockQuantity: number;
    totalStockValue: number;
    totalPurchasedCost: number;
    totalConsumedCost: number;
    lowStockCount: number;
  };
  workshopCosts: Array<{
    classId: string;
    classTitle: string;
    classTitleAr: string | null;
    trainerName: string | null;
    sessionDate: string | null;
    totalCost: number;
    linesCount: number;
  }>;
  recentPurchases: Purchase[];
};

type ItemFormState = {
  name: string;
  sku: string;
  unit: string;
  reorderLevel: string;
};

type PurchaseLineFormState = {
  inventoryItemId: string;
  quantity: string;
  unitCost: string;
  notes: string;
};

type PurchaseFormState = {
  supplierName: string;
  invoiceNumber: string;
  occurredAt: string;
  notes: string;
  lines: PurchaseLineFormState[];
};

const emptyOverview: InventoryOverview = {
  summary: { itemsCount: 0, totalStockQuantity: 0, totalStockValue: 0, totalPurchasedCost: 0, totalConsumedCost: 0, lowStockCount: 0 },
  workshopCosts: [],
  recentPurchases: [],
};

function defaultOccurredAtInput(): string {
  const now = roundDateToQuarterHour();
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const emptyItemForm = (): ItemFormState => ({ name: '', sku: '', unit: 'kg', reorderLevel: '0' });
const emptyPurchaseLine = (): PurchaseLineFormState => ({ inventoryItemId: '', quantity: '', unitCost: '', notes: '' });
const emptyPurchaseForm = (): PurchaseFormState => ({
  supplierName: '', invoiceNumber: '', occurredAt: defaultOccurredAtInput(), notes: '', lines: [emptyPurchaseLine()],
});

const inputCls =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition focus:border-[color:var(--noon-teal)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900';

export default function AdminInventoryPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const { confirm } = useAppFeedback();
  const localeCode = isArabic ? 'ar-OM-u-nu-latn' : 'en-OM';

  const t = {
    title: isArabic ? 'المخزون والتكاليف' : 'Inventory & Costs',
    subtitle: isArabic
      ? 'تتبع المواد المشتراة وراقب الرصيد الفعلي وربط تكلفة المواد بكل ورشة.'
      : 'Track purchased materials, monitor real stock, and connect material spend to each workshop.',
    refresh: isArabic ? 'تحديث' : 'Refresh',
    loading: isArabic ? 'جاري التحميل...' : 'Loading...',
    stockValue: isArabic ? 'قيمة المخزون' : 'Stock Value',
    stockQty: isArabic ? 'كمية المخزون' : 'Stock Qty',
    purchased: isArabic ? 'إجمالي المشتريات' : 'Total Purchased',
    consumed: isArabic ? 'إجمالي المستهلك' : 'Total Consumed',
    itemsCount: isArabic ? 'عدد المواد' : 'Items',
    lowStock: isArabic ? 'مخزون منخفض' : 'Low Stock',
    addItemTitle: isArabic ? 'إضافة مادة' : 'Add Item',
    itemName: isArabic ? 'اسم المادة' : 'Item Name',
    sku: isArabic ? 'كود (SKU)' : 'SKU',
    unit: isArabic ? 'وحدة القياس' : 'Unit (kg, pcs…)',
    reorderLevel: isArabic ? 'حد إعادة الطلب' : 'Reorder Level',
    addItem: isArabic ? 'إضافة المادة' : 'Create Item',
    purchaseTitle: isArabic ? 'تسجيل شراء' : 'Register Purchase',
    supplier: isArabic ? 'المورد' : 'Supplier',
    invoice: isArabic ? 'رقم الفاتورة' : 'Invoice #',
    occurredAt: isArabic ? 'تاريخ الشراء' : 'Purchase Date',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    lineItem: isArabic ? 'المادة' : 'Item',
    qty: isArabic ? 'الكمية' : 'Qty',
    unitCost: isArabic ? 'تكلفة الوحدة' : 'Unit Cost',
    lineTotal: isArabic ? 'الإجمالي' : 'Total',
    remove: isArabic ? 'حذف' : 'Remove',
    addLine: isArabic ? 'إضافة سطر' : 'Add Line',
    savePurchase: isArabic ? 'حفظ الشراء' : 'Save Purchase',
    itemsTable: isArabic ? 'مواد المخزون' : 'Inventory Items',
    workshopSpend: isArabic ? 'تكلفة المواد لكل ورشة' : 'Material Spend by Workshop',
    recentPurchases: isArabic ? 'آخر المشتريات' : 'Recent Purchases',
    avgCost: isArabic ? 'متوسط التكلفة' : 'Avg Cost',
    currentStock: isArabic ? 'الرصيد الحالي' : 'Stock',
    totalSpent: isArabic ? 'إجمالي المستهلك' : 'Consumed',
    className: isArabic ? 'الورشة' : 'Workshop',
    trainer: isArabic ? 'المدرب' : 'Trainer',
    sessionDate: isArabic ? 'موعد الجلسة' : 'Date',
    spend: isArabic ? 'تكلفة المواد' : 'Material Cost',
    linesCount: isArabic ? 'بنود' : 'lines',
    noData: isArabic ? 'لا توجد بيانات.' : 'No data yet.',
    createItemSuccess: isArabic ? 'تمت إضافة المادة بنجاح.' : 'Item created successfully.',
    createPurchaseSuccess: isArabic ? 'تم تسجيل الشراء بنجاح.' : 'Purchase recorded successfully.',
    formValidation: isArabic ? 'يرجى إدخال البيانات المطلوبة بشكل صحيح.' : 'Please fill in all required fields.',
    inactive: isArabic ? 'غير نشط' : 'Inactive',
    active: isArabic ? 'نشط' : 'Active',
    actions: isArabic ? 'إجراءات' : 'Actions',
    deleteItem: isArabic ? 'حذف' : 'Delete',
    clearStock: isArabic ? 'تصفير المخزون' : 'Clear All Stock',
    clearStockSuccess: isArabic ? 'تم تصفير كميات المخزون.' : 'Inventory stock cleared.',
    deleteItemSuccess: isArabic ? 'تم حذف المادة.' : 'Item deleted.',
    clearStockConfirm: isArabic
      ? 'سيتم تصفير كميات جميع مواد المخزون. هل تريد المتابعة؟'
      : 'This will set every inventory item stock to zero. Continue?',
    deleteItemConfirm: isArabic ? 'هل تريد حذف هذه المادة؟' : 'Delete this inventory item?',
    dangerZone: isArabic ? 'منطقة الخطر' : 'Danger Zone',
    dangerZoneDesc: isArabic
      ? 'تصفير المخزون سيضع كمية كل مادة على صفر. لا يمكن التراجع.'
      : 'Clearing stock sets every item quantity to zero. This cannot be undone.',
    lowStockAlert: isArabic ? 'مواد منخفضة المخزون' : 'Low Stock Alert',
    noItems: isArabic ? 'لا توجد مواد في المخزون بعد.' : 'No inventory items yet.',
    noSupplier: isArabic ? 'بدون مورد' : 'No supplier',
  };

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [overview, setOverview] = useState<InventoryOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [clearingStock, setClearingStock] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'purchase' | 'addItem'>('purchase');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  const [itemForm, setItemForm] = useState<ItemFormState>(() => emptyItemForm());
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(() => emptyPurchaseForm());

  const formatMoney = useCallback((value: number, currency = 'OMR') => formatAmountWithCurrency(value, currency), []);

  const formatDate = useCallback(
    (value: string | null | undefined) => {
      if (!value) return '—';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return '—';
      return new Intl.DateTimeFormat(localeCode, { dateStyle: 'medium', timeZone: 'Asia/Muscat' }).format(parsed);
    },
    [localeCode]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, reportsRes] = await Promise.all([
        fetch('/api/admin/inventory/items', { cache: 'no-store' }),
        fetch('/api/admin/inventory/reports', { cache: 'no-store' }),
      ]);

      const itemsPayload = (await itemsRes.json().catch(() => ({}))) as { items?: InventoryItem[]; error?: string };
      if (!itemsRes.ok || !Array.isArray(itemsPayload.items)) throw new Error(itemsPayload.error || 'Failed to load items');

      const reportsPayload = (await reportsRes.json().catch(() => ({}))) as InventoryOverview & { error?: string };
      if (!reportsRes.ok || !reportsPayload.summary) throw new Error(reportsPayload.error || 'Failed to load reports');

      setItems(itemsPayload.items);
      setOverview(reportsPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const itemOptions = useMemo(
    () => items.filter((i) => i.isActive).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
    [items]
  );

  const purchaseFormTotal = useMemo(
    () =>
      purchaseForm.lines.reduce((sum, line) => {
        const q = Number(line.quantity || 0);
        const c = Number(line.unitCost || 0);
        return Number.isFinite(q) && Number.isFinite(c) ? sum + q * c : sum;
      }, 0),
    [purchaseForm.lines]
  );

  const lowStockItems = useMemo(
    () => items.filter((i) => i.isActive && i.reorderLevel > 0 && i.currentStock <= i.reorderLevel),
    [items]
  );

  const handleCreateItem = async () => {
    if (!itemForm.name.trim()) { setError(t.formValidation); return; }
    setSavingItem(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/admin/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemForm.name,
          sku: itemForm.sku || null,
          unit: itemForm.unit || null,
          reorderLevel: Number(itemForm.reorderLevel || 0),
          currency: 'OMR',
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || 'Failed to create item');
      setItemForm(emptyItemForm());
      setSuccess(t.createItemSuccess);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleCreatePurchase = async () => {
    const validLines = purchaseForm.lines
      .map((line) => ({
        inventoryItemId: line.inventoryItemId,
        quantity: Number(line.quantity || 0),
        unitCost: Number(line.unitCost || 0),
        notes: line.notes || null,
      }))
      .filter((line) => line.inventoryItemId && line.quantity > 0 && Number.isFinite(line.unitCost) && line.unitCost >= 0);

    if (validLines.length === 0) { setError(t.formValidation); return; }
    setSavingPurchase(true); setError(null); setSuccess(null);
    try {
      const occurredAt = purchaseForm.occurredAt ? new Date(purchaseForm.occurredAt).toISOString() : new Date().toISOString();
      const res = await fetch('/api/admin/inventory/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: purchaseForm.supplierName || null,
          invoiceNumber: purchaseForm.invoiceNumber || null,
          occurredAt,
          notes: purchaseForm.notes || null,
          lines: validLines,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || 'Failed to save purchase');
      setPurchaseForm(emptyPurchaseForm());
      setSuccess(t.createPurchaseSuccess);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase');
    } finally {
      setSavingPurchase(false);
    }
  };

  const handleClearStock = async () => {
    const confirmed = await confirm({
      title: isArabic ? 'تأكيد تصفير المخزون' : 'Clear inventory stock',
      message: t.clearStockConfirm,
      confirmLabel: isArabic ? 'تأكيد' : 'Confirm',
      cancelLabel: isArabic ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    setClearingStock(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/admin/inventory/items/clear', { method: 'POST' });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || 'Failed to clear stock');
      setSuccess(t.clearStockSuccess);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear stock');
    } finally {
      setClearingStock(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await confirm({
      title: isArabic ? 'تأكيد حذف المادة' : 'Delete inventory item',
      message: t.deleteItemConfirm,
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      cancelLabel: isArabic ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    setDeletingItemId(itemId); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/inventory/items/${itemId}`, { method: 'DELETE' });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || 'Failed to delete item');
      setSuccess(t.deleteItemSuccess);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeletingItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-500">
          <FiPackage className="size-8 animate-pulse" />
          <p className="text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{t.title}</h1>
          <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <FiRefreshCw className="size-3" />
          {t.refresh}
        </button>
      </div>

      {/* ── Toast messages ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          <FiX className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><FiX className="size-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          <FiCheckCircle className="mt-0.5 size-4 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><FiX className="size-4" /></button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-2 xl:grid-cols-6">
        {[
          {
            label: isArabic ? 'قيمة المخزون' : 'Stock Value',
            value: formatMoney(overview.summary.totalStockValue),
            icon: FiBox,
            color: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300',
          },
          {
            label: isArabic ? 'كمية المخزون' : 'Stock Qty',
            value: formatPlainNumber(overview.summary.totalStockQuantity),
            icon: FiPackage,
            color: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300',
          },
          {
            label: isArabic ? 'المشتريات' : 'Purchased',
            value: formatMoney(overview.summary.totalPurchasedCost),
            icon: FiShoppingCart,
            color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
          },
          {
            label: isArabic ? 'المستهلك' : 'Consumed',
            value: formatMoney(overview.summary.totalConsumedCost),
            icon: FiTrendingDown,
            color: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
          },
          {
            label: isArabic ? 'المواد' : 'Items',
            value: String(overview.summary.itemsCount),
            icon: FiTrendingUp,
            color: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-300',
          },
          {
            label: isArabic ? 'مخزون منخفض' : 'Low Stock',
            value: String(overview.summary.lowStockCount),
            icon: FiAlertTriangle,
            color: overview.summary.lowStockCount > 0
              ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300'
              : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-3 ${color}`}>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</p>
              <Icon className="size-3 opacity-60" />
            </div>
            <p className="mt-1 text-xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Low stock alert ── */}
      {lowStockItems.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
          <div className="mb-2 flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <FiAlertTriangle className="size-4 shrink-0" />
            <p className="text-sm font-semibold">{t.lowStockAlert} ({lowStockItems.length})</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                {item.name}
                <span className="opacity-70">
                  {formatPlainNumber(item.currentStock)}/{formatPlainNumber(item.reorderLevel)} {item.unit}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">

        {/* ── Left: Inventory Items Table ── */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.itemsTable}</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {items.length}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center text-zinc-400 dark:text-zinc-500">
              <FiBox className="size-8 opacity-40" />
              <p className="text-sm">{t.noItems}</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
                {items.map((item) => {
                  const isLow = item.reorderLevel > 0 && item.currentStock <= item.reorderLevel;
                  return (
                    <div key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                            {!item.isActive && (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {t.inactive}
                              </span>
                            )}
                            {isLow && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                {t.lowStock}
                              </span>
                            )}
                          </div>
                          {item.sku && <p className="text-[11px] text-zinc-400">{item.sku}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className="shrink-0 rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                        >
                          <FiTrash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
                          <p className="text-zinc-400">{t.currentStock}</p>
                          <p className={`mt-0.5 font-bold ${isLow ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {formatPlainNumber(item.currentStock)} {item.unit}
                          </p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
                          <p className="text-zinc-400">{t.avgCost}</p>
                          <p className="mt-0.5 font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(item.averageUnitCost, item.currency)}</p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
                          <p className="text-zinc-400">{t.stockValue}</p>
                          <p className="mt-0.5 font-bold text-teal-700 dark:text-teal-400">{formatMoney(item.stockValue, item.currency)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      {[t.itemName, t.sku, t.currentStock, t.avgCost, t.stockValue, t.totalSpent, isArabic ? 'الحالة' : 'Status', t.actions].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                    {items.map((item) => {
                      const isLow = item.reorderLevel > 0 && item.currentStock <= item.reorderLevel;
                      return (
                        <tr key={item.id} className="group transition hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                            <p className="text-xs text-zinc-400">
                              {isArabic ? 'حد إعادة الطلب' : 'Reorder at'}: {formatPlainNumber(item.reorderLevel)} {item.unit}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{item.sku || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${isLow ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                              {formatPlainNumber(item.currentStock)} {item.unit}
                            </span>
                            {isLow && (
                              <span className="ms-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                !
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{formatMoney(item.averageUnitCost, item.currency)}</td>
                          <td className="px-4 py-3 font-semibold text-teal-700 dark:text-teal-400">{formatMoney(item.stockValue, item.currency)}</td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{formatMoney(item.totalConsumedCost, item.currency)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              item.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}>
                              {item.isActive ? t.active : t.inactive}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => void handleDeleteItem(item.id)}
                              disabled={deletingItemId === item.id}
                              className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                            >
                              {deletingItemId === item.id ? '…' : t.deleteItem}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Tabbed forms ── */}
        <div className="space-y-4">

          {/* Tab switcher */}
          <div className="grid grid-cols-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(['purchase', 'addItem'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFormTab(tab)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  activeFormTab === tab
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {tab === 'purchase' ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <FiShoppingCart className="size-3.5" />
                    {t.purchaseTitle}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <FiPlus className="size-3.5" />
                    {t.addItemTitle}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Add Item form */}
          {activeFormTab === 'addItem' && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2 space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <span>{t.itemName} *</span>
                    <input
                      value={itemForm.name}
                      onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder={isArabic ? 'مثال: زيت الزيتون' : 'e.g. Olive Oil'}
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <span>{t.unit}</span>
                    <input
                      value={itemForm.unit}
                      onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))}
                      placeholder="kg, pcs, L…"
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <span>{t.reorderLevel}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={itemForm.reorderLevel}
                      onChange={(e) => setItemForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                  <label className="col-span-2 space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <span>{t.sku}</span>
                    <input
                      value={itemForm.sku}
                      onChange={(e) => setItemForm((p) => ({ ...p, sku: e.target.value }))}
                      placeholder="SKU-001"
                      className={inputCls}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreateItem()}
                  disabled={savingItem || !itemForm.name.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:opacity-50"
                >
                  <FiPlus className="size-4" />
                  {savingItem ? '…' : t.addItem}
                </button>
              </div>
            </div>
          )}

          {/* Register Purchase form */}
          {activeFormTab === 'purchase' && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              {itemOptions.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                  {isArabic ? 'أضف مواد للمخزون أولاً قبل تسجيل شراء.' : 'Add inventory items first before registering a purchase.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Purchase header info */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      <span>{t.supplier}</span>
                      <input
                        value={purchaseForm.supplierName}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, supplierName: e.target.value }))}
                        placeholder={isArabic ? 'اسم المورد' : 'Supplier name'}
                        className={inputCls}
                      />
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      <span>{t.invoice}</span>
                      <input
                        value={purchaseForm.invoiceNumber}
                        onChange={(e) => setPurchaseForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                        placeholder="INV-001"
                        className={inputCls}
                      />
                    </label>
                    <label className="col-span-2 space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      <span>{t.occurredAt}</span>
                      <QuarterHourDateTimeInput
                        value={purchaseForm.occurredAt}
                        onChange={(v) => setPurchaseForm((p) => ({ ...p, occurredAt: v }))}
                        className={inputCls}
                      />
                    </label>
                  </div>

                  {/* Purchase lines */}
                  <div className="space-y-2">
                    {purchaseForm.lines.map((line, index) => {
                      const q = Number(line.quantity || 0);
                      const c = Number(line.unitCost || 0);
                      const total = Number.isFinite(q) && Number.isFinite(c) ? q * c : 0;
                      return (
                        <div key={`line-${index}`} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                              {isArabic ? `بند ${index + 1}` : `Line ${index + 1}`}
                            </span>
                            <span className="text-xs font-bold text-[color:var(--noon-teal)]">{formatMoney(total)}</span>
                          </div>
                          <div className="space-y-2">
                            <select
                              value={line.inventoryItemId}
                              onChange={(e) =>
                                setPurchaseForm((prev) => ({
                                  ...prev,
                                  lines: prev.lines.map((row, ri) => ri === index ? { ...row, inventoryItemId: e.target.value } : row),
                                }))
                              }
                              className={inputCls}
                            >
                              <option value="">— {t.lineItem} —</option>
                              {itemOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={line.quantity}
                                placeholder={t.qty}
                                onChange={(e) =>
                                  setPurchaseForm((prev) => ({
                                    ...prev,
                                    lines: prev.lines.map((row, ri) => ri === index ? { ...row, quantity: e.target.value } : row),
                                  }))
                                }
                                className={inputCls}
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={line.unitCost}
                                placeholder={t.unitCost}
                                onChange={(e) =>
                                  setPurchaseForm((prev) => ({
                                    ...prev,
                                    lines: prev.lines.map((row, ri) => ri === index ? { ...row, unitCost: e.target.value } : row),
                                  }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                value={line.notes}
                                placeholder={t.notes}
                                onChange={(e) =>
                                  setPurchaseForm((prev) => ({
                                    ...prev,
                                    lines: prev.lines.map((row, ri) => ri === index ? { ...row, notes: e.target.value } : row),
                                  }))
                                }
                                className={`${inputCls} flex-1`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPurchaseForm((prev) => ({
                                    ...prev,
                                    lines: prev.lines.length > 1 ? prev.lines.filter((_, ri) => ri !== index) : [emptyPurchaseLine()],
                                  }))
                                }
                                className="shrink-0 rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              >
                                <FiTrash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPurchaseForm((p) => ({ ...p, lines: [...p.lines, emptyPurchaseLine()] }))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    <FiPlus className="size-3.5" />
                    {t.addLine}
                  </button>

                  <label className="block space-y-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <span>{t.notes}</span>
                    <textarea
                      rows={2}
                      value={purchaseForm.notes}
                      onChange={(e) => setPurchaseForm((p) => ({ ...p, notes: e.target.value }))}
                      className={inputCls}
                    />
                  </label>

                  <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 dark:border-teal-900/40 dark:bg-teal-950/20">
                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">{t.lineTotal}</span>
                    <span className="text-base font-black text-teal-700 dark:text-teal-300">{formatMoney(purchaseFormTotal)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleCreatePurchase()}
                    disabled={savingPurchase || purchaseFormTotal === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:opacity-50"
                  >
                    <FiShoppingCart className="size-4" />
                    {savingPurchase ? '…' : t.savePurchase}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Danger zone */}
          <details className="group rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/10">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-400">
              <FiAlertTriangle className="size-4" />
              {t.dangerZone}
              <FiRefreshCw className="ml-auto size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-rose-200 px-4 py-4 dark:border-rose-900/40">
              <p className="mb-3 text-xs text-rose-700/80 dark:text-rose-400/80">{t.dangerZoneDesc}</p>
              <button
                type="button"
                onClick={() => void handleClearStock()}
                disabled={clearingStock}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-900/20"
              >
                <FiTrash2 className="size-3.5" />
                {clearingStock ? '…' : t.clearStock}
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* ── Workshop costs + Recent purchases ── */}
      <div className="grid gap-4 xl:grid-cols-2">

        {/* Workshop spend */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.workshopSpend}</h2>
          </div>
          {overview.workshopCosts.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400 dark:text-zinc-500">{t.noData}</p>
          ) : (
            <div className="flex flex-col">
              {overview.workshopCosts.map((ws) => (
                <div key={ws.classId} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {isArabic ? (ws.classTitleAr || ws.classTitle) : ws.classTitle}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {ws.trainerName || '—'} • {formatDate(ws.sessionDate)} • {ws.linesCount} {t.linesCount}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-rose-600 dark:text-rose-400">{formatMoney(ws.totalCost)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent purchases */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.recentPurchases}</h2>
          </div>
          {overview.recentPurchases.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400 dark:text-zinc-500">{t.noData}</p>
          ) : (
            <div className="flex flex-col">
              {overview.recentPurchases.map((purchase) => {
                const isExpanded = expandedPurchaseId === purchase.id;
                return (
                  <div key={purchase.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedPurchaseId(isExpanded ? null : purchase.id)}
                      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {purchase.supplierName || t.noSupplier}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {purchase.invoiceNumber ? `#${purchase.invoiceNumber} • ` : ''}{formatDate(purchase.occurredAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{formatMoney(purchase.totalCost)}</span>
                        <FiShoppingCart className={`size-3.5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mx-4 mb-3 rounded-lg border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40">
                        {purchase.lines.map((line) => (
                          <div key={line.id} className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 last:border-0 dark:border-zinc-800">
                            <div>
                              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{line.itemName}</p>
                              <p className="text-[11px] text-zinc-400">
                                {formatPlainNumber(line.quantity)} {line.itemUnit} × {formatMoney(line.unitCost)}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatMoney(line.totalCost)}</span>
                          </div>
                        ))}
                        {purchase.notes && (
                          <p className="border-t border-zinc-100 px-3 py-2 text-xs italic text-zinc-400 dark:border-zinc-800">
                            {purchase.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
