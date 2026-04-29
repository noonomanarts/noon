'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { FiImage, FiLink, FiPlus, FiSave, FiTrash2, FiUpload } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import type {
  NoonRecommendationsContent,
  RecommendationCategory,
  RecommendationPartner,
  RecommendationProduct,
} from '@/lib/recommendationsContent';

type ApiPayload = {
  content?: NoonRecommendationsContent;
  error?: string;
};

const emptyContent: NoonRecommendationsContent = {
  introImage: '/og-image.png',
  introTextEn: '',
  introTextAr: '',
  categories: [],
};

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeCategory(): RecommendationCategory {
  return {
    id: uid('cat'),
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    products: [],
    partners: [],
  };
}

function makeProduct(): RecommendationProduct {
  return {
    id: uid('prod'),
    nameEn: '',
    nameAr: '',
    image: '',
    whyEn: '',
    whyAr: '',
    usedInClasses: true,
    buyLabelEn: 'Buy from Partner',
    buyLabelAr: 'اشترِ من الشريك',
    buyUrl: '#',
  };
}

function makePartner(): RecommendationPartner {
  return {
    id: uid('partner'),
    brandNameEn: '',
    brandNameAr: '',
    logo: '',
    websiteUrl: '#',
    whyEn: '',
    whyAr: '',
    productPhotos: [],
    freeRecipeTitleEn: '',
    freeRecipeTitleAr: '',
    freeRecipeBodyEn: '',
    freeRecipeBodyAr: '',
  };
}

export default function AdminRecommendationsPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const [content, setContent] = useState<NoonRecommendationsContent>(emptyContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة نون يوصي' : 'Noon Recommends Management',
    subtitle: isArabic
      ? 'إدارة كاملة لصفحة Noon Recommends: المقدمة، التصنيفات، المنتجات، شركاء العلامة، والوصفات المجانية.'
      : 'Comprehensive management for Noon Recommends: intro, categories, products, brand partners, and free recipes.',
    save: isArabic ? 'حفظ جميع التغييرات' : 'Save All Changes',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    intro: isArabic ? 'مقدمة الصفحة' : 'Page Intro',
    introImage: isArabic ? 'صورة المقدمة' : 'Intro Image',
    introTextEn: isArabic ? 'نص المقدمة (English)' : 'Intro Text (English)',
    introTextAr: isArabic ? 'نص المقدمة (العربية)' : 'Intro Text (Arabic)',
    categories: isArabic ? 'التصنيفات' : 'Categories',
    addCategory: isArabic ? 'إضافة تصنيف' : 'Add Category',
    deleteCategory: isArabic ? 'حذف التصنيف' : 'Delete Category',
    nameEn: isArabic ? 'الاسم (English)' : 'Name (English)',
    nameAr: isArabic ? 'الاسم (العربية)' : 'Name (Arabic)',
    descriptionEn: isArabic ? 'الوصف (English)' : 'Description (English)',
    descriptionAr: isArabic ? 'الوصف (العربية)' : 'Description (Arabic)',
    products: isArabic ? 'المنتجات المقترحة' : 'Recommended Products',
    addProduct: isArabic ? 'إضافة منتج' : 'Add Product',
    deleteProduct: isArabic ? 'حذف المنتج' : 'Delete Product',
    whyEn: isArabic ? 'سبب التوصية (English)' : 'Why recommended (English)',
    whyAr: isArabic ? 'سبب التوصية (العربية)' : 'Why recommended (Arabic)',
    usedInClasses: isArabic ? 'يستخدم في ورشنا' : 'Used in our classes',
    buyLabelEn: isArabic ? 'نص زر الشراء (English)' : 'Buy button text (English)',
    buyLabelAr: isArabic ? 'نص زر الشراء (العربية)' : 'Buy button text (Arabic)',
    buyUrl: isArabic ? 'رابط الشراء' : 'Buy URL',
    image: isArabic ? 'الصورة' : 'Image',
    uploadImage: isArabic ? 'رفع صورة' : 'Upload Image',
    partners: isArabic ? 'شركاء العلامات' : 'Brand Partners',
    partnersHint: isArabic ? 'الموصى به: 1-2 شريك لكل تصنيف.' : 'Recommended: 1-2 partners per category.',
    addPartner: isArabic ? 'إضافة شريك' : 'Add Partner',
    deletePartner: isArabic ? 'حذف الشريك' : 'Delete Partner',
    brandLogo: isArabic ? 'شعار العلامة' : 'Brand Logo',
    website: isArabic ? 'رابط العلامة' : 'Brand URL',
    productPhotos: isArabic ? 'صور منتجات الشريك' : 'Partner Product Photos',
    addPhoto: isArabic ? 'إضافة صورة منتج' : 'Add Product Photo',
    freeRecipeEn: isArabic ? 'وصفة مجانية (English)' : 'Free Recipe (English)',
    freeRecipeAr: isArabic ? 'وصفة مجانية (العربية)' : 'Free Recipe (Arabic)',
    freeRecipeTitleEn: isArabic ? 'عنوان الوصفة (English)' : 'Recipe title (English)',
    freeRecipeTitleAr: isArabic ? 'عنوان الوصفة (العربية)' : 'Recipe title (Arabic)',
    freeRecipeBodyEn: isArabic ? 'نص الوصفة (English)' : 'Recipe body (English)',
    freeRecipeBodyAr: isArabic ? 'نص الوصفة (العربية)' : 'Recipe body (Arabic)',
    selectCategory: isArabic ? 'اختر تصنيفاً من القائمة أو أضف تصنيفاً جديداً.' : 'Select a category from the list or add a new one.',
    saved: isArabic ? 'تم حفظ محتوى Noon Recommends بنجاح.' : 'Noon Recommends content saved successfully.',
  };

  const selectedCategory = useMemo(
    () => content.categories.find((category) => category.id === selectedCategoryId) ?? null,
    [content.categories, selectedCategoryId]
  );

  const setCategory = (next: RecommendationCategory) => {
    setContent((prev) => ({
      ...prev,
      categories: prev.categories.map((category) => (category.id === next.id ? next : category)),
    }));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const data = new FormData();
    data.append('file', file);
    data.append('folder', 'recommendations');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: data,
    });

    const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || 'Failed to upload image');
    }

    return payload.url;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/recommendations');
        const payload = (await response.json().catch(() => ({}))) as ApiPayload;

        if (!response.ok || !payload.content) {
          throw new Error(payload.error || 'Failed to load content');
        }

        setContent(payload.content);
        setSelectedCategoryId(payload.content.categories[0]?.id || '');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/recommendations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.content) {
        throw new Error(payload.error || 'Failed to save content');
      }

      setContent(payload.content);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiSave className="size-4" />
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.intro}</h2>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <span className="relative block h-40 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
              {content.introImage ? (
                <Image src={content.introImage} alt="Intro" fill sizes="220px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <FiImage className="size-6" />
                </span>
              )}
            </span>

            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <FiUpload className="size-4" />
              {uploading === 'intro' ? t.saving : t.uploadImage}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  setUploading('intro');
                  setError(null);
                  void uploadImage(file)
                    .then((url) => {
                      setContent((prev) => ({ ...prev, introImage: url }));
                    })
                    .catch((uploadError) => {
                      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
                    })
                    .finally(() => {
                      setUploading(null);
                    });
                }}
              />
            </label>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.introTextEn}</span>
              <textarea
                rows={4}
                value={content.introTextEn}
                onChange={(event) => setContent((prev) => ({ ...prev, introTextEn: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.introTextAr}</span>
              <textarea
                rows={4}
                value={content.introTextAr}
                onChange={(event) => setContent((prev) => ({ ...prev, introTextAr: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.categories}</h3>
            <button
              type="button"
              onClick={() => {
                const category = makeCategory();
                setContent((prev) => ({ ...prev, categories: [...prev.categories, category] }));
                setSelectedCategoryId(category.id);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FiPlus className="size-3" />
              {t.addCategory}
            </button>
          </div>

          <div className="space-y-2">
            {content.categories.map((category) => {
              const active = category.id === selectedCategoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal-soft)]/40 text-zinc-900 dark:text-zinc-100'
                      : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <p className="font-semibold">{isArabic ? category.nameAr || '—' : category.nameEn || '—'}</p>
                  <p className="text-xs opacity-70">
                    {category.products.length} {isArabic ? 'منتج' : 'products'} • {category.partners.length} {isArabic ? 'شريك' : 'partners'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {!selectedCategory ? (
            <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">{t.selectCategory}</p>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.categories}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setContent((prev) => ({
                        ...prev,
                        categories: prev.categories.filter((item) => item.id !== selectedCategory.id),
                      }));
                      setSelectedCategoryId((prevId) => {
                        if (prevId !== selectedCategory.id) return prevId;
                        const next = content.categories.find((item) => item.id !== selectedCategory.id);
                        return next?.id || '';
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                  >
                    <FiTrash2 className="size-3" />
                    {t.deleteCategory}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.nameEn}</span>
                    <input
                      value={selectedCategory.nameEn}
                      onChange={(event) => setCategory({ ...selectedCategory, nameEn: event.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.nameAr}</span>
                    <input
                      value={selectedCategory.nameAr}
                      onChange={(event) => setCategory({ ...selectedCategory, nameAr: event.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.descriptionEn}</span>
                    <textarea
                      rows={2}
                      value={selectedCategory.descriptionEn}
                      onChange={(event) => setCategory({ ...selectedCategory, descriptionEn: event.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.descriptionAr}</span>
                    <textarea
                      rows={2}
                      value={selectedCategory.descriptionAr}
                      onChange={(event) => setCategory({ ...selectedCategory, descriptionAr: event.target.value })}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.products}</h4>
                  <button
                    type="button"
                    onClick={() => setCategory({ ...selectedCategory, products: [...selectedCategory.products, makeProduct()] })}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <FiPlus className="size-3" />
                    {t.addProduct}
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedCategory.products.map((product) => (
                    <div key={product.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ID: {product.id}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setCategory({
                              ...selectedCategory,
                              products: selectedCategory.products.filter((item) => item.id !== product.id),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                        >
                          <FiTrash2 className="size-3" />
                          {t.deleteProduct}
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.nameEn}</span>
                          <input
                            value={product.nameEn}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                products: selectedCategory.products.map((item) =>
                                  item.id === product.id ? { ...item, nameEn: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.nameAr}</span>
                          <input
                            value={product.nameAr}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                products: selectedCategory.products.map((item) =>
                                  item.id === product.id ? { ...item, nameAr: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <div className="space-y-2 sm:col-span-2">
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t.image}</span>
                          <div className="flex items-center gap-3">
                            <span className="relative block h-14 w-14 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                              {product.image ? (
                                <Image src={product.image} alt={product.nameEn || 'Product'} fill sizes="56px" className="object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-zinc-500">
                                  <FiImage className="size-4" />
                                </span>
                              )}
                            </span>

                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              <FiUpload className="size-3" />
                              {uploading === `product-${product.id}` ? t.saving : t.uploadImage}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;

                                  setUploading(`product-${product.id}`);
                                  setError(null);
                                  void uploadImage(file)
                                    .then((url) => {
                                      setCategory({
                                        ...selectedCategory,
                                        products: selectedCategory.products.map((item) =>
                                          item.id === product.id ? { ...item, image: url } : item
                                        ),
                                      });
                                    })
                                    .catch((uploadError) => {
                                      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
                                    })
                                    .finally(() => {
                                      setUploading(null);
                                    });
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.whyEn}</span>
                          <textarea
                            rows={2}
                            value={product.whyEn}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                products: selectedCategory.products.map((item) =>
                                  item.id === product.id ? { ...item, whyEn: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.whyAr}</span>
                          <textarea
                            rows={2}
                            value={product.whyAr}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                products: selectedCategory.products.map((item) =>
                                  item.id === product.id ? { ...item, whyAr: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={product.usedInClasses}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                products: selectedCategory.products.map((item) =>
                                  item.id === product.id ? { ...item, usedInClasses: event.target.checked } : item
                                ),
                              })
                            }
                            className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                          />
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.usedInClasses}</span>
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.buyUrl}</span>
                          <div className="relative">
                            <FiLink className="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                            <input
                              value={product.buyUrl}
                              onChange={(event) =>
                                setCategory({
                                  ...selectedCategory,
                                  products: selectedCategory.products.map((item) =>
                                    item.id === product.id ? { ...item, buyUrl: event.target.value } : item
                                  ),
                                })
                              }
                              className="w-full rounded-lg border border-zinc-300 py-2 ps-8 pe-3 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </div>
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.buyLabelEn}</span>
                          <input
                            value={product.buyLabelEn}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                products: selectedCategory.products.map((item) =>
                                  item.id === product.id ? { ...item, buyLabelEn: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.buyLabelAr}</span>
                          <input
                            value={product.buyLabelAr}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                products: selectedCategory.products.map((item) =>
                                  item.id === product.id ? { ...item, buyLabelAr: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.partners}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.partnersHint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategory({ ...selectedCategory, partners: [...selectedCategory.partners, makePartner()] })}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <FiPlus className="size-3" />
                    {t.addPartner}
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedCategory.partners.map((partner) => (
                    <div key={partner.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ID: {partner.id}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setCategory({
                              ...selectedCategory,
                              partners: selectedCategory.partners.filter((item) => item.id !== partner.id),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                        >
                          <FiTrash2 className="size-3" />
                          {t.deletePartner}
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.nameEn}</span>
                          <input
                            value={partner.brandNameEn}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, brandNameEn: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.nameAr}</span>
                          <input
                            value={partner.brandNameAr}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, brandNameAr: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <div className="space-y-2">
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t.brandLogo}</span>
                          <div className="flex items-center gap-3">
                            <span className="relative block h-12 w-12 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                              {partner.logo ? (
                                <Image src={partner.logo} alt={partner.brandNameEn || 'Brand'} fill sizes="48px" className="object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-zinc-500">
                                  <FiImage className="size-4" />
                                </span>
                              )}
                            </span>

                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              <FiUpload className="size-3" />
                              {uploading === `partner-logo-${partner.id}` ? t.saving : t.uploadImage}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;

                                  setUploading(`partner-logo-${partner.id}`);
                                  setError(null);
                                  void uploadImage(file)
                                    .then((url) => {
                                      setCategory({
                                        ...selectedCategory,
                                        partners: selectedCategory.partners.map((item) =>
                                          item.id === partner.id ? { ...item, logo: url } : item
                                        ),
                                      });
                                    })
                                    .catch((uploadError) => {
                                      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
                                    })
                                    .finally(() => {
                                      setUploading(null);
                                    });
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.website}</span>
                          <input
                            value={partner.websiteUrl}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, websiteUrl: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.whyEn}</span>
                          <textarea
                            rows={2}
                            value={partner.whyEn}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, whyEn: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.whyAr}</span>
                          <textarea
                            rows={2}
                            value={partner.whyAr}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, whyAr: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <div className="space-y-2 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t.productPhotos}</span>
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              <FiUpload className="size-3" />
                              {uploading === `partner-photo-${partner.id}` ? t.saving : t.addPhoto}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;

                                  setUploading(`partner-photo-${partner.id}`);
                                  setError(null);
                                  void uploadImage(file)
                                    .then((url) => {
                                      setCategory({
                                        ...selectedCategory,
                                        partners: selectedCategory.partners.map((item) =>
                                          item.id === partner.id
                                            ? { ...item, productPhotos: [...item.productPhotos, url] }
                                            : item
                                        ),
                                      });
                                    })
                                    .catch((uploadError) => {
                                      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
                                    })
                                    .finally(() => {
                                      setUploading(null);
                                    });
                                }}
                              />
                            </label>
                          </div>

                          {partner.productPhotos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {partner.productPhotos.map((photo, index) => (
                                <div key={`${partner.id}-${photo}-${index}`} className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                                  <span className="relative block h-20">
                                    <Image src={photo} alt={`${partner.brandNameEn}-photo-${index + 1}`} fill sizes="120px" className="object-cover" />
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCategory({
                                        ...selectedCategory,
                                        partners: selectedCategory.partners.map((item) =>
                                          item.id === partner.id
                                            ? {
                                                ...item,
                                                productPhotos: item.productPhotos.filter((_, i) => i !== index),
                                              }
                                            : item
                                        ),
                                      })
                                    }
                                    className="absolute end-1 top-1 rounded bg-black/60 p-1 text-white"
                                  >
                                    <FiTrash2 className="size-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.freeRecipeTitleEn}</span>
                          <input
                            value={partner.freeRecipeTitleEn}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, freeRecipeTitleEn: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.freeRecipeTitleAr}</span>
                          <input
                            value={partner.freeRecipeTitleAr}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, freeRecipeTitleAr: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.freeRecipeBodyEn}</span>
                          <textarea
                            rows={3}
                            value={partner.freeRecipeBodyEn}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, freeRecipeBodyEn: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.freeRecipeBodyAr}</span>
                          <textarea
                            rows={3}
                            value={partner.freeRecipeBodyAr}
                            onChange={(event) =>
                              setCategory({
                                ...selectedCategory,
                                partners: selectedCategory.partners.map((item) =>
                                  item.id === partner.id ? { ...item, freeRecipeBodyAr: event.target.value } : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
