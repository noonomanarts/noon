'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/lib/locale';

type DiscoverLink = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
};

type EditorState = {
  id?: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  url: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyEditor: EditorState = {
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  descriptionAr: '',
  image: '',
  url: '',
  sortOrder: '0',
  isActive: true,
};

export default function ShopDiscoverMorePageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<DiscoverLink[]>([]);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [uploadingLinkImage, setUploadingLinkImage] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة روابط Discover more' : 'Discover More Links Management',
    discoverSection: isArabic ? 'روابط Discover more' : 'Discover More Links',
    imageUrl: isArabic ? 'رابط الصورة' : 'Image URL',
    upload: isArabic ? 'رفع صورة' : 'Upload Image',
    uploading: isArabic ? 'جاري الرفع...' : 'Uploading...',
    titleEn: isArabic ? 'العنوان (English)' : 'Title (English)',
    titleAr: isArabic ? 'العنوان (العربية)' : 'Title (Arabic)',
    descriptionEn: isArabic ? 'الوصف (English)' : 'Description (English)',
    descriptionAr: isArabic ? 'الوصف (العربية)' : 'Description (Arabic)',
    websiteUrl: isArabic ? 'رابط الموقع الخارجي' : 'External Website URL',
    sortOrder: isArabic ? 'ترتيب العرض' : 'Sort order',
    active: isArabic ? 'نشط' : 'Active',
    addLink: isArabic ? 'إضافة رابط' : 'Add Link',
    updateLink: isArabic ? 'تحديث الرابط' : 'Update Link',
    cancelEdit: isArabic ? 'إلغاء التعديل' : 'Cancel Edit',
    edit: isArabic ? 'تعديل' : 'Edit',
    remove: isArabic ? 'حذف' : 'Delete',
    noData: isArabic ? 'لا توجد روابط Discover more حتى الآن.' : 'No Discover more links yet.',
    preview: isArabic ? 'معاينة' : 'Preview',
  };

  const resetEditor = () => {
    setEditor(emptyEditor);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const linksRes = await fetch('/api/admin/shop/discover-links', { cache: 'no-store' });
      if (!linksRes.ok) {
        const payload = await linksRes.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load discover links');
      }

      const linksPayload = (await linksRes.json()) as { links?: DiscoverLink[] };
      const loadedLinks = Array.isArray(linksPayload.links) ? linksPayload.links : [];
      setLinks(loadedLinks);
    } catch (loadError) {
      setLinks([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  const handleUploadLinkImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    try {
      setUploadingLinkImage(true);
      setError(null);
      const imageUrl = await uploadImage(file, 'shop-discover-more');
      setEditor((prev) => ({ ...prev, image: imageUrl }));
      setInfo(isArabic ? 'تم رفع صورة الرابط.' : 'Link image uploaded.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setUploadingLinkImage(false);
      event.target.value = '';
    }
  };

  const submitLink = async (event: FormEvent) => {
    event.preventDefault();

    if (!editor.url.trim()) {
      setError(isArabic ? 'رابط الموقع الخارجي مطلوب.' : 'External website URL is required.');
      return;
    }

    setSaving(true);
    setInfo(null);
    setError(null);

    try {
      const payload = {
        titleEn: editor.titleEn,
        titleAr: editor.titleAr,
        descriptionEn: editor.descriptionEn,
        descriptionAr: editor.descriptionAr,
        image: editor.image,
        url: editor.url,
        isActive: editor.isActive,
        sortOrder: Number(editor.sortOrder || '0'),
      };

      const response = await fetch(
        editor.id ? `/api/admin/shop/discover-links/${editor.id}` : '/api/admin/shop/discover-links',
        {
          method: editor.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to save discover link');
      }

      setInfo(
        editor.id
          ? isArabic
            ? 'تم تحديث الرابط.'
            : 'Link updated.'
          : isArabic
            ? 'تمت إضافة الرابط.'
            : 'Link created.'
      );
      resetEditor();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save discover link');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (link: DiscoverLink) => {
    setEditor({
      id: link.id,
      titleEn: link.titleEn,
      titleAr: link.titleAr,
      descriptionEn: link.descriptionEn,
      descriptionAr: link.descriptionAr,
      image: link.image,
      url: link.url,
      sortOrder: String(link.sortOrder),
      isActive: link.isActive,
    });
    setError(null);
    setInfo(null);
  };

  const removeLink = async (link: DiscoverLink) => {
    if (!window.confirm(isArabic ? 'هل تريد حذف هذا الرابط؟' : 'Delete this link?')) return;

    setSaving(true);
    setInfo(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/shop/discover-links/${link.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to delete link');
      }

      setInfo(isArabic ? 'تم حذف الرابط.' : 'Link deleted.');
      if (editor.id === link.id) resetEditor();
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete link');
    } finally {
      setSaving(false);
    }
  };

  const orderedLinks = useMemo(
    () => [...links].sort((a, b) => a.sortOrder - b.sortOrder || a.titleEn.localeCompare(b.titleEn)),
    [links]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
      </div>

      {info ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.discoverSection}</h2>

          {loading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
          ) : orderedLinks.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
          ) : (
            <div className="space-y-3">
              {orderedLinks.map((link) => (
                <div key={link.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-zinc-100 md:w-36 dark:bg-zinc-800">
                      {link.image ? <Image src={link.image} alt={link.titleEn || link.titleAr || 'Discover link'} fill className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {(isArabic ? link.titleAr : link.titleEn) || link.titleEn || link.titleAr || '-'}
                      </p>
                      <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {(isArabic ? link.descriptionAr : link.descriptionEn) || link.descriptionEn || link.descriptionAr || '-'}
                      </p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-block truncate text-xs font-medium text-[color:var(--noon-teal)] hover:underline"
                      >
                        {link.url}
                      </a>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        #{link.sortOrder} · {link.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(link)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeLink(link)}
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        {t.remove}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{editor.id ? t.updateLink : t.addLink}</h2>
          <form className="space-y-3" onSubmit={submitLink}>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.titleEn}</span>
              <input
                type="text"
                value={editor.titleEn}
                onChange={(event) => setEditor((prev) => ({ ...prev, titleEn: event.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.titleAr}</span>
              <input
                type="text"
                value={editor.titleAr}
                onChange={(event) => setEditor((prev) => ({ ...prev, titleAr: event.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.descriptionEn}</span>
              <textarea
                rows={2}
                value={editor.descriptionEn}
                onChange={(event) => setEditor((prev) => ({ ...prev, descriptionEn: event.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.descriptionAr}</span>
              <textarea
                rows={2}
                value={editor.descriptionAr}
                onChange={(event) => setEditor((prev) => ({ ...prev, descriptionAr: event.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.websiteUrl}</span>
              <input
                type="url"
                value={editor.url}
                onChange={(event) => setEditor((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.imageUrl}</span>
              <input
                type="text"
                value={editor.image}
                onChange={(event) => setEditor((prev) => ({ ...prev, image: event.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <span>{uploadingLinkImage ? t.uploading : t.upload}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadLinkImage}
                disabled={uploadingLinkImage}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.sortOrder}</span>
                <input
                  type="number"
                  value={editor.sortOrder}
                  onChange={(event) => setEditor((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>

              <label className="flex items-center gap-2 pt-7 text-sm text-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={editor.isActive}
                  onChange={(event) => setEditor((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-[color:var(--noon-teal)]"
                />
                {t.active}
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {editor.id ? t.updateLink : t.addLink}
              </button>
              {editor.id ? (
                <button
                  type="button"
                  onClick={resetEditor}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {t.cancelEdit}
                </button>
              ) : null}
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.preview}</p>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-24 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                  {editor.image ? <Image src={editor.image} alt="Discover preview" fill className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {(isArabic ? editor.titleAr : editor.titleEn) || editor.titleEn || editor.titleAr || '-'}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{editor.url || '-'}</p>
                </div>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
