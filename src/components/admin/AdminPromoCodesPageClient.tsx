'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiTag } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
import QuarterHourDateTimeInput from '@/components/admin/QuarterHourDateTimeInput';

type PromoCode = {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUses: number | null;
  timesUsed: number;
  minOrderAmount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

const empty = (): Omit<PromoCode, 'id' | 'timesUsed' | 'createdAt' | 'isActive'> => ({
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: 10,
  maxUses: null,
  minOrderAmount: 0,
  startsAt: null,
  expiresAt: null,
});

export default function AdminPromoCodesPageClient({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar';
  const { confirm } = useAppFeedback();

  const t = {
    title: isAr ? 'أكواد الخصم' : 'Promo Codes',
    subtitle: isAr ? 'إنشاء وإدارة أكواد الخصم لطلبات الدفع' : 'Create and manage discount codes for checkout orders',
    addNew: isAr ? 'إضافة كود جديد' : 'Add New Code',
    code: isAr ? 'الكود' : 'Code',
    type: isAr ? 'نوع الخصم' : 'Discount Type',
    percentage: isAr ? 'نسبة مئوية' : 'Percentage',
    fixed: isAr ? 'مبلغ ثابت' : 'Fixed Amount',
    value: isAr ? 'القيمة' : 'Value',
    maxUses: isAr ? 'الحد الأقصى للاستخدام' : 'Max Uses',
    unlimited: isAr ? 'غير محدود' : 'Unlimited',
    minOrder: isAr ? 'الحد الأدنى للطلب' : 'Min. Order (OMR)',
    startsAt: isAr ? 'تاريخ البدء' : 'Starts At',
    expiresAt: isAr ? 'تاريخ الانتهاء' : 'Expires At',
    used: isAr ? 'مستخدم' : 'Used',
    status: isAr ? 'الحالة' : 'Status',
    active: isAr ? 'نشط' : 'Active',
    inactive: isAr ? 'معطّل' : 'Inactive',
    expired: isAr ? 'منتهي' : 'Expired',
    actions: isAr ? 'الإجراءات' : 'Actions',
    save: isAr ? 'حفظ' : 'Save',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    delete: isAr ? 'حذف' : 'Delete',
    confirmDelete: isAr ? 'هل أنت متأكد من حذف هذا الكود؟' : 'Are you sure you want to delete this promo code?',
    noResults: isAr ? 'لا توجد أكواد خصم بعد.' : 'No promo codes yet.',
    loading: isAr ? 'جاري التحميل...' : 'Loading...',
  };

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // promo id or 'new'
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/promo-codes');
      const data = await r.json();
      setCodes(data.promoCodes ?? []);
    } catch {
      setError('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCodes(); }, [fetchCodes]);

  function startNew() {
    setEditing('new');
    setForm(empty());
    setError(null);
  }

  function startEdit(c: PromoCode) {
    setEditing(c.id);
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxUses: c.maxUses,
      minOrderAmount: c.minOrderAmount,
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : null,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : null,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.code.trim()) { setError('Code is required'); return; }
    if (form.discountValue <= 0) { setError('Discount value must be positive'); return; }
    if (form.discountType === 'PERCENTAGE' && form.discountValue > 100) { setError('Percentage cannot exceed 100'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        maxUses: form.maxUses || null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      };

      if (editing === 'new') {
        const r = await fetch('/api/admin/promo-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed');
      } else {
        const r = await fetch('/api/admin/promo-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing, ...payload }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed');
      }
      setEditing(null);
      await fetchCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(c: PromoCode) {
    try {
      await fetch('/api/admin/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
      });
      await fetchCodes();
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: isAr ? 'تأكيد حذف الكود' : 'Delete promo code',
      message: t.confirmDelete,
      confirmLabel: isAr ? 'حذف' : 'Delete',
      cancelLabel: isAr ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE' });
      await fetchCodes();
    } catch { /* ignore */ }
  }

  function getStatus(c: PromoCode): { label: string; color: string } {
    if (!c.isActive) return { label: t.inactive, color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' };
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: t.expired, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (c.maxUses !== null && c.timesUsed >= c.maxUses) return { label: t.expired, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    return { label: t.active, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  }

  const inputCls = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
          <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">{t.subtitle}</p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          <FiPlus className="size-3.5" />
          <span className="hidden sm:inline">{t.addNew}</span>
          <span className="sm:hidden">{isAr ? 'إضافة' : 'Add'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Create / Edit form */}
      {editing !== null && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {editing === 'new' ? t.addNew : `${t.code}: ${form.code}`}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Code */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.code}</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="NOON20"
                maxLength={50}
                className={inputCls}
              />
            </div>

            {/* Discount type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.type}</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                className={inputCls}
              >
                <option value="PERCENTAGE">{t.percentage} (%)</option>
                <option value="FIXED">{t.fixed} (OMR)</option>
              </select>
            </div>

            {/* Discount value */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {t.value} {form.discountType === 'PERCENTAGE' ? '(%)' : '(OMR)'}
              </label>
              <input
                type="number"
                step={form.discountType === 'PERCENTAGE' ? '1' : '0.001'}
                min={0}
                max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className={inputCls}
              />
            </div>

            {/* Max uses */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.maxUses}</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.maxUses ?? ''}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : null })}
                placeholder={t.unlimited}
                className={inputCls}
              />
            </div>

            {/* Min order */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.minOrder}</label>
              <input
                type="number"
                min={0}
                step="0.001"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </div>

            {/* Starts at */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.startsAt}</label>
              <QuarterHourDateTimeInput
                value={form.startsAt ?? ''}
                onChange={(value) => setForm({ ...form, startsAt: value || null })}
                className={inputCls}
              />
            </div>

            {/* Expires at */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.expiresAt}</label>
              <QuarterHourDateTimeInput
                value={form.expiresAt ?? ''}
                onChange={(value) => setForm({ ...form, expiresAt: value || null })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              <FiCheck className="size-4" />
              {saving ? '...' : t.save}
            </button>
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <FiX className="size-4" />
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-center text-sm text-zinc-500">{t.loading}</p>
      ) : codes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          <FiTag className="mx-auto mb-3 size-10 opacity-40" />
          <p>{t.noResults}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                <th className="px-3 py-3 text-start text-xs font-semibold uppercase tracking-wide">{t.code}</th>
                <th className="hidden px-3 py-3 text-start text-xs font-semibold uppercase tracking-wide sm:table-cell">{t.type}</th>
                <th className="px-3 py-3 text-start text-xs font-semibold uppercase tracking-wide">{t.value}</th>
                <th className="hidden px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide md:table-cell">{t.used}</th>
                <th className="hidden px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide md:table-cell">{t.maxUses}</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">{t.status}</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {codes.map((c) => {
                const st = getStatus(c);
                return (
                  <tr key={c.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-3 py-3 text-xs font-mono font-semibold text-zinc-900 dark:text-white">{c.code}</td>
                    <td className="hidden px-3 py-3 text-xs text-zinc-600 dark:text-zinc-400 sm:table-cell">
                      {c.discountType === 'PERCENTAGE' ? t.percentage : t.fixed}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-zinc-900 dark:text-white">
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `${c.discountValue} OMR`}
                    </td>
                    <td className="hidden px-3 py-3 text-center text-xs text-zinc-600 dark:text-zinc-400 md:table-cell">{c.timesUsed}</td>
                    <td className="hidden px-3 py-3 text-center text-xs text-zinc-600 dark:text-zinc-400 md:table-cell">
                      {c.maxUses ?? t.unlimited}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => void handleToggleActive(c)}
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}
                        title={isAr ? 'تغيير الحالة' : 'Toggle status'}
                      >
                        {st.label}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <FiEdit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(c.id)}
                          className="rounded p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                          title={t.delete}
                        >
                          <FiTrash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
