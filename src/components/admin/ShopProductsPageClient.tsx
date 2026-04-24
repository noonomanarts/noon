'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type ShopCategory = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
};

type ShopProduct = {
  id: string;
  category_id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  cost: number;
  currency: string;
  sku: string | null;
  image: string | null;
  gallery_images: string[];
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  category_name_en: string;
  category_name_ar: string;
  category_slug: string;
};

type EditorState = {
  id?: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  price: string;
  cost: string;
  currency: string;
  sku: string;
  image: string;
  galleryInput: string;
  stockQuantity: string;
  sortOrder: string;
  isActive: boolean;
  isFeatured: boolean;
};

const emptyEditor: EditorState = {
  categoryId: '',
  nameEn: '',
  nameAr: '',
  slug: '',
  descriptionEn: '',
  descriptionAr: '',
  price: '',
  cost: '0',
  currency: 'OMR',
  sku: '',
  image: '',
  galleryInput: '',
  stockQuantity: '0',
  sortOrder: '0',
  isActive: true,
  isFeatured: false,
};

export default function ShopProductsPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';

  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة منتجات المتجر' : 'Shop Products Management',
    subtitle: isArabic
      ? 'أضف المنتجات واربط كل منتج بتصنيف موجود ثم أدِر الأسعار والمخزون.'
      : 'Create products, assign each product to an existing category, and manage pricing and stock.',
    search: isArabic ? 'بحث بالاسم/السلاج/sku...' : 'Search by name/slug/sku...',
    includeInactive: isArabic ? 'إظهار غير النشط' : 'Show inactive',
    categoryFilter: isArabic ? 'تصفية حسب التصنيف' : 'Filter by category',
    allCategories: isArabic ? 'كل التصنيفات' : 'All categories',
    newProduct: isArabic ? 'منتج جديد' : 'New Product',
    editProduct: isArabic ? 'تعديل المنتج' : 'Edit Product',
    create: isArabic ? 'إنشاء' : 'Create',
    save: isArabic ? 'حفظ' : 'Save',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    noData: isArabic ? 'لا توجد منتجات.' : 'No products found.',
    noCategories: isArabic ? 'لا توجد تصنيفات، أضف تصنيف أولاً.' : 'No categories available, create a category first.',
    active: isArabic ? 'نشط' : 'Active',
    featured: isArabic ? 'مميز' : 'Featured',
    category: isArabic ? 'التصنيف' : 'Category',
    nameEn: isArabic ? 'اسم المنتج (English)' : 'Product name (English)',
    nameAr: isArabic ? 'اسم المنتج (العربية)' : 'Product name (Arabic)',
    slug: 'Slug',
    descriptionEn: isArabic ? 'الوصف (English)' : 'Description (English)',
    descriptionAr: isArabic ? 'الوصف (العربية)' : 'Description (Arabic)',
    price: isArabic ? 'السعر' : 'Price',
    cost: isArabic ? 'التكلفة' : 'Cost',
    currency: isArabic ? 'العملة' : 'Currency',
    sku: 'SKU',
    stock: isArabic ? 'المخزون' : 'Stock quantity',
    sortOrder: isArabic ? 'ترتيب العرض' : 'Sort order',
    mainImage: isArabic ? 'الصورة الرئيسية' : 'Main image URL',
    gallery: isArabic ? 'صور إضافية (كل سطر رابط)' : 'Gallery images (one URL per line)',
    uploadMain: isArabic ? 'رفع الصورة الرئيسية' : 'Upload main image',
    uploadGallery: isArabic ? 'رفع صورة للمعرض' : 'Upload gallery image',
    delete: isArabic ? 'حذف' : 'Delete',
    edit: isArabic ? 'تعديل' : 'Edit',
  };

  const createMode = !editor.id;

  const parseGallery = (input: string) =>
    input
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

  const loadCategories = useCallback(async () => {
    const response = await fetch('/api/admin/shop/categories?includeInactive=false');
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load categories');
    }
    const data = await response.json();
    return Array.isArray(data?.categories) ? (data.categories as ShopCategory[]) : [];
  }, []);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({ includeInactive: String(includeInactive) });
    if (debouncedQuery.trim()) params.set('search', debouncedQuery.trim());
    if (selectedCategoryId !== 'ALL') params.set('categoryId', selectedCategoryId);

    const response = await fetch(`/api/admin/shop/products?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load products');
    }

    const data = await response.json();
    return Array.isArray(data?.products) ? (data.products as ShopProduct[]) : [];
  }, [debouncedQuery, includeInactive, selectedCategoryId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [categoriesData, productsData] = await Promise.all([loadCategories(), loadProducts()]);
      setCategories(categoriesData);
      setProducts(productsData);

      if (!editor.categoryId && categoriesData[0]) {
        setEditor((prev) => ({ ...prev, categoryId: categoriesData[0].id }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load data');
      setCategories([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [editor.categoryId, loadCategories, loadProducts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const resetEditor = () => {
    setEditor({
      ...emptyEditor,
      categoryId: categories[0]?.id || '',
    });
  };

  const startEdit = (product: ShopProduct) => {
    setEditor({
      id: product.id,
      categoryId: product.category_id,
      nameEn: product.name_en,
      nameAr: product.name_ar,
      slug: product.slug,
      descriptionEn: product.description_en || '',
      descriptionAr: product.description_ar || '',
      price: String(product.price),
      cost: String(product.cost),
      currency: product.currency,
      sku: product.sku || '',
      image: product.image || '',
      galleryInput: (product.gallery_images || []).join('\n'),
      stockQuantity: String(product.stock_quantity),
      sortOrder: String(product.sort_order),
      isActive: product.is_active,
      isFeatured: product.is_featured,
    });
    setError(null);
    setInfo(null);
  };

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

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

  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMainImage(true);
      setError(null);
      const url = await uploadImage(file, 'shop-products');
      setEditor((prev) => ({ ...prev, image: url }));
      setInfo(isArabic ? 'تم رفع الصورة الرئيسية.' : 'Main image uploaded.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setUploadingMainImage(false);
      event.target.value = '';
    }
  };

  const handleGalleryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingGalleryImage(true);
      setError(null);
      const url = await uploadImage(file, 'shop-products');
      setEditor((prev) => ({
        ...prev,
        galleryInput: prev.galleryInput.trim() ? `${prev.galleryInput}\n${url}` : url,
      }));
      setInfo(isArabic ? 'تمت إضافة صورة للمعرض.' : 'Gallery image added.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setUploadingGalleryImage(false);
      event.target.value = '';
    }
  };

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();

    if (!editor.categoryId) {
      setError(isArabic ? 'اختر تصنيفًا للمنتج.' : 'Please select a category.');
      return;
    }
    if (!editor.nameEn.trim() || !editor.nameAr.trim()) {
      setError(isArabic ? 'اسم المنتج باللغتين مطلوب.' : 'Product name in both languages is required.');
      return;
    }
    if (!editor.price.trim() || Number.isNaN(Number(editor.price)) || Number(editor.price) < 0) {
      setError(isArabic ? 'السعر غير صحيح.' : 'Invalid price value.');
      return;
    }
    if (!editor.cost.trim() || Number.isNaN(Number(editor.cost)) || Number(editor.cost) < 0) {
      setError(isArabic ? 'التكلفة غير صحيحة.' : 'Invalid cost value.');
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const payload = {
        categoryId: editor.categoryId,
        slug: editor.slug,
        nameEn: editor.nameEn,
        nameAr: editor.nameAr,
        descriptionEn: editor.descriptionEn,
        descriptionAr: editor.descriptionAr,
        price: Number(editor.price),
        cost: Number(editor.cost),
        currency: editor.currency || 'OMR',
        sku: editor.sku,
        image: editor.image,
        galleryImages: parseGallery(editor.galleryInput),
        stockQuantity: Number(editor.stockQuantity || '0'),
        sortOrder: Number(editor.sortOrder || '0'),
        isActive: editor.isActive,
        isFeatured: editor.isFeatured,
      };

      const response = await fetch(
        editor.id ? `/api/admin/shop/products/${editor.id}` : '/api/admin/shop/products',
        {
          method: editor.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof responsePayload?.error === 'string' ? responsePayload.error : 'Save failed');
      }

      setInfo(
        editor.id
          ? isArabic
            ? 'تم تحديث المنتج بنجاح.'
            : 'Product updated successfully.'
          : isArabic
            ? 'تم إنشاء المنتج بنجاح.'
            : 'Product created successfully.'
      );

      resetEditor();
      await refreshAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (product: ShopProduct) => {
    const message = isArabic
      ? `هل تريد حذف المنتج \"${product.name_ar}\"؟`
      : `Delete product "${product.name_en}"?`;

    if (!window.confirm(message)) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/shop/products/${product.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Delete failed');
      }

      setInfo(isArabic ? 'تم حذف المنتج.' : 'Product deleted.');
      if (editor.id === product.id) resetEditor();
      await refreshAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const active = products.filter((item) => item.is_active).length;
    const featured = products.filter((item) => item.is_featured).length;
    return { total: products.length, active, featured };
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isArabic
                ? `الإجمالي: ${stats.total} · النشط: ${stats.active} · المميز: ${stats.featured}`
                : `Total: ${stats.total} · Active: ${stats.active} · Featured: ${stats.featured}`}
            </p>
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)]"
              />
              {t.includeInactive}
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
            <select
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="ALL">{t.allCategories}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {isArabic ? category.name_ar : category.name_en}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {products.map((product) => (
                  <article key={product.id} className="grid gap-3 p-4 md:grid-cols-[96px_1fr_auto] md:items-center">
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-zinc-100 md:w-24 dark:bg-zinc-800">
                      {product.image ? (
                        <Image src={product.image} alt={product.name_en} fill sizes="96px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">No image</div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {isArabic ? product.name_ar : product.name_en}
                        </h3>
                        {!product.is_active && (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300">
                            {isArabic ? 'غير نشط' : 'Inactive'}
                          </span>
                        )}
                        {product.is_featured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            {t.featured}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        /{product.slug} · {isArabic ? product.category_name_ar : product.category_name_en}
                      </p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">
                        {formatAmountWithCurrency(product.price, product.currency)}
                        {' · '}
                        {t.cost}: {formatAmountWithCurrency(product.cost, product.currency)}
                        {' · '}
                        {isArabic ? 'المخزون' : 'Stock'}: {product.stock_quantity}
                      </p>
                    </div>

                    <div className="flex gap-2 md:flex-col">
                      <button
                        onClick={() => startEdit(product)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => void removeProduct(product)}
                        disabled={saving}
                        className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        {t.delete}
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
              {createMode ? t.newProduct : t.editProduct}
            </h2>
            {!createMode && (
              <button
                onClick={resetEditor}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t.cancel}
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              {t.noCategories}
            </p>
          ) : (
            <form onSubmit={submitProduct} className="space-y-3">
              <select
                value={editor.categoryId}
                onChange={(event) => setEditor((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">{t.category}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {isArabic ? category.name_ar : category.name_en}
                  </option>
                ))}
              </select>

              <input
                value={editor.nameEn}
                onChange={(event) => setEditor((prev) => ({ ...prev, nameEn: event.target.value }))}
                placeholder={t.nameEn}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
              <input
                value={editor.nameAr}
                onChange={(event) => setEditor((prev) => ({ ...prev, nameAr: event.target.value }))}
                placeholder={t.nameAr}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
              <input
                value={editor.slug}
                onChange={(event) => setEditor((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder={t.slug}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />

              <textarea
                rows={2}
                value={editor.descriptionEn}
                onChange={(event) => setEditor((prev) => ({ ...prev, descriptionEn: event.target.value }))}
                placeholder={t.descriptionEn}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
              <textarea
                rows={2}
                value={editor.descriptionAr}
                onChange={(event) => setEditor((prev) => ({ ...prev, descriptionAr: event.target.value }))}
                placeholder={t.descriptionAr}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />

              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">{t.price}</span>
                  <input
                    value={editor.price}
                    onChange={(event) => setEditor((prev) => ({ ...prev, price: event.target.value }))}
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder={t.price}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">{t.cost}</span>
                  <input
                    value={editor.cost}
                    onChange={(event) => setEditor((prev) => ({ ...prev, cost: event.target.value }))}
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder={t.cost}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">{t.currency}</span>
                  <input
                    value={editor.currency}
                    onChange={(event) => setEditor((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                    placeholder={t.currency}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editor.sku}
                  onChange={(event) => setEditor((prev) => ({ ...prev, sku: event.target.value }))}
                  placeholder={t.sku}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
                <input
                  value={editor.stockQuantity}
                  onChange={(event) => setEditor((prev) => ({ ...prev, stockQuantity: event.target.value }))}
                  type="number"
                  min="0"
                  placeholder={t.stock}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <input
                value={editor.image}
                onChange={(event) => setEditor((prev) => ({ ...prev, image: event.target.value }))}
                placeholder={t.mainImage}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  {uploadingMainImage ? 'Uploading...' : t.uploadMain}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleMainImageUpload(event)}
                    disabled={uploadingMainImage}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  {uploadingGalleryImage ? 'Uploading...' : t.uploadGallery}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleGalleryImageUpload(event)}
                    disabled={uploadingGalleryImage}
                  />
                </label>
              </div>

              <textarea
                rows={3}
                value={editor.galleryInput}
                onChange={(event) => setEditor((prev) => ({ ...prev, galleryInput: event.target.value }))}
                placeholder={t.gallery}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editor.sortOrder}
                  onChange={(event) => setEditor((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  type="number"
                  placeholder={t.sortOrder}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
                <div className="flex items-center gap-4 px-1 text-xs text-zinc-600 dark:text-zinc-300">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={editor.isActive}
                      onChange={(event) => setEditor((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    {t.active}
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={editor.isFeatured}
                      onChange={(event) => setEditor((prev) => ({ ...prev, isFeatured: event.target.checked }))}
                    />
                    {t.featured}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {createMode ? t.create : t.save}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
