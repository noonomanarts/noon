'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';

type ShopCategory = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type EditorState = {
  id?: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyEditor: EditorState = {
  nameEn: '',
  nameAr: '',
  slug: '',
  descriptionEn: '',
  descriptionAr: '',
  image: '',
  sortOrder: 0,
  isActive: true,
};

export default function ShopCategoriesPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const text = {
    title: isArabic ? 'إدارة تصنيفات المتجر' : 'Shop Categories Management',
    subtitle: isArabic
      ? 'أنشئ وعدّل ونسّق تصنيفات المتجر التي تظهر في صفحة الشوب.'
      : 'Create, edit, and organize shop categories shown on the public shop page.',
    searchPlaceholder: isArabic ? 'بحث بالاسم أو الرابط...' : 'Search by name or slug...',
    includeInactive: isArabic ? 'إظهار غير النشط' : 'Show inactive',
    newCategory: isArabic ? 'تصنيف جديد' : 'New Category',
    editCategory: isArabic ? 'تعديل التصنيف' : 'Edit Category',
    save: isArabic ? 'حفظ' : 'Save',
    create: isArabic ? 'إنشاء' : 'Create',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    active: isArabic ? 'نشط' : 'Active',
    inactive: isArabic ? 'غير نشط' : 'Inactive',
    nameEn: isArabic ? 'الاسم (English)' : 'Name (English)',
    nameAr: isArabic ? 'الاسم (العربية)' : 'Name (Arabic)',
    slug: 'Slug',
    descriptionEn: isArabic ? 'الوصف (English)' : 'Description (English)',
    descriptionAr: isArabic ? 'الوصف (العربية)' : 'Description (Arabic)',
    image: isArabic ? 'رابط الصورة' : 'Image URL',
    uploadImage: isArabic ? 'رفع صورة' : 'Upload Image',
    uploading: isArabic ? 'جاري الرفع...' : 'Uploading...',
    imagePreview: isArabic ? 'معاينة الصورة' : 'Image Preview',
    supportedFormats: isArabic ? 'PNG, JPG, WEBP بحد أقصى 5MB' : 'PNG, JPG, WEBP up to 5MB',
    sortOrder: isArabic ? 'ترتيب العرض' : 'Sort order',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    edit: isArabic ? 'تعديل' : 'Edit',
    remove: isArabic ? 'حذف' : 'Delete',
    noData: isArabic ? 'لا توجد تصنيفات.' : 'No categories found.',
    createdAt: isArabic ? 'تاريخ الإنشاء' : 'Created',
    status: isArabic ? 'الحالة' : 'Status',
  };

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ includeInactive: String(includeInactive) });
      if (query.trim()) params.set('search', query.trim());

      const response = await fetch(`/api/admin/shop/categories?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load categories');
      }

      const data = await response.json();
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (loadError) {
      setCategories([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, [includeInactive]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const resetEditor = () => {
    setEditor(emptyEditor);
  };

  const startEdit = (category: ShopCategory) => {
    setEditor({
      id: category.id,
      nameEn: category.name_en,
      nameAr: category.name_ar,
      slug: category.slug,
      descriptionEn: category.description_en ?? '',
      descriptionAr: category.description_ar ?? '',
      image: category.image ?? '',
      sortOrder: category.sort_order,
      isActive: category.is_active,
    });
    setError(null);
    setInfo(null);
  };

  const createMode = !editor.id;

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'shop-categories');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to upload image');
    }

    return data.url as string;
  };

  const handleCategoryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);
      const imageUrl = await uploadImage(file);
      setEditor((prev) => ({ ...prev, image: imageUrl }));
      setInfo(isArabic ? 'تم رفع صورة التصنيف بنجاح.' : 'Category image uploaded successfully.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault();

    if (!editor.nameEn.trim() || !editor.nameAr.trim()) {
      setError(isArabic ? 'الاسم باللغتين مطلوب.' : 'Names in both languages are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const payload = {
        nameEn: editor.nameEn,
        nameAr: editor.nameAr,
        slug: editor.slug,
        descriptionEn: editor.descriptionEn,
        descriptionAr: editor.descriptionAr,
        image: editor.image,
        sortOrder: Number(editor.sortOrder),
        isActive: editor.isActive,
      };

      const response = await fetch(
        editor.id ? `/api/admin/shop/categories/${editor.id}` : '/api/admin/shop/categories',
        {
          method: editor.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const resPayload = await response.json().catch(() => ({}));
        throw new Error(typeof resPayload?.error === 'string' ? resPayload.error : 'Save failed');
      }

      setInfo(
        editor.id
          ? isArabic
            ? 'تم تحديث التصنيف بنجاح.'
            : 'Category updated successfully.'
          : isArabic
            ? 'تم إنشاء التصنيف بنجاح.'
            : 'Category created successfully.'
      );

      resetEditor();
      await loadCategories();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category: ShopCategory) => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/shop/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.is_active }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Status update failed');
      }

      setInfo(isArabic ? 'تم تحديث الحالة.' : 'Status updated.');
      await loadCategories();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Status update failed');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (category: ShopCategory) => {
    const confirmMessage = isArabic
      ? `هل تريد حذف التصنيف "${category.name_ar}"؟`
      : `Delete category "${category.name_en}"?`;

    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/shop/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Delete failed');
      }

      setInfo(isArabic ? 'تم حذف التصنيف.' : 'Category deleted.');
      if (editor.id === category.id) {
        resetEditor();
      }
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = useMemo(() => categories.filter((item) => item.is_active).length, [categories]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{text.title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{text.subtitle}</p>
      </div>

      {info && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_370px]">
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {isArabic
                ? `الإجمالي: ${categories.length} · النشط: ${activeCount}`
                : `Total: ${categories.length} · Active: ${activeCount}`}
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]/30"
              />
              {text.includeInactive}
            </label>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.searchPlaceholder}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />

          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            {loading ? (
              <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'جاري تحميل التصنيفات...' : 'Loading categories...'}
              </div>
            ) : categories.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{text.noData}</div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {categories.map((category) => (
                  <article key={category.id} className="grid gap-3 p-4 md:grid-cols-[96px_1fr_auto] md:items-center">
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-zinc-100 md:w-24 dark:bg-zinc-800">
                      {category.image ? (
                        <Image src={category.image} alt={category.name_en} fill sizes="96px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                          {isArabic ? 'بدون صورة' : 'No image'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{isArabic ? category.name_ar : category.name_en}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            category.is_active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {category.is_active ? text.active : text.inactive}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">/{category.slug}</p>
                      <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {isArabic ? category.description_ar || '-' : category.description_en || '-'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {text.createdAt}: {new Date(category.created_at).toLocaleDateString(isArabic ? 'ar-OM' : 'en-US')} · {text.sortOrder}:{' '}
                        {category.sort_order}
                      </p>
                    </div>

                    <div className="flex gap-2 md:flex-col">
                      <button
                        onClick={() => startEdit(category)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {text.edit}
                      </button>
                      <button
                        onClick={() => void toggleStatus(category)}
                        disabled={saving}
                        className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {category.is_active ? (isArabic ? 'تعطيل' : 'Deactivate') : (isArabic ? 'تفعيل' : 'Activate')}
                      </button>
                      <button
                        onClick={() => void removeCategory(category)}
                        disabled={saving}
                        className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        {text.remove}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {createMode ? text.newCategory : text.editCategory}
            </h2>
            {!createMode && (
              <button
                onClick={resetEditor}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {text.cancel}
              </button>
            )}
          </div>

          <form onSubmit={submitCategory} className="space-y-3">
            <input
              value={editor.nameEn}
              onChange={(event) => setEditor((prev) => ({ ...prev, nameEn: event.target.value }))}
              placeholder={text.nameEn}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <input
              value={editor.nameAr}
              onChange={(event) => setEditor((prev) => ({ ...prev, nameAr: event.target.value }))}
              placeholder={text.nameAr}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <input
              value={editor.slug}
              onChange={(event) => setEditor((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder={text.slug}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <textarea
              value={editor.descriptionEn}
              onChange={(event) => setEditor((prev) => ({ ...prev, descriptionEn: event.target.value }))}
              placeholder={text.descriptionEn}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <textarea
              value={editor.descriptionAr}
              onChange={(event) => setEditor((prev) => ({ ...prev, descriptionAr: event.target.value }))}
              placeholder={text.descriptionAr}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <input
              value={editor.image}
              onChange={(event) => setEditor((prev) => ({ ...prev, image: event.target.value }))}
              placeholder={text.image}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                {uploadingImage ? text.uploading : text.uploadImage}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCategoryImageUpload}
                  disabled={uploadingImage}
                />
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{text.supportedFormats}</span>
            </div>
            {editor.image && (
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">{text.imagePreview}</p>
                <div className="relative h-28 w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <Image src={editor.image} alt="Category preview" fill sizes="320px" className="object-cover" />
                </div>
              </div>
            )}
            <input
              type="number"
              value={editor.sortOrder}
              onChange={(event) =>
                setEditor((prev) => ({ ...prev, sortOrder: Number.parseInt(event.target.value || '0', 10) || 0 }))
              }
              placeholder={text.sortOrder}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />

            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={editor.isActive}
                onChange={(event) => setEditor((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]/30"
              />
              {text.active}
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {createMode ? text.create : text.save}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
