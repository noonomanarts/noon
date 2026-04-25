'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { IoAdd, IoCubeOutline, IoFlashOutline, IoLayersOutline, IoWalletOutline } from 'react-icons/io5';
import { formatAmountWithCurrency, formatPlainNumber } from '@/lib/formatNumber';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

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
  summary: {
    itemsCount: 0,
    totalStockQuantity: 0,
    totalStockValue: 0,
    totalPurchasedCost: 0,
    totalConsumedCost: 0,
    lowStockCount: 0,
  },
  workshopCosts: [],
  recentPurchases: [],
};

function defaultOccurredAtInput(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function emptyItemForm(): ItemFormState {
  return {
    name: '',
    sku: '',
    unit: 'kg',
    reorderLevel: '0',
  };
}

function emptyPurchaseLine(): PurchaseLineFormState {
  return {
    inventoryItemId: '',
    quantity: '',
    unitCost: '',
    notes: '',
  };
}

function emptyPurchaseForm(): PurchaseFormState {
  return {
    supplierName: '',
    invoiceNumber: '',
    occurredAt: defaultOccurredAtInput(),
    notes: '',
    lines: [emptyPurchaseLine()],
  };
}

export default function AdminInventoryPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const { confirm } = useAppFeedback();
  const localeCode = isArabic ? 'ar-OM-u-nu-latn' : 'en-OM';

  const t = {
    title: isArabic ? 'إدارة المخزون والمحاسبة' : 'Inventory & Cost Accounting',
    subtitle: isArabic
      ? 'سجل المواد المشتراة، راقب الرصيد الفعلي، وتابع تكلفة المواد لكل ورشة بصورة مترابطة مع التسوية المالية.'
      : 'Track purchased materials, monitor real stock, and connect workshop material spend directly to settlement accounting.',
    refresh: isArabic ? 'تحديث' : 'Refresh',
    loading: isArabic ? 'جاري تحميل بيانات المخزون...' : 'Loading inventory data...',
    stockValue: isArabic ? 'قيمة المخزون الحالية' : 'Current Stock Value',
    stockQty: isArabic ? 'إجمالي كمية المخزون' : 'Total Stock Quantity',
    purchased: isArabic ? 'إجمالي المشتريات' : 'Total Purchases',
    consumed: isArabic ? 'إجمالي المستهلك' : 'Total Consumed in Workshops',
    itemsCount: isArabic ? 'عدد المواد' : 'Items Count',
    lowStock: isArabic ? 'مواد منخفضة المخزون' : 'Low Stock Items',
    addItemTitle: isArabic ? 'إضافة مادة للمخزون' : 'Add Inventory Item',
    itemName: isArabic ? 'اسم المادة' : 'Item Name',
    sku: isArabic ? 'SKU / كود المادة' : 'SKU',
    unit: isArabic ? 'وحدة القياس' : 'Unit',
    reorderLevel: isArabic ? 'حد إعادة الطلب' : 'Reorder Level',
    addItem: isArabic ? 'إضافة المادة' : 'Create Item',
    purchaseTitle: isArabic ? 'تسجيل شراء مخزون' : 'Register Inventory Purchase',
    supplier: isArabic ? 'المورد' : 'Supplier',
    invoice: isArabic ? 'رقم الفاتورة' : 'Invoice Number',
    occurredAt: isArabic ? 'تاريخ الشراء' : 'Purchase Date',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    lineItem: isArabic ? 'المادة' : 'Item',
    qty: isArabic ? 'الكمية' : 'Quantity',
    unitCost: isArabic ? 'تكلفة الوحدة' : 'Unit Cost',
    lineTotal: isArabic ? 'الإجمالي' : 'Total',
    remove: isArabic ? 'حذف' : 'Remove',
    addLine: isArabic ? 'إضافة سطر شراء' : 'Add Purchase Line',
    savePurchase: isArabic ? 'حفظ الشراء' : 'Save Purchase',
    itemsTable: isArabic ? 'مواد المخزون' : 'Inventory Items',
    workshopSpend: isArabic ? 'تكلفة المواد لكل ورشة' : 'Material Spend by Workshop',
    recentPurchases: isArabic ? 'آخر المشتريات' : 'Recent Purchases',
    avgCost: isArabic ? 'متوسط التكلفة' : 'Avg Cost',
    currentStock: isArabic ? 'الرصيد الحالي' : 'Current Stock',
    totalSpent: isArabic ? 'إجمالي المصروف' : 'Total Spent',
    className: isArabic ? 'اسم الورشة' : 'Workshop',
    trainer: isArabic ? 'المدرب' : 'Trainer',
    sessionDate: isArabic ? 'موعد الجلسة' : 'Session Date',
    spend: isArabic ? 'تكلفة المواد' : 'Material Cost',
    linesCount: isArabic ? 'عدد البنود' : 'Lines',
    noData: isArabic ? 'لا توجد بيانات حتى الآن.' : 'No data yet.',
    createItemSuccess: isArabic ? 'تمت إضافة مادة المخزون بنجاح.' : 'Inventory item created successfully.',
    createPurchaseSuccess: isArabic ? 'تم تسجيل شراء المخزون بنجاح.' : 'Inventory purchase recorded successfully.',
    formValidation: isArabic ? 'يرجى إدخال البيانات المطلوبة بشكل صحيح.' : 'Please provide valid required fields.',
    inactive: isArabic ? 'غير نشط' : 'Inactive',
    active: isArabic ? 'نشط' : 'Active',
    workshopLinesSuffix: isArabic ? 'بنود' : 'lines',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    deleteItem: isArabic ? 'حذف المادة' : 'Delete Item',
    clearStock: isArabic ? 'تصفير المخزون' : 'Clear Inventory',
    clearStockSuccess: isArabic ? 'تم تصفير كميات المخزون.' : 'Inventory stock cleared successfully.',
    deleteItemSuccess: isArabic ? 'تم حذف مادة المخزون.' : 'Inventory item deleted successfully.',
    clearStockConfirm: isArabic ? 'سيتم تصفير كميات جميع مواد المخزون. هل تريد المتابعة؟' : 'This will set every inventory item stock to zero. Continue?',
    deleteItemConfirm: isArabic ? 'هل تريد حذف مادة المخزون هذه؟' : 'Delete this inventory item?',
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

  const [itemForm, setItemForm] = useState<ItemFormState>(() => emptyItemForm());
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(() => emptyPurchaseForm());

  const formatMoney = useCallback(
    (value: number, currency = 'OMR') => formatAmountWithCurrency(value, currency),
    []
  );

  const formatDate = useCallback(
    (value: string | null | undefined) => {
      if (!value) return '—';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return '—';
      return new Intl.DateTimeFormat(localeCode, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed);
    },
    [localeCode]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [itemsResponse, reportsResponse] = await Promise.all([
        fetch('/api/admin/inventory/items', { cache: 'no-store' }),
        fetch('/api/admin/inventory/reports', { cache: 'no-store' }),
      ]);

      const itemsPayload = (await itemsResponse.json().catch(() => ({}))) as { items?: InventoryItem[]; error?: string };
      if (!itemsResponse.ok || !Array.isArray(itemsPayload.items)) {
        throw new Error(itemsPayload.error || 'Failed to load inventory items');
      }

      const reportsPayload = (await reportsResponse.json().catch(() => ({}))) as InventoryOverview & { error?: string };
      if (!reportsResponse.ok || !reportsPayload.summary) {
        throw new Error(reportsPayload.error || 'Failed to load inventory reports');
      }

      setItems(itemsPayload.items);
      setOverview(reportsPayload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const itemOptions = useMemo(
    () => items.filter((item) => item.isActive).map((item) => ({ value: item.id, label: `${item.name} (${item.unit})` })),
    [items]
  );

  const purchaseFormTotal = useMemo(
    () =>
      purchaseForm.lines.reduce((sum, line) => {
        const quantity = Number(line.quantity || 0);
        const unitCost = Number(line.unitCost || 0);
        if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return sum;
        return sum + quantity * unitCost;
      }, 0),
    [purchaseForm.lines]
  );

  const handleCreateItem = async () => {
    setSavingItem(true);
    setError(null);
    setSuccess(null);

    try {
      if (!itemForm.name.trim()) {
        throw new Error(t.formValidation);
      }

      const response = await fetch('/api/admin/inventory/items', {
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

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create inventory item');
      }

      setItemForm(emptyItemForm());
      setSuccess(t.createItemSuccess);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create inventory item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleCreatePurchase = async () => {
    setSavingPurchase(true);
    setError(null);
    setSuccess(null);

    try {
      const validLines = purchaseForm.lines
        .map((line) => ({
          inventoryItemId: line.inventoryItemId,
          quantity: Number(line.quantity || 0),
          unitCost: Number(line.unitCost || 0),
          notes: line.notes || null,
        }))
        .filter((line) => line.inventoryItemId && Number.isFinite(line.quantity) && line.quantity > 0 && Number.isFinite(line.unitCost) && line.unitCost >= 0);

      if (validLines.length === 0) {
        throw new Error(t.formValidation);
      }

      const occurredAt = purchaseForm.occurredAt ? new Date(purchaseForm.occurredAt).toISOString() : new Date().toISOString();

      const response = await fetch('/api/admin/inventory/purchases', {
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

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save inventory purchase');
      }

      setPurchaseForm(emptyPurchaseForm());
      setSuccess(t.createPurchaseSuccess);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save purchase');
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
    if (!confirmed) {
      return;
    }

    setClearingStock(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/inventory/items/clear', { method: 'POST' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to clear inventory stock');
      }

      setSuccess(t.clearStockSuccess);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to clear inventory stock');
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
    if (!confirmed) {
      return;
    }

    setDeletingItemId(itemId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/inventory/items/${itemId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete inventory item');
      }

      setSuccess(t.deleteItemSuccess);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete inventory item');
    } finally {
      setDeletingItemId(null);
    }
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.loading}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.refresh}
          </button>
          <button
            type="button"
            onClick={() => void handleClearStock()}
            disabled={clearingStock}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            {clearingStock ? '...' : t.clearStock}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {success}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <IoWalletOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
            <span className="text-xs uppercase tracking-[0.2em]">{t.stockValue}</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(overview.summary.totalStockValue)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <IoLayersOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
            <span className="text-xs uppercase tracking-[0.2em]">{t.stockQty}</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatPlainNumber(overview.summary.totalStockQuantity)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <IoFlashOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
            <span className="text-xs uppercase tracking-[0.2em]">{t.purchased}</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(overview.summary.totalPurchasedCost)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <IoCubeOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
            <span className="text-xs uppercase tracking-[0.2em]">{t.consumed}</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(overview.summary.totalConsumedCost)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.itemsCount}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{overview.summary.itemsCount}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.lowStock}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{overview.summary.lowStockCount}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.addItemTitle}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.itemName}</span>
              <input
                value={itemForm.name}
                onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.sku}</span>
              <input
                value={itemForm.sku}
                onChange={(event) => setItemForm((prev) => ({ ...prev, sku: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.unit}</span>
              <input
                value={itemForm.unit}
                onChange={(event) => setItemForm((prev) => ({ ...prev, unit: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.reorderLevel}</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={itemForm.reorderLevel}
                onChange={(event) => setItemForm((prev) => ({ ...prev, reorderLevel: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleCreateItem()}
            disabled={savingItem}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:opacity-60"
          >
            <IoAdd className="h-4 w-4" />
            {savingItem ? '...' : t.addItem}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.purchaseTitle}</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.supplier}</span>
              <input
                value={purchaseForm.supplierName}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, supplierName: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.invoice}</span>
              <input
                value={purchaseForm.invoiceNumber}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.occurredAt}</span>
              <input
                type="datetime-local"
                value={purchaseForm.occurredAt}
                onChange={(event) => setPurchaseForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {purchaseForm.lines.map((line, index) => {
              const quantity = Number(line.quantity || 0);
              const unitCost = Number(line.unitCost || 0);
              const total = Number.isFinite(quantity) && Number.isFinite(unitCost) ? quantity * unitCost : 0;
              return (
                <div key={`purchase-line-${index}`} className="grid gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_140px]">
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.lineItem}</span>
                      <select
                        value={line.inventoryItemId}
                        onChange={(event) =>
                          setPurchaseForm((prev) => ({
                            ...prev,
                            lines: prev.lines.map((row, rowIndex) => (rowIndex === index ? { ...row, inventoryItemId: event.target.value } : row)),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        <option value="">—</option>
                        {itemOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.qty}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.quantity}
                        onChange={(event) =>
                          setPurchaseForm((prev) => ({
                            ...prev,
                            lines: prev.lines.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: event.target.value } : row)),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.unitCost}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.unitCost}
                        onChange={(event) =>
                          setPurchaseForm((prev) => ({
                            ...prev,
                            lines: prev.lines.map((row, rowIndex) => (rowIndex === index ? { ...row, unitCost: event.target.value } : row)),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <div className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.lineTotal}</span>
                      <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                        {formatMoney(total)}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="text-sm">
                      <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.notes}</span>
                      <input
                        value={line.notes}
                        onChange={(event) =>
                          setPurchaseForm((prev) => ({
                            ...prev,
                            lines: prev.lines.map((row, rowIndex) => (rowIndex === index ? { ...row, notes: event.target.value } : row)),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setPurchaseForm((prev) => ({
                          ...prev,
                          lines: prev.lines.length > 1 ? prev.lines.filter((_, rowIndex) => rowIndex !== index) : [emptyPurchaseLine()],
                        }))
                      }
                      className="self-end rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      {t.remove}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPurchaseForm((prev) => ({ ...prev, lines: [...prev.lines, emptyPurchaseLine()] }))}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <IoAdd className="h-4 w-4" />
              {t.addLine}
            </button>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{`${t.lineTotal}: ${formatMoney(purchaseFormTotal)}`}</p>
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.notes}</span>
            <textarea
              rows={3}
              value={purchaseForm.notes}
              onChange={(event) => setPurchaseForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleCreatePurchase()}
            disabled={savingPurchase}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:opacity-60"
          >
            {savingPurchase ? '...' : t.savePurchase}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.itemsTable}</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead>
                <tr className="text-left text-zinc-500 dark:text-zinc-400">
                  <th className="py-2 pe-4">{t.itemName}</th>
                  <th className="py-2 pe-4">{t.sku}</th>
                  <th className="py-2 pe-4">{t.currentStock}</th>
                  <th className="py-2 pe-4">{t.avgCost}</th>
                  <th className="py-2 pe-4">{t.stockValue}</th>
                  <th className="py-2 pe-4">{t.totalSpent}</th>
                  <th className="py-2 pe-4">{isArabic ? 'الحالة' : 'Status'}</th>
                  <th className="py-2">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {items.map((item) => {
                  const isLowStock = item.reorderLevel > 0 && item.currentStock <= item.reorderLevel;
                  return (
                    <tr key={item.id}>
                      <td className="py-3 pe-4 font-medium text-zinc-900 dark:text-zinc-100">
                        <div>{item.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {`${t.reorderLevel}: ${formatPlainNumber(item.reorderLevel)} ${item.unit}`}
                        </div>
                      </td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{item.sku || '—'}</td>
                      <td className={`py-3 pe-4 ${isLowStock ? 'text-rose-600 dark:text-rose-300' : 'text-zinc-600 dark:text-zinc-300'}`}>
                        {`${formatPlainNumber(item.currentStock)} ${item.unit}`}
                      </td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{formatMoney(item.averageUnitCost, item.currency)}</td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{formatMoney(item.stockValue, item.currency)}</td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{formatMoney(item.totalConsumedCost, item.currency)}</td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{item.isActive ? t.active : t.inactive}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => void handleDeleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                        >
                          {deletingItemId === item.id ? '...' : t.deleteItem}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.workshopSpend}</h2>
          {overview.workshopCosts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead>
                  <tr className="text-left text-zinc-500 dark:text-zinc-400">
                    <th className="py-2 pe-4">{t.className}</th>
                    <th className="py-2 pe-4">{t.trainer}</th>
                    <th className="py-2 pe-4">{t.sessionDate}</th>
                    <th className="py-2 pe-4">{t.spend}</th>
                    <th className="py-2">{t.linesCount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {overview.workshopCosts.map((workshop) => (
                    <tr key={workshop.classId}>
                      <td className="py-3 pe-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {isArabic ? (workshop.classTitleAr || workshop.classTitle) : workshop.classTitle}
                      </td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{workshop.trainerName || '—'}</td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{formatDate(workshop.sessionDate)}</td>
                      <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300">{formatMoney(workshop.totalCost)}</td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-300">{`${workshop.linesCount} ${t.workshopLinesSuffix}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.recentPurchases}</h2>
          {overview.recentPurchases.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {overview.recentPurchases.map((purchase) => (
                <div key={purchase.id} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{purchase.supplierName || (isArabic ? 'بدون مورد' : 'No supplier')}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {`${t.invoice}: ${purchase.invoiceNumber || '—'} • ${formatDate(purchase.occurredAt)}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(purchase.totalCost)}</p>
                  </div>
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {purchase.lines.map((line) => `${line.itemName}: ${formatPlainNumber(line.quantity)} ${line.itemUnit} x ${formatPlainNumber(line.unitCost)}`).join(' | ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
