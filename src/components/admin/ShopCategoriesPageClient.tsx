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

type ImageAspectRatio = '1:1' | '4:3';

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
  const [processingImage, setProcessingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>('1:1');
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
    processing: isArabic ? 'جاري تجهيز الصورة...' : 'Processing image...',
    uploading: isArabic ? 'جاري الرفع...' : 'Uploading...',
    imagePreview: isArabic ? 'معاينة الصورة' : 'Image Preview',
    dragDropHint: isArabic
      ? 'اسحب صورة هنا أو اضغط لاختيار ملف'
      : 'Drag & drop an image here, or click to select a file',
    aspectRatio: isArabic ? 'نسبة الصورة' : 'Image ratio',
    square: isArabic ? 'مربع 1:1' : 'Square 1:1',
    landscape: isArabic ? 'أفقي 4:3' : 'Landscape 4:3',
    uploadingProgress: isArabic ? 'نسبة الرفع' : 'Upload progress',
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
  const previewAspectRatio = imageAspectRatio === '1:1' ? '1 / 1' : '4 / 3';

  const preprocessImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) {
      throw new Error(isArabic ? 'الملف يجب أن يكون صورة.' : 'Selected file must be an image.');
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to read image file'));
        img.src = objectUrl;
      });

      const ratio = imageAspectRatio === '1:1' ? 1 : 4 / 3;

      let cropWidth = image.width;
      let cropHeight = Math.round(cropWidth / ratio);

      if (cropHeight > image.height) {
        cropHeight = image.height;
        cropWidth = Math.round(cropHeight * ratio);
      }

      const sx = Math.floor((image.width - cropWidth) / 2);
      const sy = Math.floor((image.height - cropHeight) / 2);

      const baseWidth = Math.min(1400, Math.max(800, cropWidth));
      const outputWidth = imageAspectRatio === '1:1' ? baseWidth : Math.max(900, baseWidth);
      const outputHeight = Math.round(outputWidth / ratio);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas not available');
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error('Failed to process image blob'));
          },
          'image/webp',
          0.88
        );
      });

      const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'category';
      return new File([blob], `${safeName}.webp`, { type: 'image/webp' });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'shop-categories');

    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      };

      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText || '{}') as { url?: string; error?: string };

          if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
            resolve(payload.url);
            return;
          }

          reject(new Error(payload.error || 'Failed to upload image'));
        } catch {
          reject(new Error('Invalid upload response'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error while uploading image'));
      xhr.send(formData);
    });
  };

  const handleCategoryImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setProcessingImage(true);
      setUploadProgress(0);
      setUploadingImage(true);
      setError(null);
      const processedFile = await preprocessImage(file);
      setProcessingImage(false);
      const imageUrl = await uploadImage(processedFile);
      setEditor((prev) => ({ ...prev, image: imageUrl }));
      setInfo(isArabic ? 'تم رفع صورة التصنيف بنجاح.' : 'Category image uploaded successfully.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
    } finally {
      setProcessingImage(false);
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    await handleCategoryImageUpload(file);
    event.target.value = '';
  };

  const handleImageDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    await handleCategoryImageUpload(file);
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
            <label
              className={`block cursor-pointer rounded-lg border border-dashed px-3 py-4 text-center transition ${
                isDragOver
                  ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)]/5'
                  : 'border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800/60'
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => void handleImageDrop(event)}
            >
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-200">
                {processingImage ? text.processing : uploadingImage ? text.uploading : text.dragDropHint}
              </span>
              <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">{text.supportedFormats}</span>
              <span className="mt-2 inline-flex rounded-md border border-zinc-300 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200">
                {text.uploadImage}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleImageInputChange(event)}
                  disabled={uploadingImage || processingImage}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImageAspectRatio('1:1')}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                  imageAspectRatio === '1:1'
                    ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)]/10 text-zinc-900 dark:text-zinc-100'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {text.square}
              </button>
              <button
                type="button"
                onClick={() => setImageAspectRatio('4:3')}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                  imageAspectRatio === '4:3'
                    ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)]/10 text-zinc-900 dark:text-zinc-100'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {text.landscape}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {text.aspectRatio}: {imageAspectRatio}
            </p>
            {(uploadingImage || processingImage) && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                  <span>{processingImage ? text.processing : text.uploadingProgress}</span>
                  <span>{processingImage ? '...' : `${uploadProgress}%`}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-[color:var(--noon-teal)] transition-all"
                    style={{ width: `${processingImage ? 35 : uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                {text.uploadImage}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleImageInputChange(event)}
                  disabled={uploadingImage || processingImage}
                />
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{text.supportedFormats}</span>
            </div>
            {editor.image && (
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">{text.imagePreview}</p>
                <div
                  className="relative w-full max-w-sm overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                  style={{ aspectRatio: previewAspectRatio }}
                >
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
