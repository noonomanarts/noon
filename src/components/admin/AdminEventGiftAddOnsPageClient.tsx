'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
import {
  type EventGiftAddOn,
  type EventGiftAddOnSettings,
} from '@/lib/eventGiftAddOnTypes';

type EditorState = {
  id?: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  unitPrice: string;
  appliesTo: Array<'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY'>;
  isActive: boolean;
  sortOrder: string;
};

const EVENT_TYPE_OPTIONS: Array<{ value: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY'; labelEn: string; labelAr: string }> = [
  { value: 'COOKING_COMPETITION', labelEn: 'Cooking Competition', labelAr: 'مسابقة الطبخ' },
  { value: 'PRIVATE_CLASS', labelEn: 'Private Class', labelAr: 'درس خاص' },
  { value: 'BIRTHDAY_PARTY', labelEn: 'Birthday Party', labelAr: 'حفلة عيد ميلاد' },
];

const emptyEditor: EditorState = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  image: '',
  unitPrice: '0',
  appliesTo: ['COOKING_COMPETITION'],
  isActive: true,
  sortOrder: '0',
};

export default function AdminEventGiftAddOnsPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const { confirm } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<EventGiftAddOn[]>([]);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة إضافات الهدايا' : 'Gift Add-ons Management',
    subtitle: isArabic
      ? 'أضيفي الهدية بصورة واسم ووصف وسعر للقطعة الواحدة، ثم حددي أين تظهر داخل صفحات الفعاليات.'
      : 'Create, edit, and organize event gift add-ons with image, bilingual content, unit price, and event visibility.',
    catalog: isArabic ? 'الكتالوج الحالي' : 'Current Catalog',
    formTitle: isArabic ? 'تفاصيل الهدية' : 'Gift Details',
    nameEn: isArabic ? 'الاسم (English)' : 'Name (English)',
    nameAr: isArabic ? 'الاسم (Arabic)' : 'Name (Arabic)',
    descriptionEn: isArabic ? 'الوصف (English)' : 'Description (English)',
    descriptionAr: isArabic ? 'الوصف (Arabic)' : 'Description (Arabic)',
    image: isArabic ? 'رابط الصورة' : 'Image URL',
    uploadImage: isArabic ? 'رفع صورة' : 'Upload Image',
    uploading: isArabic ? 'جاري الرفع...' : 'Uploading...',
    unitPrice: isArabic ? 'سعر الهدية الواحدة' : 'Price for One Gift',
    appliesTo: isArabic ? 'تظهر في' : 'Visible In',
    active: isArabic ? 'نشطة' : 'Active',
    sortOrder: isArabic ? 'الترتيب' : 'Sort Order',
    create: isArabic ? 'إضافة هدية' : 'Create Gift',
    update: isArabic ? 'تحديث الهدية' : 'Update Gift',
    cancel: isArabic ? 'إلغاء التعديل' : 'Cancel Edit',
    edit: isArabic ? 'تعديل' : 'Edit',
    remove: isArabic ? 'حذف' : 'Delete',
    empty: isArabic ? 'لا توجد إضافات هدايا بعد.' : 'No gift add-ons yet.',
    activeLabel: isArabic ? 'مفعلة' : 'Active',
    inactiveLabel: isArabic ? 'معطلة' : 'Inactive',
    selectedEvents: isArabic ? 'الفعاليات المحددة' : 'Assigned Events',
    saveError: isArabic ? 'تعذر حفظ الهدية.' : 'Failed to save gift add-on.',
    deleteError: isArabic ? 'تعذر حذف الهدية.' : 'Failed to delete gift add-on.',
    imageAlt: isArabic ? 'صورة الهدية' : 'Gift image',
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'event-gift-addons');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.url) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to upload image');
    }

    return payload.url as string;
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/events/gift-addons', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as EventGiftAddOnSettings & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load gift add-ons');
      }
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (loadError) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load gift add-ons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn)),
    [items]
  );

  const submitEditor = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setInfo(null);
    setError(null);

    try {
      const payload = {
        nameEn: editor.nameEn,
        nameAr: editor.nameAr,
        descriptionEn: editor.descriptionEn,
        descriptionAr: editor.descriptionAr,
        image: editor.image,
        unitPrice: Number(editor.unitPrice || '0'),
        appliesTo: editor.appliesTo,
        isActive: editor.isActive,
        sortOrder: Number(editor.sortOrder || '0'),
      };

      const response = await fetch(
        editor.id ? `/api/admin/events/gift-addons/${editor.id}` : '/api/admin/events/gift-addons',
        {
          method: editor.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : t.saveError);
      }

      setInfo(editor.id ? (isArabic ? 'تم تحديث الهدية.' : 'Gift add-on updated.') : (isArabic ? 'تمت إضافة الهدية.' : 'Gift add-on created.'));
      setEditor(emptyEditor);
      await loadItems();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: EventGiftAddOn) => {
    setEditor({
      id: item.id,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      image: item.image,
      unitPrice: String(item.unitPrice),
      appliesTo: item.appliesTo,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
    });
    setInfo(null);
    setError(null);
  };

  const removeItem = async (item: EventGiftAddOn) => {
    const confirmed = await confirm({
      title: isArabic ? 'تأكيد حذف الهدية' : 'Delete gift add-on',
      message: isArabic ? 'هل تريد حذف هذه الهدية؟' : 'Delete this gift add-on?',
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      cancelLabel: isArabic ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;

    setSaving(true);
    setInfo(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/events/gift-addons/${item.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : t.deleteError);
      }

      setInfo(isArabic ? 'تم حذف الهدية.' : 'Gift add-on deleted.');
      if (editor.id === item.id) {
        setEditor(emptyEditor);
      }
      await loadItems();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t.deleteError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t.subtitle}</p>
      </div>

      {info ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">{info}</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_420px]">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.catalog}</h2>

          {loading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
          ) : orderedItems.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.empty}</p>
          ) : (
            <div className="space-y-3">
              {orderedItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-zinc-100 md:w-32 dark:bg-zinc-800">
                      {item.image ? (
                        <Image src={item.image} alt={item.nameEn || item.nameAr || t.imageAlt} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-400">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {(isArabic ? item.nameAr : item.nameEn) || item.nameEn || item.nameAr || '-'}
                      </p>
                      <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {(isArabic ? item.descriptionAr : item.descriptionEn) || item.descriptionEn || item.descriptionAr || '-'}
                      </p>
                      <p className="text-sm font-bold text-coral">{item.unitPrice.toFixed(3)} OMR</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {t.selectedEvents}: {item.appliesTo.map((eventType) => {
                          const match = EVENT_TYPE_OPTIONS.find((option) => option.value === eventType);
                          return isArabic ? match?.labelAr : match?.labelEn;
                        }).filter(Boolean).join(' • ')}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        #{item.sortOrder} · {item.isActive ? t.activeLabel : t.inactiveLabel}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">{t.edit}</button>
                      <button type="button" onClick={() => void removeItem(item)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20">{t.remove}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.formTitle}</h2>
          <form className="space-y-3" onSubmit={submitEditor}>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.nameEn}</span>
              <input type="text" value={editor.nameEn} onChange={(event) => setEditor((prev) => ({ ...prev, nameEn: event.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.nameAr}</span>
              <input type="text" value={editor.nameAr} onChange={(event) => setEditor((prev) => ({ ...prev, nameAr: event.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.descriptionEn}</span>
              <textarea rows={2} value={editor.descriptionEn} onChange={(event) => setEditor((prev) => ({ ...prev, descriptionEn: event.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.descriptionAr}</span>
              <textarea rows={2} value={editor.descriptionAr} onChange={(event) => setEditor((prev) => ({ ...prev, descriptionAr: event.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.image}</span>
              <input type="text" value={editor.image} onChange={(event) => setEditor((prev) => ({ ...prev, image: event.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <span>{uploadingImage ? t.uploading : t.uploadImage}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingImage}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  setUploadingImage(true);
                  setError(null);
                  void uploadImage(file)
                    .then((url) => {
                      setEditor((prev) => ({ ...prev, image: url }));
                      setInfo(isArabic ? 'تم رفع صورة الهدية.' : 'Gift image uploaded.');
                    })
                    .catch((uploadError) => {
                      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
                    })
                    .finally(() => {
                      setUploadingImage(false);
                      event.target.value = '';
                    });
                }}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.unitPrice}</span>
              <input type="number" min="0" step="0.001" value={editor.unitPrice} onChange={(event) => setEditor((prev) => ({ ...prev, unitPrice: event.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </label>

            <div className="space-y-2 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.appliesTo}</span>
              <div className="grid gap-2">
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const checked = editor.appliesTo.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setEditor((prev) => ({
                            ...prev,
                            appliesTo: event.target.checked
                              ? [...prev.appliesTo, option.value]
                              : prev.appliesTo.filter((item) => item !== option.value),
                          }));
                        }}
                        className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)]"
                      />
                      <span className="text-zinc-700 dark:text-zinc-200">{isArabic ? option.labelAr : option.labelEn}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.sortOrder}</span>
                <input type="number" value={editor.sortOrder} onChange={(event) => setEditor((prev) => ({ ...prev, sortOrder: event.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              </label>

              <label className="flex items-center gap-2 pt-7 text-sm text-zinc-700 dark:text-zinc-200">
                <input type="checkbox" checked={editor.isActive} onChange={(event) => setEditor((prev) => ({ ...prev, isActive: event.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)]" />
                {t.active}
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving} className="rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                {saving ? 'Saving...' : editor.id ? t.update : t.create}
              </button>
              {editor.id ? (
                <button type="button" onClick={() => setEditor(emptyEditor)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  {t.cancel}
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}