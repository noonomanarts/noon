'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';

type EntryType = 'ALL' | 'INCOME' | 'EXPENSE';
type PersistedEntryType = Exclude<EntryType, 'ALL'>;
type TabKey = 'ledger' | 'reports' | 'settings';

type FinanceEntry = {
  id: string;
  type: PersistedEntryType;
  title: string;
  category: string;
  reasonId: string | null;
  reasonName: string | null;
  reasonIsActive: boolean | null;
  amount: number;
  currency: string;
  occurredAt: string;
  paymentMethod: string | null;
  reference: string | null;
  counterparty: string | null;
  notes: string | null;
  createdByUserName: string | null;
  updatedByUserName: string | null;
  createdAt: string;
  updatedAt: string;
};

type FinanceReason = {
  id: string;
  type: PersistedEntryType;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  isSystem: boolean;
};

type FinanceSettings = {
  defaultCurrency: string;
  requireReasonSelection: boolean;
  allowCustomReason: boolean;
};

type FinanceSummary = {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  entriesCount: number;
  incomeCount: number;
  expenseCount: number;
};

type FinanceCategoryBreakdown = {
  category: string;
  income: number;
  expense: number;
  net: number;
  entriesCount: number;
};

type FinanceMonthlyBreakdown = {
  month: string;
  income: number;
  expense: number;
  net: number;
  entriesCount: number;
};

type FinanceReport = {
  summary: FinanceSummary;
  byCategory: FinanceCategoryBreakdown[];
  monthly: FinanceMonthlyBreakdown[];
  recentEntries: FinanceEntry[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type EntryFormState = {
  type: PersistedEntryType;
  title: string;
  reasonId: string;
  customReason: string;
  amount: string;
  occurredAt: string;
  paymentMethod: string;
  reference: string;
  counterparty: string;
  notes: string;
};

type ReasonFormState = {
  type: PersistedEntryType;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const emptySummary: FinanceSummary = {
  totalIncome: 0,
  totalExpense: 0,
  netAmount: 0,
  entriesCount: 0,
  incomeCount: 0,
  expenseCount: 0,
};

const emptyPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

const defaultSettings: FinanceSettings = {
  defaultCurrency: 'OMR',
  requireReasonSelection: true,
  allowCustomReason: false,
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateTimeInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildStartIso(dateOnly: string): string | null {
  if (!dateOnly) return null;
  const value = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function buildEndIso(dateOnly: string): string | null {
  if (!dateOnly) return null;
  const value = new Date(`${dateOnly}T23:59:59.999`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function defaultOccurredAt(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function emptyEntryFormState(): EntryFormState {
  return {
    type: 'EXPENSE',
    title: '',
    reasonId: '',
    customReason: '',
    amount: '',
    occurredAt: defaultOccurredAt(),
    paymentMethod: '',
    reference: '',
    counterparty: '',
    notes: '',
  };
}

function emptyReasonFormState(type: PersistedEntryType): ReasonFormState {
  return {
    type,
    name: '',
    description: '',
    sortOrder: '0',
    isActive: true,
  };
}

export default function AdminFinancePageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';

  const t = {
    title: isArabic ? 'المالية والتقارير' : 'Finance & Reports',
    subtitle: isArabic
      ? 'منصة متكاملة لتسجيل القيود المالية، إدارة مصادر الدخل ودوافع المصروفات، وإعداد تقارير دقيقة.'
      : 'Comprehensive workspace for ledger entries, dynamic income/expense reasons, and advanced reporting.',
    tabLedger: isArabic ? 'السجل المالي' : 'Ledger',
    tabReports: isArabic ? 'التقارير' : 'Reports',
    tabSettings: isArabic ? 'الإعدادات' : 'Settings',
    income: isArabic ? 'إيراد' : 'Income',
    expense: isArabic ? 'مصروف' : 'Expense',
    net: isArabic ? 'الصافي' : 'Net',
    entries: isArabic ? 'القيود' : 'Entries',
    addEntry: isArabic ? 'إضافة قيد مالي' : 'Add Finance Entry',
    editEntry: isArabic ? 'تعديل قيد مالي' : 'Edit Finance Entry',
    incomeEntryTab: isArabic ? 'إدخال إيراد' : 'Income Entry',
    expenseEntryTab: isArabic ? 'إدخال مصروف' : 'Expense Entry',
    incomeEntryHint: isArabic ? 'سجّل مصادر الدخل والتدفقات الداخلة.' : 'Record revenue sources and incoming cashflow.',
    expenseEntryHint: isArabic ? 'سجّل المصروفات التشغيلية والتكاليف.' : 'Record operational expenses and outgoing costs.',
    sourceReason: isArabic ? 'مصدر الدخل / سبب المصروف' : 'Income Source / Expense Reason',
    customReason: isArabic ? 'سبب مخصص' : 'Custom Reason',
    type: isArabic ? 'النوع' : 'Type',
    titleLabel: isArabic ? 'العنوان' : 'Title',
    amount: isArabic ? 'المبلغ' : 'Amount',
    occurredAt: isArabic ? 'تاريخ العملية' : 'Occurred At',
    paymentMethod: isArabic ? 'طريقة الدفع' : 'Payment Method',
    reference: isArabic ? 'المرجع' : 'Reference',
    counterparty: isArabic ? 'الطرف المقابل' : 'Counterparty',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    save: isArabic ? 'حفظ' : 'Save',
    update: isArabic ? 'تحديث' : 'Update',
    cancelEdit: isArabic ? 'إلغاء التعديل' : 'Cancel Edit',
    filters: isArabic ? 'فلاتر السجل' : 'Ledger Filters',
    search: isArabic ? 'بحث' : 'Search',
    allTypes: isArabic ? 'كل الأنواع' : 'All types',
    allCategories: isArabic ? 'كل المصادر/الأسباب' : 'All sources/reasons',
    clearFilters: isArabic ? 'مسح الفلاتر' : 'Clear Filters',
    createdBy: isArabic ? 'بواسطة' : 'By',
    actions: isArabic ? 'إجراءات' : 'Actions',
    edit: isArabic ? 'تعديل' : 'Edit',
    delete: isArabic ? 'حذف' : 'Delete',
    noEntries: isArabic ? 'لا توجد قيود مطابقة.' : 'No matching entries found.',
    loading: isArabic ? 'جاري التحميل...' : 'Loading...',
    prev: isArabic ? 'السابق' : 'Previous',
    next: isArabic ? 'التالي' : 'Next',
    page: isArabic ? 'صفحة' : 'Page',
    of: isArabic ? 'من' : 'of',
    reportsRange: isArabic ? 'نطاق التقرير' : 'Report Range',
    thisMonth: isArabic ? 'هذا الشهر' : 'This Month',
    last30: isArabic ? 'آخر 30 يوم' : 'Last 30 Days',
    last90: isArabic ? 'آخر 90 يوم' : 'Last 90 Days',
    thisYear: isArabic ? 'هذا العام' : 'This Year',
    allTime: isArabic ? 'كل الوقت' : 'All Time',
    categoryBreakdown: isArabic ? 'تحليل حسب السبب/المصدر' : 'Breakdown by Reason/Source',
    monthlyBreakdown: isArabic ? 'التحليل الشهري' : 'Monthly Breakdown',
    recentEntries: isArabic ? 'آخر القيود' : 'Recent Entries',
    reportEmpty: isArabic ? 'لا توجد بيانات ضمن هذا النطاق.' : 'No data found in this range.',
    submitSuccess: isArabic ? 'تم حفظ القيد المالي بنجاح.' : 'Finance entry saved successfully.',
    updateSuccess: isArabic ? 'تم تحديث القيد المالي بنجاح.' : 'Finance entry updated successfully.',
    deleteSuccess: isArabic ? 'تم حذف القيد المالي.' : 'Finance entry deleted.',
    deleteConfirm: isArabic ? 'هل تريد حذف هذا القيد؟' : 'Do you want to delete this entry?',
    requiredFields: isArabic ? 'العنوان والمبلغ حقول مطلوبة.' : 'Title and amount are required fields.',
    amountInvalid: isArabic ? 'قيمة المبلغ غير صحيحة.' : 'Amount value is invalid.',
    reasonRequired: isArabic
      ? 'يجب اختيار مصدر/سبب من القائمة حسب إعدادات النظام.'
      : 'You must select an income/expense reason based on settings.',
    reasonOrCustomRequired: isArabic
      ? 'اختر سبباً من القائمة أو أدخل سبباً مخصصاً.'
      : 'Select a reason or provide a custom reason.',
    noReasonsForType: isArabic
      ? 'لا توجد أسباب/مصادر نشطة لهذا النوع. أضفها من تب الإعدادات أولاً.'
      : 'No active reasons/sources found for this type. Add them first from Settings.',
    totalRecords: isArabic ? 'إجمالي السجلات' : 'Total records',
    uncategorized: isArabic ? 'عام' : 'General',
    manageReasonsTitle: isArabic ? 'إدارة مصادر الدخل وأسباب المصروفات' : 'Manage Income Sources & Expense Reasons',
    reasonName: isArabic ? 'اسم المصدر/السبب' : 'Reason/Source Name',
    reasonDescription: isArabic ? 'الوصف' : 'Description',
    sortOrder: isArabic ? 'الترتيب' : 'Sort Order',
    active: isArabic ? 'نشط' : 'Active',
    inactive: isArabic ? 'غير نشط' : 'Inactive',
    addReason: isArabic ? 'إضافة مصدر/سبب' : 'Add Reason/Source',
    updateReason: isArabic ? 'تحديث المصدر/السبب' : 'Update Reason/Source',
    reasonSaved: isArabic ? 'تم حفظ المصدر/السبب.' : 'Reason/source saved.',
    reasonDeleted: isArabic ? 'تم حذف المصدر/السبب.' : 'Reason/source deleted.',
    reasonDeleteConfirm: isArabic ? 'هل تريد حذف هذا المصدر/السبب؟' : 'Delete this reason/source?',
    noReasons: isArabic ? 'لا توجد عناصر في هذا النوع.' : 'No reasons in this type yet.',
    financeSettingsTitle: isArabic ? 'إعدادات المالية' : 'Finance Settings',
    defaultCurrency: isArabic ? 'العملة الافتراضية' : 'Default Currency',
    requireReasonSelection: isArabic ? 'إجبار اختيار السبب/المصدر' : 'Require reason/source selection',
    allowCustomReason: isArabic ? 'السماح بسبب مخصص' : 'Allow custom reason',
    settingsSaved: isArabic ? 'تم حفظ إعدادات المالية.' : 'Finance settings updated.',
    saveSettings: isArabic ? 'حفظ الإعدادات' : 'Save Settings',
    allReasonsHint: isArabic
      ? 'هذه القائمة داینامیک وتستخدم مباشرة أثناء تسجيل القيود المالية.'
      : 'This list is dynamic and used directly in ledger entry registration.',
    pickReason: isArabic ? 'اختر من القائمة' : 'Select from list',
    customReasonHint: isArabic ? 'أدخل سبباً مخصصاً' : 'Enter a custom reason',
    includeInactive: isArabic ? 'إظهار غير النشط' : 'Show inactive',
  };

  const [activeTab, setActiveTab] = useState<TabKey>('ledger');

  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [categories, setCategories] = useState<string[]>([]);
  const [reasonOptions, setReasonOptions] = useState<FinanceReason[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);

  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const [report, setReport] = useState<FinanceReport | null>(null);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState(() => toDateInputValue(new Date()));

  const [entryForm, setEntryForm] = useState<EntryFormState>(() => emptyEntryFormState());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [settings, setSettings] = useState<FinanceSettings>(defaultSettings);
  const [settingsForm, setSettingsForm] = useState<FinanceSettings>(defaultSettings);

  const [reasonManagerType, setReasonManagerType] = useState<PersistedEntryType>('EXPENSE');
  const [reasonForm, setReasonForm] = useState<ReasonFormState>(() => emptyReasonFormState('EXPENSE'));
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [managedReasons, setManagedReasons] = useState<FinanceReason[]>([]);
  const [showInactiveReasons, setShowInactiveReasons] = useState(true);

  const [loadingEntries, setLoadingEntries] = useState(true);
  const [savingEntry, setSavingEntry] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const [loadingManagedReasons, setLoadingManagedReasons] = useState(false);
  const [savingReason, setSavingReason] = useState(false);
  const [deletingReasonId, setDeletingReasonId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const formatMoney = useCallback(
    (value: number, currency = settings.defaultCurrency || 'OMR') => `${value.toFixed(3)} ${currency}`,
    [settings.defaultCurrency]
  );

  const formatDateTime = useCallback(
    (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString(isArabic ? 'ar' : 'en');
    },
    [isArabic]
  );

  const filteredReasonsForEntryForm = useMemo(() => {
    return reasonOptions
      .filter((reason) => reason.type === entryForm.type && reason.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [entryForm.type, reasonOptions]);

  const categoryFilterOptions = useMemo(() => {
    const merged = new Set<string>(categories);
    reasonOptions.forEach((reason) => merged.add(reason.name));
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [categories, reasonOptions]);

  const managedReasonsByType = useMemo(() => {
    return managedReasons
      .filter((reason) => reason.type === reasonManagerType)
      .filter((reason) => showInactiveReasons || reason.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [managedReasons, reasonManagerType, showInactiveReasons]);

  const maxMonthlyValue = useMemo(() => {
    if (!report || report.monthly.length === 0) return 1;
    return Math.max(
      ...report.monthly.map((item) => Math.max(item.income, item.expense, Math.abs(item.net), 1))
    );
  }, [report]);

  const monthlyRows = useMemo(() => {
    if (!report) return [];
    return [...report.monthly].reverse();
  }, [report]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!entryForm.reasonId) return;
    const reason = reasonOptions.find((item) => item.id === entryForm.reasonId);
    if (!reason || reason.type !== entryForm.type || !reason.isActive) {
      setEntryForm((prev) => ({ ...prev, reasonId: '' }));
    }
  }, [entryForm.reasonId, entryForm.type, reasonOptions]);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        type: entryTypeFilter,
      });

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      if (categoryFilter) {
        params.set('category', categoryFilter);
      }

      const startIso = buildStartIso(startDateFilter);
      if (startIso) {
        params.set('startDate', startIso);
      }

      const endIso = buildEndIso(endDateFilter);
      if (endIso) {
        params.set('endDate', endIso);
      }

      const response = await fetch(`/api/admin/finance/entries?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load finance entries.');
      }

      const data = await response.json();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
      setSummary(data?.summary ?? emptySummary);
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
      setReasonOptions(Array.isArray(data?.reasons) ? data.reasons : []);
      const receivedSettings = data?.settings ?? defaultSettings;
      setSettings(receivedSettings);
      setSettingsForm(receivedSettings);
      setPagination(data?.pagination ?? emptyPagination);
    } catch (fetchError) {
      setEntries([]);
      setSummary(emptySummary);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load finance entries.');
    } finally {
      setLoadingEntries(false);
    }
  }, [categoryFilter, debouncedSearch, endDateFilter, entryTypeFilter, page, startDateFilter]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);

    try {
      const params = new URLSearchParams();

      const startIso = buildStartIso(reportStartDate);
      if (startIso) {
        params.set('startDate', startIso);
      }

      const endIso = buildEndIso(reportEndDate);
      if (endIso) {
        params.set('endDate', endIso);
      }

      const response = await fetch(`/api/admin/finance/reports?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load finance report.');
      }

      const data = await response.json();
      setReport(data?.report ?? null);
    } catch (fetchError) {
      setReport(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load finance report.');
    } finally {
      setReportLoading(false);
    }
  }, [reportEndDate, reportStartDate]);

  const fetchManagedReasons = useCallback(async () => {
    setLoadingManagedReasons(true);

    try {
      const params = new URLSearchParams({ includeInactive: '1' });
      const response = await fetch(`/api/admin/finance/reasons?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load finance reasons.');
      }

      const data = await response.json();
      setManagedReasons(Array.isArray(data?.reasons) ? data.reasons : []);
    } catch (fetchError) {
      setManagedReasons([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load finance reasons.');
    } finally {
      setLoadingManagedReasons(false);
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    await Promise.all([fetchEntries(), fetchManagedReasons(), fetchReport()]);
  }, [fetchEntries, fetchManagedReasons, fetchReport]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (activeTab === 'settings') {
      void fetchManagedReasons();
    }
  }, [activeTab, fetchManagedReasons]);

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEntryForm(emptyEntryFormState());
  };

  const resetReasonForm = useCallback(
    (type: PersistedEntryType) => {
      setEditingReasonId(null);
      setReasonForm(emptyReasonFormState(type));
    },
    []
  );

  useEffect(() => {
    if (!editingReasonId) {
      setReasonForm((prev) => ({ ...prev, type: reasonManagerType }));
    }
  }, [editingReasonId, reasonManagerType]);

  const onSubmitEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfo(null);
    setError(null);

    if (!entryForm.title.trim() || !entryForm.amount.trim()) {
      setError(t.requiredFields);
      return;
    }

    const amount = Number(entryForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t.amountInvalid);
      return;
    }

    if (
      settings.requireReasonSelection &&
      !settings.allowCustomReason &&
      filteredReasonsForEntryForm.length === 0
    ) {
      setError(t.noReasonsForType);
      return;
    }

    if (settings.requireReasonSelection) {
      if (!settings.allowCustomReason && !entryForm.reasonId) {
        setError(t.reasonRequired);
        return;
      }

      if (settings.allowCustomReason && !entryForm.reasonId && !entryForm.customReason.trim()) {
        setError(t.reasonOrCustomRequired);
        return;
      }
    }

    setSavingEntry(true);

    try {
      const payload = {
        type: entryForm.type,
        title: entryForm.title,
        reasonId: entryForm.reasonId || null,
        category: entryForm.customReason || null,
        amount,
        currency: settings.defaultCurrency,
        occurredAt: entryForm.occurredAt ? new Date(entryForm.occurredAt).toISOString() : null,
        paymentMethod: entryForm.paymentMethod || null,
        reference: entryForm.reference || null,
        counterparty: entryForm.counterparty || null,
        notes: entryForm.notes || null,
      };

      const url = editingEntryId
        ? `/api/admin/finance/entries/${editingEntryId}`
        : '/api/admin/finance/entries';

      const method = editingEntryId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to save finance entry.');
      }

      setInfo(editingEntryId ? t.updateSuccess : t.submitSuccess);
      resetEntryForm();
      await Promise.all([fetchEntries(), fetchReport()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save finance entry.');
    } finally {
      setSavingEntry(false);
    }
  };

  const startEditingEntry = (entry: FinanceEntry) => {
    setEditingEntryId(entry.id);
    setEntryForm({
      type: entry.type,
      title: entry.title,
      reasonId: entry.reasonId ?? '',
      customReason: entry.reasonId ? '' : (entry.reasonName ?? entry.category ?? ''),
      amount: String(entry.amount),
      occurredAt: toDateTimeInputValue(entry.occurredAt),
      paymentMethod: entry.paymentMethod ?? '',
      reference: entry.reference ?? '',
      counterparty: entry.counterparty ?? '',
      notes: entry.notes ?? '',
    });

    setActiveTab('ledger');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDeleteEntry = async (entryId: string) => {
    if (!window.confirm(t.deleteConfirm)) {
      return;
    }

    setDeletingEntryId(entryId);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/finance/entries/${entryId}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to delete finance entry.');
      }

      if (editingEntryId === entryId) {
        resetEntryForm();
      }

      setInfo(t.deleteSuccess);
      await Promise.all([fetchEntries(), fetchReport()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete finance entry.');
    } finally {
      setDeletingEntryId(null);
    }
  };

  const setReportPreset = (preset: 'thisMonth' | 'last30' | 'last90' | 'thisYear' | 'allTime') => {
    const now = new Date();

    if (preset === 'allTime') {
      setReportStartDate('');
      setReportEndDate('');
      return;
    }

    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setReportStartDate(toDateInputValue(start));
      setReportEndDate(toDateInputValue(now));
      return;
    }

    if (preset === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      setReportStartDate(toDateInputValue(start));
      setReportEndDate(toDateInputValue(now));
      return;
    }

    if (preset === 'last30') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      setReportStartDate(toDateInputValue(start));
      setReportEndDate(toDateInputValue(now));
      return;
    }

    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    setReportStartDate(toDateInputValue(start));
    setReportEndDate(toDateInputValue(now));
  };

  const onSubmitReason = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!reasonForm.name.trim()) {
      setError(isArabic ? 'اسم المصدر/السبب مطلوب.' : 'Reason/source name is required.');
      return;
    }

    const sortOrder = Number(reasonForm.sortOrder);

    setSavingReason(true);

    try {
      const payload = {
        type: reasonForm.type,
        name: reasonForm.name,
        description: reasonForm.description || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive: reasonForm.isActive,
      };

      const url = editingReasonId
        ? `/api/admin/finance/reasons/${editingReasonId}`
        : '/api/admin/finance/reasons';

      const method = editingReasonId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to save reason/source.');
      }

      setInfo(t.reasonSaved);
      resetReasonForm(reasonManagerType);
      await refreshCatalog();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save reason/source.');
    } finally {
      setSavingReason(false);
    }
  };

  const startEditingReason = (reason: FinanceReason) => {
    setEditingReasonId(reason.id);
    setReasonForm({
      type: reason.type,
      name: reason.name,
      description: reason.description ?? '',
      sortOrder: String(reason.sortOrder),
      isActive: reason.isActive,
    });
  };

  const onDeleteReason = async (reasonId: string) => {
    if (!window.confirm(t.reasonDeleteConfirm)) {
      return;
    }

    setDeletingReasonId(reasonId);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/finance/reasons/${reasonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to delete reason/source.');
      }

      if (editingReasonId === reasonId) {
        resetReasonForm(reasonManagerType);
      }

      setInfo(t.reasonDeleted);
      await refreshCatalog();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete reason/source.');
    } finally {
      setDeletingReasonId(null);
    }
  };

  const onSaveSettings = async () => {
    setSavingSettings(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/finance/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to update settings.');
      }

      const payload = await response.json();
      const receivedSettings = payload?.settings ?? settingsForm;
      setSettings(receivedSettings);
      setSettingsForm(receivedSettings);
      setInfo(t.settingsSaved);

      await Promise.all([fetchEntries(), fetchManagedReasons()]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const reportSummary = report?.summary ?? emptySummary;
  const isIncomeEntry = entryForm.type === 'INCOME';
  const entryPanelThemeClass = isIncomeEntry
    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20'
    : 'border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/20';
  const entryTabAreaThemeClass = isIncomeEntry
    ? 'border-emerald-200 bg-emerald-100/60 dark:border-emerald-900/40 dark:bg-emerald-950/30'
    : 'border-rose-200 bg-rose-100/60 dark:border-rose-900/40 dark:bg-rose-950/30';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>

        <div className="mt-4 inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/60">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'ledger'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
            }`}
          >
            {t.tabLedger}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'reports'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
            }`}
          >
            {t.tabReports}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
            }`}
          >
            {t.tabSettings}
          </button>
        </div>
      </section>

      {info && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {activeTab === 'ledger' && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.income}</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(summary.totalIncome)}</p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{summary.incomeCount} {t.entries}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.expense}</p>
              <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatMoney(summary.totalExpense)}</p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{summary.expenseCount} {t.entries}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.net}</p>
              <p className={`mt-2 text-2xl font-bold ${summary.netAmount >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatMoney(summary.netAmount)}
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.income} - {t.expense}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.totalRecords}</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{pagination.total}</p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.page} {pagination.page} {t.of} {pagination.totalPages}</p>
            </article>
          </section>

          <section className={`rounded-2xl border p-5 shadow-sm ${entryPanelThemeClass}`}>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{editingEntryId ? t.editEntry : t.addEntry}</h2>
            <form onSubmit={onSubmitEntry} className="mt-4 grid gap-4">
              <div className={`rounded-xl border p-3 ${entryTabAreaThemeClass}`}>
                <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900/70">
                  <button
                    type="button"
                    onClick={() =>
                      setEntryForm((prev) => ({ ...prev, type: 'INCOME', reasonId: '', customReason: '' }))
                    }
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                      entryForm.type === 'INCOME'
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                    }`}
                    aria-pressed={entryForm.type === 'INCOME'}
                  >
                    {t.incomeEntryTab}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEntryForm((prev) => ({ ...prev, type: 'EXPENSE', reasonId: '', customReason: '' }))
                    }
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                      entryForm.type === 'EXPENSE'
                        ? 'bg-rose-600 text-white'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                    }`}
                    aria-pressed={entryForm.type === 'EXPENSE'}
                  >
                    {t.expenseEntryTab}
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {entryForm.type === 'INCOME' ? t.incomeEntryHint : t.expenseEntryHint}
                </p>
                {settings.requireReasonSelection && !settings.allowCustomReason && filteredReasonsForEntryForm.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{t.noReasonsForType}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm text-zinc-700 dark:text-zinc-200 md:col-span-2 xl:col-span-4">
                  <span className="mb-1 block">{t.titleLabel}</span>
                  <input
                    type="text"
                    value={entryForm.title}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200 md:col-span-2">
                  <span className="mb-1 block">{t.sourceReason}</span>
                  <select
                    value={entryForm.reasonId}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, reasonId: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">{t.pickReason}</option>
                    {filteredReasonsForEntryForm.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.name}
                      </option>
                    ))}
                  </select>
                </label>

                {settings.allowCustomReason && (
                  <label className="text-sm text-zinc-700 dark:text-zinc-200 md:col-span-2">
                    <span className="mb-1 block">{t.customReason}</span>
                    <input
                      type="text"
                      value={entryForm.customReason}
                      onChange={(event) => setEntryForm((prev) => ({ ...prev, customReason: event.target.value }))}
                      placeholder={t.customReasonHint}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                    />
                  </label>
                )}

                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="mb-1 block">{t.amount}</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={entryForm.amount}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, amount: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="mb-1 block">{t.occurredAt}</span>
                  <input
                    type="datetime-local"
                    value={entryForm.occurredAt}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="mb-1 block">{t.paymentMethod}</span>
                  <input
                    type="text"
                    value={entryForm.paymentMethod}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="mb-1 block">{t.reference}</span>
                  <input
                    type="text"
                    value={entryForm.reference}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, reference: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200 md:col-span-2 xl:col-span-4">
                  <span className="mb-1 block">{t.counterparty}</span>
                  <input
                    type="text"
                    value={entryForm.counterparty}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, counterparty: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200 md:col-span-2 xl:col-span-4">
                  <span className="mb-1 block">{t.notes}</span>
                  <textarea
                    rows={3}
                    value={entryForm.notes}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, notes: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingEntry ? t.loading : editingEntryId ? t.update : t.save}
                </button>

                {editingEntryId && (
                  <button
                    type="button"
                    onClick={resetEntryForm}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {t.cancelEdit}
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.filters}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />

              <select
                value={entryTypeFilter}
                onChange={(event) => {
                  setEntryTypeFilter(event.target.value as EntryType);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                <option value="ALL">{t.allTypes}</option>
                <option value="INCOME">{t.income}</option>
                <option value="EXPENSE">{t.expense}</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">{t.allCategories}</option>
                {categoryFilterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={startDateFilter}
                onChange={(event) => {
                  setStartDateFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />

              <input
                type="date"
                value={endDateFilter}
                onChange={(event) => {
                  setEndDateFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setEntryTypeFilter('ALL');
                  setCategoryFilter('');
                  setStartDateFilter('');
                  setEndDateFilter('');
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.clearFilters}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {loadingEntries ? (
              <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">{t.loading}</div>
            ) : entries.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">{t.noEntries}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.occurredAt}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.type}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.titleLabel}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.sourceReason}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.amount}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.paymentMethod}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.createdBy}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{formatDateTime(entry.occurredAt)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              entry.type === 'INCOME'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}
                          >
                            {entry.type === 'INCOME' ? t.income : t.expense}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
                          <div>{entry.title}</div>
                          {entry.notes && <div className="mt-1 line-clamp-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">{entry.notes}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          <div>{entry.reasonName ?? entry.category ?? t.uncategorized}</div>
                          {entry.reasonIsActive === false && (
                            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t.inactive}</div>
                          )}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {entry.type === 'INCOME' ? '+' : '-'}{formatMoney(entry.amount, entry.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{entry.paymentMethod ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{entry.updatedByUserName ?? entry.createdByUserName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingEntry(entry)}
                              className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              {t.edit}
                            </button>
                            <button
                              type="button"
                              disabled={deletingEntryId === entry.id}
                              onClick={() => void onDeleteEntry(entry.id)}
                              className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                            >
                              {deletingEntryId === entry.id ? t.loading : t.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm dark:border-zinc-700">
              <p className="text-zinc-500 dark:text-zinc-400">
                {t.page} {pagination.page} {t.of} {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {t.prev}
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {t.next}
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'reports' && (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.reportsRange}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                type="date"
                value={reportStartDate}
                onChange={(event) => setReportStartDate(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
              <input
                type="date"
                value={reportEndDate}
                onChange={(event) => setReportEndDate(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
              <button type="button" onClick={() => setReportPreset('thisMonth')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">{t.thisMonth}</button>
              <button type="button" onClick={() => setReportPreset('last30')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">{t.last30}</button>
              <button type="button" onClick={() => setReportPreset('last90')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">{t.last90}</button>
              <button type="button" onClick={() => setReportPreset('thisYear')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">{t.thisYear}</button>
            </div>
            <div className="mt-3">
              <button type="button" onClick={() => setReportPreset('allTime')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">{t.allTime}</button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.income}</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(reportSummary.totalIncome)}</p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{reportSummary.incomeCount} {t.entries}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.expense}</p>
              <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatMoney(reportSummary.totalExpense)}</p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{reportSummary.expenseCount} {t.entries}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.net}</p>
              <p className={`mt-2 text-2xl font-bold ${reportSummary.netAmount >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatMoney(reportSummary.netAmount)}
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.income} - {t.expense}</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.totalRecords}</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{reportSummary.entriesCount}</p>
            </article>
          </section>

          {reportLoading ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t.loading}
            </section>
          ) : !report || report.summary.entriesCount === 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t.reportEmpty}
            </section>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t.monthlyBreakdown}</h3>
                  <div className="mt-4 space-y-3">
                    {monthlyRows.map((row) => (
                      <div key={row.month} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{row.month}</span>
                          <span className="text-zinc-500 dark:text-zinc-400">{row.entriesCount} {t.entries}</span>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                              <span>{t.income}</span>
                              <span>{formatMoney(row.income)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(4, (row.income / maxMonthlyValue) * 100)}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                              <span>{t.expense}</span>
                              <span>{formatMoney(row.expense)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                              <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(4, (row.expense / maxMonthlyValue) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t.categoryBreakdown}</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.sourceReason}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.income}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.expense}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.net}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        {report.byCategory.map((row) => (
                          <tr key={row.category} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">{row.category || t.uncategorized}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(row.income)}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400">{formatMoney(row.expense)}</td>
                            <td className={`px-3 py-2 text-sm font-semibold ${row.net >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                              {formatMoney(row.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t.recentEntries}</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.occurredAt}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.type}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.titleLabel}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.sourceReason}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.amount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {report.recentEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{formatDateTime(entry.occurredAt)}</td>
                          <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{entry.type === 'INCOME' ? t.income : t.expense}</td>
                          <td className="px-3 py-2 text-sm text-zinc-900 dark:text-white">{entry.title}</td>
                          <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{entry.reasonName ?? entry.category ?? t.uncategorized}</td>
                          <td className={`px-3 py-2 text-sm font-semibold ${entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {entry.type === 'INCOME' ? '+' : '-'}{formatMoney(entry.amount, entry.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}

      {activeTab === 'settings' && (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.financeSettingsTitle}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm text-zinc-700 dark:text-zinc-200">
                <span className="mb-1 block">{t.defaultCurrency}</span>
                <input
                  type="text"
                  value={settingsForm.defaultCurrency}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultCurrency: event.target.value.toUpperCase() }))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={settingsForm.requireReasonSelection}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, requireReasonSelection: event.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                />
                <span>{t.requireReasonSelection}</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={settingsForm.allowCustomReason}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, allowCustomReason: event.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                />
                <span>{t.allowCustomReason}</span>
              </label>
            </div>

            <div className="mt-4">
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => void onSaveSettings()}
                className="rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSettings ? t.loading : t.saveSettings}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.manageReasonsTitle}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.allReasonsHint}</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={showInactiveReasons}
                  onChange={(event) => setShowInactiveReasons(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                />
                <span>{t.includeInactive}</span>
              </label>
            </div>

            <div className="mt-4 inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/60">
              <button
                type="button"
                onClick={() => {
                  setReasonManagerType('INCOME');
                  if (!editingReasonId) resetReasonForm('INCOME');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  reasonManagerType === 'INCOME'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                {t.income}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReasonManagerType('EXPENSE');
                  if (!editingReasonId) resetReasonForm('EXPENSE');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  reasonManagerType === 'EXPENSE'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                {t.expense}
              </button>
            </div>

            <form onSubmit={onSubmitReason} className="mt-4 grid gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="mb-1 block">{t.type}</span>
                  <select
                    value={reasonForm.type}
                    onChange={(event) => setReasonForm((prev) => ({ ...prev, type: event.target.value as PersistedEntryType }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="INCOME">{t.income}</option>
                    <option value="EXPENSE">{t.expense}</option>
                  </select>
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200 md:col-span-2">
                  <span className="mb-1 block">{t.reasonName}</span>
                  <input
                    type="text"
                    value={reasonForm.name}
                    onChange={(event) => setReasonForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="mb-1 block">{t.sortOrder}</span>
                  <input
                    type="number"
                    value={reasonForm.sortOrder}
                    onChange={(event) => setReasonForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="text-sm text-zinc-700 dark:text-zinc-200 md:col-span-3 xl:col-span-4">
                  <span className="mb-1 block">{t.reasonDescription}</span>
                  <input
                    type="text"
                    value={reasonForm.description}
                    onChange={(event) => setReasonForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={reasonForm.isActive}
                    onChange={(event) => setReasonForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                  />
                  <span>{t.active}</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={savingReason}
                  className="rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReason ? t.loading : editingReasonId ? t.updateReason : t.addReason}
                </button>
                {editingReasonId && (
                  <button
                    type="button"
                    onClick={() => resetReasonForm(reasonManagerType)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {t.cancelEdit}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              {loadingManagedReasons ? (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{t.loading}</div>
              ) : managedReasonsByType.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{t.noReasons}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.reasonName}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.reasonDescription}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.sortOrder}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.active}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {managedReasonsByType.map((reason) => (
                        <tr key={reason.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">{reason.name}</td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{reason.description ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{reason.sortOrder}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                reason.isActive
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                              }`}
                            >
                              {reason.isActive ? t.active : t.inactive}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingReason(reason)}
                                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                {t.edit}
                              </button>
                              <button
                                type="button"
                                disabled={deletingReasonId === reason.id}
                                onClick={() => void onDeleteReason(reason.id)}
                                className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              >
                                {deletingReasonId === reason.id ? t.loading : t.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
