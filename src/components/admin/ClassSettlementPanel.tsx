'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateWorkshopFinanceBreakdown } from '@/lib/classFinanceRules';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
import { IoAdd, IoCalendarOutline, IoCheckmarkCircle, IoCubeOutline, IoFlashOutline, IoPeopleOutline, IoReceiptOutline, IoSparklesOutline, IoTrashOutline, IoWalletOutline } from 'react-icons/io5';
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
    classStartTime: string;
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
    manualCostAmount: null,
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
  const localeCode = isArabic ? 'ar-OM-u-nu-latn' : 'en-OM';
  const { confirm } = useAppFeedback();

  const [snapshot, setSnapshot] = useState<SettlementSnapshot | null>(null);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [inventoryUsageItems, setInventoryUsageItems] = useState<InventoryUsageItemInput[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [removingParticipantKey, setRemovingParticipantKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة إغلاق الكلاس والتسوية' : 'Class Closure & Settlement',
    subtitle: isArabic
      ? 'من هنا تراجع المشتركين، تضيف المصاريف، ثم تغلق الورشة ليتم تسجيل المستحقات والحسابات والمخزون تلقائياً.'
      : 'Review participants, record expenses, then close the workshop to post payouts, finance entries, and inventory usage automatically.',
    loading: isArabic ? 'جاري تحميل بيانات التسوية...' : 'Loading settlement data...',
    participants: isArabic ? 'المشاركون المسجلون' : 'Registered Participants',
    expenses: isArabic ? 'تكلفة المواد' : 'Material Costs',
    inventoryUsage: isArabic ? 'سحب المواد من المخزون' : 'Inventory Usage',
    manualExpenses: isArabic ? 'مصاريف يدوية إضافية' : 'Manual Material Costs',
    notes: isArabic ? 'ملاحظات الإدارة' : 'Admin Notes',
    saveDraft: isArabic ? 'حفظ المسودة' : 'Save Draft',
    closingAction: isArabic ? 'إغلاق الورشة واعتماد التسوية' : 'Close Workshop & Post Settlement',
    closingDone: isArabic ? 'تم إغلاق الورشة واعتماد التسوية تلقائياً.' : 'Workshop closed and settlement entries were posted automatically.',
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
    manualMaterialCost: isArabic ? 'تكلفة المواد (يدوي)' : 'Manual Material Cost',
    manualCostHint: isArabic
      ? 'لهذا الصنف يمكن إدخال تكلفة يدوية مباشرة. سيتم خصم الكمية المكافئة تلقائياً من مخزون الصنف.'
      : 'For this item you can enter a manual cost directly. The equivalent quantity will be deducted from this inventory pool automatically.',
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
    classDate: isArabic ? 'تاريخ الدورة' : 'Class Date',
    dob: isArabic ? 'الميلاد' : 'DOB',
    language: isArabic ? 'اللغة' : 'Language',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    finance: isArabic ? 'تفصيل الورشة المالي' : 'Workshop Finance Breakdown',
    financeHint: isArabic
      ? 'ملخص بصري واضح للتكاليف والإيراد قبل اعتماد الإغلاق.'
      : 'A clear visual summary of revenue and costs before posting settlement.',
    kitchenUsage: isArabic ? 'استخدام المطبخ' : 'Kitchen Usage',
    workshopContent: isArabic ? 'محتوى الورشة' : 'Workshop Content',
    fixedCostFormula: isArabic ? 'تحسب تلقائياً من مدة الورشة وعدد المشاركين.' : 'Calculated automatically from workshop duration and participant count.',
    trainerRule: isArabic ? 'تحسب على الإيراد المتبقي بعد التكاليف الثابتة وتكلفة المواد.' : 'Calculated from revenue remaining after fixed costs and material costs.',
    trainerBase: isArabic ? 'الأساس المحتسب' : 'Fee Base',
    remainingAfterCosts: isArabic ? 'المتبقي لنون' : 'Remaining for Noon',
    closed: isArabic ? 'مغلق' : 'Closed',
    open: isArabic ? 'مفتوح' : 'Open',
    noParticipants: isArabic ? 'لا يوجد مشاركون مدفوعون لهذا الكلاس حتى الآن.' : 'No paid participants for this class yet.',
    removeFromWorkshop: isArabic ? 'إزالة فقط من الورشة' : 'Remove only',
    removeAndRefund: isArabic ? 'إزالة مع إرجاع للمحفظة' : 'Remove + refund',
    participantSectionHint: isArabic
      ? 'على الجوال تظهر المشاركات كبطاقات واضحة، وعلى الشاشات الأكبر تظهر كجدول منظم مع أزرار ثابتة بدون كسر النص.'
      : 'On mobile, participants are shown as clear cards. On larger screens, they appear in a structured table with single-line actions.',
    participantEmail: isArabic ? 'البريد الإلكتروني' : 'Email',
    participantBookingRef: isArabic ? 'رقم الحجز' : 'Booking Ref',
    participantActions: isArabic ? 'إجراءات المشارك' : 'Participant actions',
    removing: isArabic ? 'جارٍ الإزالة...' : 'Removing...',
    removeConfirm: isArabic
      ? 'سيتم حذف هذا المشارك من الورشة بدون إرجاع مبلغ إلى المحفظة. هل تريد المتابعة؟'
      : 'This participant will be removed from the workshop without returning funds to the wallet. Continue?',
    refundConfirm: isArabic
      ? 'سيتم حذف هذا المشارك من الورشة وإرجاع حصته إلى المحفظة. هل تريد المتابعة؟'
      : 'This participant will be removed from the workshop and their share will be credited back to the wallet. Continue?',
    participantRemoved: isArabic ? 'تمت إزالة المشارك من الورشة بدون أي إرجاع للمبلغ.' : 'Participant removed from the workshop without a refund.',
    participantRefunded: isArabic ? 'تمت إزالة المشارك وإرجاع المبلغ إلى المحفظة.' : 'Participant removed and refunded to wallet.',
    noExpenses: isArabic ? 'لم يتم تسجيل أي تكلفة مواد بعد.' : 'No material costs recorded yet.',
    manualExpensesHint: isArabic
      ? 'أضف أي تكلفة مواد أو ملاحظات إضافية بشكل منظم قبل اعتماد التسوية.'
      : 'Add any extra material cost or note in a structured way before posting the settlement.',
    inventoryUsageEmpty: isArabic ? 'لا توجد عناصر سحب مسجلة بعد.' : 'No inventory usage entries added yet.',
    inventoryUsageSummary: isArabic ? 'ملخص السحب' : 'Usage Summary',
    insufficientStock: isArabic ? 'الكمية المطلوبة أكبر من المتوفر في المخزون.' : 'Required quantity is greater than available stock.',
    closedAt: isArabic ? 'تاريخ الإغلاق' : 'Closed At',
    plannerHint: isArabic
      ? 'التكاليف الثابتة تحسب تلقائياً: استخدام المطبخ = 2.8 × مدة الورشة بالساعات، ومحتوى الورشة = 0.2 × عدد المشاركين. تكلفة المواد يمكن تسجيلها يدوياً أو عبر السحب من المخزون.'
      : 'Fixed costs are automatic: kitchen usage = 2.8 x workshop duration in hours, and workshop content = 0.2 x participant count. Material costs can be tracked manually or via inventory usage.',
    negativeNoonFee: isArabic
      ? 'رسوم نون أصبحت سالبة. راجع تكاليف المواد أو الإيراد قبل الإغلاق.'
      : 'Noon fee is negative. Review material costs or revenue before closing.',
    notesHint: isArabic
      ? 'أي ملاحظات هنا تحفظ مع مسودة التسوية وتبقى مرجعاً للإدارة.'
      : 'Notes saved here stay attached to the settlement draft for the admin team.',
    settlementActions: isArabic ? 'إجراءات الإغلاق' : 'Settlement Actions',
    settlementActionsHint: isArabic
      ? 'راجع القيم النهائية هنا ثم احفظ المسودة أو اعتمد الإغلاق.'
      : 'Review the final values here, then save the draft or post the settlement.',
    closingEffectsTitle: isArabic ? 'ما الذي سيحدث عند الإغلاق؟' : 'What happens on close?',
    closingEffects: isArabic
      ? 'سيتم إضافة أتعاب المدرب إلى المصروفات ومحفظة المدرب، وإضافة رسوم نون إلى الأرباح، وتسجيل تكاليف المواد اليدوية وتكاليف المخزون ضمن المصروفات، مع خصم الكميات المستخدمة من المخزون.'
      : 'Trainer fee is added to expenses and the trainer wallet, Noon fee is added to profit, manual material costs and inventory usage costs are added to expenses, and used inventory quantities are deducted from stock.',
    reprocessWallet: isArabic ? 'إعادة معالجة المستحقات والحسابات' : 'Reprocess Wallet & Finance Entries',
    reprocessHint: isArabic
      ? 'إذا لم يتم تسجيل المحفظة أو الأرباح أو المصروفات أو حركة المخزون عند إغلاق هذه الورشة، اضغط هنا لإعادة المعالجة.'
      : 'If wallet, profit, expense, or inventory-related settlement entries were not recorded when this workshop was closed, click here to reprocess them.',
    reprocessDone: isArabic ? 'تمت إعادة المعالجة بنجاح.' : 'Reprocessing completed successfully.',
    reprocessNone: isArabic ? 'جميع المستحقات والحسابات مسجلة بالفعل.' : 'All wallet credits and finance entries are already processed.',
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
              manualCostAmount: item.manualCostAmount,
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
        const manualCostAmount = Number(item.manualCostAmount ?? 0);
        if (canEdit && catalogItem?.allowsManualCost && manualCostAmount > 0) {
          return sum + manualCostAmount;
        }
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
          const manualCostAmount = Number(item.manualCostAmount ?? 0);
          const requiredQuantity = catalogItem.allowsManualCost && manualCostAmount > 0
            ? (catalogItem.averageUnitCost > 0 ? Number((manualCostAmount / catalogItem.averageUnitCost).toFixed(3)) : Number.POSITIVE_INFINITY)
            : item.quantity;
          return requiredQuantity > catalogItem.currentStock;
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
  const summaryCards = [
    {
      title: t.grossRevenue,
      value: formatMoney(snapshot?.summary.grossRevenue ?? 0, snapshot?.currency || 'OMR'),
      icon: <IoWalletOutline className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />,
      iconWrapClassName: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20',
      valueClassName: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      title: t.fixedCosts,
      value: formatMoney(financePreview?.fixedCosts.total ?? snapshot?.summary.fixedCostsAmount ?? 0, snapshot?.currency || 'OMR'),
      icon: <IoReceiptOutline className="h-5 w-5 text-amber-700 dark:text-amber-300" />,
      iconWrapClassName: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20',
      valueClassName: 'text-amber-700 dark:text-amber-300',
    },
    {
      title: t.materialsCosts,
      value: formatMoney(totalExpenseAmount, snapshot?.currency || 'OMR'),
      icon: <IoCubeOutline className="h-5 w-5 text-sky-700 dark:text-sky-300" />,
      iconWrapClassName: 'border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-900/20',
      valueClassName: 'text-sky-700 dark:text-sky-300',
    },
    {
      title: t.trainerPayout,
      value: formatMoney(financePreview?.trainerFee.amount ?? snapshot?.summary.trainerFeeAmount ?? 0, snapshot?.currency || 'OMR'),
      icon: <IoPeopleOutline className="h-5 w-5 text-fuchsia-700 dark:text-fuchsia-300" />,
      iconWrapClassName: 'border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-900/40 dark:bg-fuchsia-900/20',
      valueClassName: 'text-fuchsia-700 dark:text-fuchsia-300',
    },
    {
      title: t.adminPayout,
      value: formatMoney(financePreview?.noonFeeAmount ?? snapshot?.summary.noonFeeAmount ?? 0, snapshot?.currency || 'OMR'),
      icon: <IoCheckmarkCircle className="h-5 w-5 text-[color:var(--noon-teal-strong)] dark:text-teal-300" />,
      iconWrapClassName: 'border-teal-200 bg-teal-50 dark:border-teal-900/40 dark:bg-teal-900/20',
      valueClassName: 'text-[color:var(--noon-teal-strong)] dark:text-teal-300',
    },
  ];

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
          manualCostAmount: item.manualCostAmount,
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
          manualCostAmount: item.manualCostAmount,
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

  const handleReprocessWallet = async () => {
    setReprocessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/settlement/reprocess-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        trainerCredited?: boolean;
        adminCredited?: boolean;
        trainerAmount?: number;
        adminAmount?: number;
        trainerExpenseCreated?: boolean;
        noonIncomeCreated?: boolean;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to reprocess wallet credits');
      }

      const anyAction = payload.trainerCredited || payload.adminCredited || payload.trainerExpenseCreated || payload.noonIncomeCreated;
      if (anyAction) {
        const parts: string[] = [];
        if (payload.trainerCredited && payload.trainerAmount) {
          parts.push(`Trainer wallet: ${payload.trainerAmount.toFixed(3)} ${snapshot?.currency || 'OMR'}`);
        }
        if (payload.adminCredited && payload.adminAmount) {
          parts.push(`Noon wallet: ${payload.adminAmount.toFixed(3)} ${snapshot?.currency || 'OMR'}`);
        }
        if (payload.trainerExpenseCreated) {
          parts.push('Trainer salary expense recorded');
        }
        if (payload.noonIncomeCreated) {
          parts.push('Noon net profit income recorded');
        }
        setSuccess(`${t.reprocessDone} (${parts.join(' | ')})`);
      } else {
        setSuccess(t.reprocessNone);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to reprocess');
    } finally {
      setReprocessing(false);
    }
  };

  const handleRemoveParticipant = async (participant: SettlementSnapshot['participants'][number], refundToWallet: boolean) => {
    const confirmed = await confirm({
      title: refundToWallet
        ? (isArabic ? 'تأكيد إزالة المشارك مع الإرجاع' : 'Remove participant and refund')
        : (isArabic ? 'تأكيد إزالة المشارك' : 'Remove participant'),
      message: refundToWallet ? t.refundConfirm : t.removeConfirm,
      confirmLabel: isArabic ? 'تأكيد' : 'Confirm',
      cancelLabel: isArabic ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    const participantKey = `${participant.bookingId}-${participant.participantIndex}`;
    setRemovingParticipantKey(participantKey);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: participant.bookingId,
          participantIndex: participant.participantIndex,
          refundToWallet,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to remove participant');
      }

      setSuccess(refundToWallet ? t.participantRefunded : t.participantRemoved);
      await loadSnapshot();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to remove participant');
    } finally {
      setRemovingParticipantKey(null);
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{card.title}</p>
                <p className={`mt-3 whitespace-nowrap text-xl font-semibold ${card.valueClassName}`}>{card.value}</p>
              </div>
              <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${card.iconWrapClassName}`}>
                {card.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <IoPeopleOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.participants}</h3>
            </div>
            <p className="mt-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">{t.participantSectionHint}</p>
            {snapshot.participants.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noParticipants}</p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 lg:hidden">
                  {snapshot.participants.map((participant) => {
                    const participantKey = `${participant.bookingId}-${participant.participantIndex}`;
                    const isRemoving = removingParticipantKey === participantKey;

                    return (
                      <article
                        key={participantKey}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{participant.participantName}</h4>
                            <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{participant.customerName}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            {participant.participantPreferredLanguage || '—'}
                          </span>
                        </div>

                        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                          <div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{t.bookedBy}</dt>
                            <dd className="mt-1 truncate font-medium text-zinc-800 dark:text-zinc-100">{participant.customerName}</dd>
                          </div>
                          <div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{t.participantEmail}</dt>
                            <dd className="mt-1 truncate font-medium text-zinc-800 dark:text-zinc-100">{participant.customerEmail || '—'}</dd>
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{t.classDate}</dt>
                            <dd className="mt-1 font-medium text-zinc-800 dark:text-zinc-100">{formatDateTime(participant.classStartTime)}</dd>
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{t.participantBookingRef}</dt>
                            <dd className="mt-1 font-medium text-zinc-800 dark:text-zinc-100">{participant.bookingNumber}</dd>
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{t.dob}</dt>
                            <dd className="mt-1 font-medium text-zinc-800 dark:text-zinc-100">{participant.participantDateOfBirth || '—'}</dd>
                          </div>
                        </dl>

                        {canEdit ? (
                          <div className="mt-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{t.participantActions}</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => void handleRemoveParticipant(participant, false)}
                                disabled={isRemoving}
                                className="inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              >
                                <IoTrashOutline className="me-2 h-4 w-4 shrink-0" />
                                {isRemoving ? t.removing : t.removeFromWorkshop}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveParticipant(participant, true)}
                                disabled={isRemoving}
                                className="inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/20"
                              >
                                <IoWalletOutline className="me-2 h-4 w-4 shrink-0" />
                                {isRemoving ? t.removing : t.removeAndRefund}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4 hidden overflow-x-auto lg:block">
                  <table className="min-w-[1100px] divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                  <thead>
                    <tr className="text-left text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 pe-4 whitespace-nowrap">{t.participantName}</th>
                      <th className="py-2 pe-4 whitespace-nowrap">{t.bookedBy}</th>
                      <th className="py-2 pe-4 whitespace-nowrap">{t.classDate}</th>
                      <th className="py-2 pe-4 whitespace-nowrap">{t.booking}</th>
                      <th className="py-2 pe-4 whitespace-nowrap">{t.dob}</th>
                      <th className="py-2 whitespace-nowrap">{t.language}</th>
                      {canEdit ? <th className="py-2 ps-4 text-right whitespace-nowrap">{t.actions}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {snapshot.participants.map((participant) => (
                      <tr key={`${participant.bookingId}-${participant.participantIndex}`}>
                        <td className="py-3 pe-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{participant.participantName}</td>
                        <td className="min-w-[220px] py-3 pe-4 text-zinc-600 dark:text-zinc-300">
                          <div className="whitespace-nowrap">{participant.customerName}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[220px]">{participant.customerEmail || '—'}</div>
                        </td>
                        <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{formatDateTime(participant.classStartTime)}</td>
                        <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{participant.bookingNumber}</td>
                        <td className="py-3 pe-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{participant.participantDateOfBirth || '—'}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{participant.participantPreferredLanguage || '—'}</td>
                        {canEdit ? (
                          <td className="py-3 ps-4">
                            <div className="flex justify-end gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => void handleRemoveParticipant(participant, false)}
                                disabled={removingParticipantKey === `${participant.bookingId}-${participant.participantIndex}`}
                                className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              >
                                <IoTrashOutline className="me-1.5 h-3.5 w-3.5 shrink-0" />
                                {removingParticipantKey === `${participant.bookingId}-${participant.participantIndex}` ? t.removing : t.removeFromWorkshop}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveParticipant(participant, true)}
                                disabled={removingParticipantKey === `${participant.bookingId}-${participant.participantIndex}`}
                                className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/20"
                              >
                                <IoWalletOutline className="me-1.5 h-3.5 w-3.5 shrink-0" />
                                {removingParticipantKey === `${participant.bookingId}-${participant.participantIndex}` ? t.removing : t.removeAndRefund}
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
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
              <p className="mt-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">{t.manualExpensesHint}</p>
              <div className="mt-3 space-y-3">
                {expenseItems.map((item, index) => (
                  <div key={`expense-${index}`} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
                          <IoReceiptOutline className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title || `${t.manualExpenses} ${index + 1}`}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatMoney(Number.isFinite(item.amount) ? item.amount : 0, snapshot.currency)}</p>
                        </div>
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpenseItems((prev) => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : [emptyExpense()]))
                          }
                          className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                        >
                          <IoTrashOutline className="h-4 w-4" />
                          {t.remove}
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                      <label className="text-sm">
                        <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.expenseTitle}</span>
                        <input
                          value={item.title}
                          onChange={(event) =>
                            setExpenseItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, title: event.target.value } : row)))
                          }
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)]">
                      <label className="text-sm">
                        <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.expenseNotes}</span>
                        <input
                          value={item.notes || ''}
                          onChange={(event) =>
                            setExpenseItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, notes: event.target.value } : row)))
                          }
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setExpenseItems((prev) => [...prev, emptyExpense()])}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.inventoryUsageEmpty}</p>
                  ) : null}
                  {inventoryUsageItems.map((item, index) => {
                    const catalogItem = inventoryCatalogById.get(item.inventoryItemId);
                    const manualCostAmount = Number(item.manualCostAmount ?? 0);
                    const usesManualCost = canEdit && Boolean(catalogItem?.allowsManualCost) && manualCostAmount > 0;
                    const resolvedQuantity = usesManualCost
                      ? (catalogItem && catalogItem.averageUnitCost > 0 ? Number((manualCostAmount / catalogItem.averageUnitCost).toFixed(3)) : 0)
                      : item.quantity;
                    const unitCost = canEdit
                      ? (catalogItem?.averageUnitCost ?? item.unitCost ?? 0)
                      : (item.unitCost ?? catalogItem?.averageUnitCost ?? 0);
                    const lineTotal = usesManualCost ? Number(manualCostAmount.toFixed(3)) : Number((resolvedQuantity * unitCost).toFixed(3));
                    const hasShortage = canEdit && Boolean(catalogItem) && resolvedQuantity > (catalogItem?.currentStock ?? 0);
                    return (
                      <div key={`inventory-usage-${index}`} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex min-w-0 items-center gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-900/20">
                              <IoCubeOutline className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{catalogItem?.name || `${t.inventoryUsage} ${index + 1}`}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.inventoryUsageSummary}: {formatMoney(lineTotal, snapshot.currency)}</p>
                            </div>
                          </div>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => setInventoryUsageItems((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                              className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                            >
                              <IoTrashOutline className="h-4 w-4" />
                              {t.remove}
                            </button>
                          ) : null}
                        </div>
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
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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
                              value={resolvedQuantity}
                              disabled={!canEdit || usesManualCost}
                              onChange={(event) =>
                                setInventoryUsageItems((prev) =>
                                  prev.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? {
                                          ...row,
                                          quantity: Number(event.target.value || 0),
                                          manualCostAmount: catalogItem?.allowsManualCost ? null : row.manualCostAmount,
                                        }
                                      : row
                                  )
                                )
                              }
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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

                        {catalogItem?.allowsManualCost ? (
                          <div>
                            <label className="text-sm">
                              <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.manualMaterialCost}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={manualCostAmount > 0 ? manualCostAmount : ''}
                                disabled={!canEdit}
                                onChange={(event) => {
                                  const nextManualAmount = Number(event.target.value || 0);
                                  setInventoryUsageItems((prev) =>
                                    prev.map((row, rowIndex) => {
                                      if (rowIndex !== index) return row;
                                      if (nextManualAmount <= 0) {
                                        return { ...row, manualCostAmount: null };
                                      }

                                      const nextQuantity = catalogItem.averageUnitCost > 0
                                        ? Number((nextManualAmount / catalogItem.averageUnitCost).toFixed(3))
                                        : row.quantity;

                                      return {
                                        ...row,
                                        manualCostAmount: Number(nextManualAmount.toFixed(3)),
                                        quantity: nextQuantity,
                                      };
                                    })
                                  );
                                }}
                                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                            </label>
                            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">{t.manualCostHint}</p>
                          </div>
                        ) : null}

                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
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
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                          <div className="text-sm">
                            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">{t.lineTotal}</span>
                            <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                              {formatMoney(lineTotal, snapshot.currency)}
                            </div>
                          </div>
                        </div>

                        {catalogItem ? (
                          <p className={`rounded-xl border px-3 py-2 text-xs ${hasShortage ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300' : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'}`}>
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
                  className="mt-4 inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
            <p className="mt-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">{t.financeHint}</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-3 text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20">
                      <IoFlashOutline className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    </span>
                    <span className="truncate">{t.kitchenUsage}</span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.fixedCosts.kitchenUsageAmount ?? snapshot.finance.fixedCosts.kitchenUsageAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {`${formatPlainNumber(snapshot.finance.fixedCosts.kitchenUsageRatePerHour)} x ${formatPlainNumber(financePreview?.fixedCosts.durationHours ?? snapshot.finance.fixedCosts.durationHours, { maxFractionDigits: 2 })} h`}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-3 text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 dark:border-teal-900/40 dark:bg-teal-900/20">
                      <IoSparklesOutline className="h-4 w-4 text-[color:var(--noon-teal-strong)] dark:text-teal-300" />
                    </span>
                    <span className="truncate">{t.workshopContent}</span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.fixedCosts.workshopContentAmount ?? snapshot.finance.fixedCosts.workshopContentAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {`${formatPlainNumber(snapshot.finance.fixedCosts.workshopContentRatePerParticipant)} x ${snapshot.summary.participantsCount}`}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-3 text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-900/20">
                      <IoCubeOutline className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                    </span>
                    <span className="truncate">{t.materialsCosts}</span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(totalExpenseAmount, snapshot.currency)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-3 text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-900/40 dark:bg-fuchsia-900/20">
                      <IoPeopleOutline className="h-4 w-4 text-fuchsia-700 dark:text-fuchsia-300" />
                    </span>
                    <span className="truncate">{t.trainerPayout}</span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.trainerFee.amount ?? snapshot.summary.trainerFeeAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.trainerRule}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {`${t.trainerBase}: ${formatMoney(financePreview?.trainerFee.baseAmount ?? snapshot.summary.trainerFeeBaseAmount, snapshot.currency)} x ${formatPlainNumber(financePreview?.trainerFee.percent ?? snapshot.summary.trainerFeePercent, { maxFractionDigits: 0 })}%`}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-3 text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                      <IoWalletOutline className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    </span>
                    <span className="truncate">{t.adminPayout}</span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.noonFeeAmount ?? snapshot.summary.noonFeeAmount, snapshot.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.remainingAfterCosts}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-3 text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-900/20">
                      <IoReceiptOutline className="h-4 w-4 text-rose-700 dark:text-rose-300" />
                    </span>
                    <span className="truncate">{t.totalCosts}</span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(financePreview?.totalCostsAmount ?? snapshot.summary.totalCostsAmount, snapshot.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <IoReceiptOutline className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-300" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.notes}</h3>
            </div>
            <p className="mt-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">{t.notesHint}</p>
            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block text-zinc-700 dark:text-zinc-200">{t.notes}</span>
              <textarea
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={!canEdit}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-[color:var(--noon-teal)] focus:ring-2 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            {snapshot.settlement?.settledAt ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <IoCalendarOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
                  <strong>{t.closedAt}:</strong>
                  <span>{formatDateTime(snapshot.settlement.settledAt)}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <IoCheckmarkCircle className="h-5 w-5 text-[color:var(--noon-teal)]" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.settlementActions}</h3>
            </div>
            <p className="mt-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">{t.settlementActionsHint}</p>
            <div className="space-y-3 text-sm">
              <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <span className="text-zinc-500 dark:text-zinc-400">{t.trainerPayout}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMoney(financePreview?.trainerFee.amount ?? snapshot.summary.trainerFeeAmount, snapshot.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
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

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <IoReceiptOutline className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t.closingEffectsTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">{t.closingEffects}</p>
                </div>
              </div>
            </div>

            {canEdit ? (
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <IoReceiptOutline className="h-4 w-4" />
                  {saving ? '...' : t.saveDraft}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCloseClass()}
                  disabled={closing || !canClosePreview}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IoCheckmarkCircle className="h-4 w-4" />
                  {closing ? '...' : t.closingAction}
                </button>
              </div>
            ) : null}

            {!canEdit && (snapshot.settlement?.status === 'CLOSED' || classStatus === 'COMPLETED') ? (
              <div className="mt-5 space-y-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.reprocessHint}</p>
                <button
                  type="button"
                  onClick={() => void handleReprocessWallet()}
                  disabled={reprocessing}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                >
                  {reprocessing ? '...' : t.reprocessWallet}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
