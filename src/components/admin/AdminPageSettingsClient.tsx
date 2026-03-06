"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiArrowLeft, FiExternalLink, FiRefreshCw, FiSave } from "react-icons/fi";

import type { Locale } from "@/lib/locale";
import {
  buildLocalizedPagePath,
  getDefaultSitePageSettings,
  isDynamicPathTemplate,
  type SitePageDefinition,
  type SitePageSettings,
} from "@/lib/admin/sitePages";

function keywordsToText(value: string[]): string {
  return value.join(", ");
}

function textToKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 24);
}

export default function AdminPageSettingsClient({
  locale,
  page,
  initialSettings,
}: {
  locale: Locale;
  page: SitePageDefinition;
  initialSettings: SitePageSettings;
}) {
  const isArabic = locale === "ar";
  const [settings, setSettings] = useState<SitePageSettings>(initialSettings);
  const [keywordsEnText, setKeywordsEnText] = useState(() => keywordsToText(initialSettings.keywordsEn));
  const [keywordsArText, setKeywordsArText] = useState(() => keywordsToText(initialSettings.keywordsAr));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const defaults = useMemo(() => getDefaultSitePageSettings(page), [page]);
  const isDynamic = isDynamicPathTemplate(page.pathTemplate);
  const previewEn = buildLocalizedPagePath(page.pathTemplate, "en");
  const previewAr = buildLocalizedPagePath(page.pathTemplate, "ar");

  const t = {
    back: isArabic ? "العودة إلى الصفحات" : "Back to Pages",
    save: isArabic ? "حفظ الإعدادات" : "Save Settings",
    saving: isArabic ? "جارٍ الحفظ..." : "Saving...",
    reset: isArabic ? "استعادة الافتراضيات" : "Reset to Defaults",
    saved: isArabic ? "تم حفظ إعدادات الصفحة بنجاح." : "Page settings saved successfully.",
    saveError: isArabic ? "تعذر حفظ إعدادات الصفحة." : "Failed to save page settings.",
    pageSettings: isArabic ? "إعدادات الصفحة" : "Page Settings",
    visibility: isArabic ? "الظهور" : "Visibility",
    navPlacement: isArabic ? "موضع القائمة" : "Navigation Placement",
    footerVisible: isArabic ? "إظهار في الفوتر" : "Show in Footer",
    indexable: isArabic ? "قابل للفهرسة" : "Indexable by Search Engines",
    published: isArabic ? "منشور" : "Published",
    draft: isArabic ? "مسودة" : "Draft",
    hidden: isArabic ? "مخفي" : "Hidden",
    primaryNav: isArabic ? "القائمة الرئيسية" : "Primary Navigation",
    secondaryNav: isArabic ? "القائمة الثانوية" : "Secondary Navigation",
    noNav: isArabic ? "بدون قائمة" : "No Navigation",
    contentSection: isArabic ? "المحتوى الثابت (EN/AR)" : "Static Content (EN/AR)",
    headingEn: isArabic ? "العنوان (EN)" : "Heading (EN)",
    headingAr: isArabic ? "العنوان (AR)" : "Heading (AR)",
    subheadingEn: isArabic ? "الوصف المختصر (EN)" : "Subheading (EN)",
    subheadingAr: isArabic ? "الوصف المختصر (AR)" : "Subheading (AR)",
    seoSection: isArabic ? "إعدادات SEO" : "SEO Settings",
    seoTitleEn: isArabic ? "عنوان SEO (EN)" : "SEO Title (EN)",
    seoTitleAr: isArabic ? "عنوان SEO (AR)" : "SEO Title (AR)",
    seoDescriptionEn: isArabic ? "وصف SEO (EN)" : "SEO Description (EN)",
    seoDescriptionAr: isArabic ? "وصف SEO (AR)" : "SEO Description (AR)",
    keywordsEn: isArabic ? "كلمات مفتاحية (EN)" : "Keywords (EN)",
    keywordsAr: isArabic ? "كلمات مفتاحية (AR)" : "Keywords (AR)",
    advanced: isArabic ? "إعدادات متقدمة" : "Advanced Settings",
    canonicalUrl: isArabic ? "Canonical URL" : "Canonical URL",
    ogImage: isArabic ? "رابط صورة OG" : "OG Image URL",
    cssClass: isArabic ? "CSS Class مخصص" : "Custom CSS Class",
    notes: isArabic ? "ملاحظات داخلية" : "Internal Notes",
    routeTemplate: isArabic ? "قالب المسار" : "Route Template",
    group: isArabic ? "المجموعة" : "Group",
    preview: isArabic ? "معاينة الصفحة" : "Page Preview",
    dynamicTemplate: isArabic ? "هذه صفحة قالب ديناميكي وتحتاج معرّفًا لعرضها." : "This is a dynamic template page and needs a real identifier to preview.",
    previewEnglish: isArabic ? "فتح النسخة الإنجليزية" : "Open English",
    previewArabic: isArabic ? "فتح النسخة العربية" : "Open Arabic",
  };

  const handleReset = () => {
    setSettings(defaults);
    setKeywordsEnText(keywordsToText(defaults.keywordsEn));
    setKeywordsArText(keywordsToText(defaults.keywordsAr));
    setError(null);
    setInfo(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const payload: SitePageSettings = {
        ...settings,
        keywordsEn: textToKeywords(keywordsEnText),
        keywordsAr: textToKeywords(keywordsArText),
      };

      const response = await fetch(`/api/admin/pages/${page.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        settings?: SitePageSettings;
        error?: string;
      };

      if (!response.ok || !data.settings) {
        throw new Error(data.error || t.saveError);
      }

      setSettings(data.settings);
      setKeywordsEnText(keywordsToText(data.settings.keywordsEn));
      setKeywordsArText(keywordsToText(data.settings.keywordsAr));
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.pageSettings}</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {page.nameEn} / {page.nameAr}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {isArabic ? page.descriptionAr : page.descriptionEn}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/pages`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiArrowLeft className="size-4" />
            {t.back}
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiRefreshCw className="size-4" />
            {t.reset}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <FiSave className="size-4" />
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.pageSettings}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.visibility}</span>
            <select
              value={settings.visibility}
              onChange={(event) => setSettings((prev) => ({ ...prev, visibility: event.target.value as SitePageSettings["visibility"] }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="PUBLISHED">{t.published}</option>
              <option value="DRAFT">{t.draft}</option>
              <option value="HIDDEN">{t.hidden}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.navPlacement}</span>
            <select
              value={settings.navPlacement}
              onChange={(event) => setSettings((prev) => ({ ...prev, navPlacement: event.target.value as SitePageSettings["navPlacement"] }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="PRIMARY">{t.primaryNav}</option>
              <option value="SECONDARY">{t.secondaryNav}</option>
              <option value="NONE">{t.noNav}</option>
            </select>
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
            <span className="text-zinc-700 dark:text-zinc-300">{t.footerVisible}</span>
            <input
              type="checkbox"
              checked={settings.footerVisible}
              onChange={(event) => setSettings((prev) => ({ ...prev, footerVisible: event.target.checked }))}
              className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
            <span className="text-zinc-700 dark:text-zinc-300">{t.indexable}</span>
            <input
              type="checkbox"
              checked={settings.indexable}
              onChange={(event) => setSettings((prev) => ({ ...prev, indexable: event.target.checked }))}
              className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.contentSection}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.headingEn}</span>
            <input
              value={settings.headingEn}
              onChange={(event) => setSettings((prev) => ({ ...prev, headingEn: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.headingAr}</span>
            <input
              value={settings.headingAr}
              onChange={(event) => setSettings((prev) => ({ ...prev, headingAr: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.subheadingEn}</span>
            <textarea
              rows={3}
              value={settings.subheadingEn}
              onChange={(event) => setSettings((prev) => ({ ...prev, subheadingEn: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.subheadingAr}</span>
            <textarea
              rows={3}
              value={settings.subheadingAr}
              onChange={(event) => setSettings((prev) => ({ ...prev, subheadingAr: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.seoSection}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.seoTitleEn}</span>
            <input
              value={settings.seoTitleEn}
              onChange={(event) => setSettings((prev) => ({ ...prev, seoTitleEn: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.seoTitleAr}</span>
            <input
              value={settings.seoTitleAr}
              onChange={(event) => setSettings((prev) => ({ ...prev, seoTitleAr: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.seoDescriptionEn}</span>
            <textarea
              rows={3}
              value={settings.seoDescriptionEn}
              onChange={(event) => setSettings((prev) => ({ ...prev, seoDescriptionEn: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.seoDescriptionAr}</span>
            <textarea
              rows={3}
              value={settings.seoDescriptionAr}
              onChange={(event) => setSettings((prev) => ({ ...prev, seoDescriptionAr: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.keywordsEn}</span>
            <input
              value={keywordsEnText}
              onChange={(event) => setKeywordsEnText(event.target.value)}
              placeholder="cooking, classes, noon"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.keywordsAr}</span>
            <input
              value={keywordsArText}
              onChange={(event) => setKeywordsArText(event.target.value)}
              placeholder="طبخ, دورات, نون"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.advanced}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.canonicalUrl}</span>
            <input
              value={settings.canonicalUrl}
              onChange={(event) => setSettings((prev) => ({ ...prev, canonicalUrl: event.target.value }))}
              placeholder="https://noonomanarts.com/en/about"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.ogImage}</span>
            <input
              value={settings.ogImage}
              onChange={(event) => setSettings((prev) => ({ ...prev, ogImage: event.target.value }))}
              placeholder="https://noonomanarts.com/images/og-about.jpg"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-zinc-600 dark:text-zinc-300">{t.cssClass}</span>
            <input
              value={settings.customCssClass}
              onChange={(event) => setSettings((prev) => ({ ...prev, customCssClass: event.target.value }))}
              placeholder="about-page-v2"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-zinc-600 dark:text-zinc-300">{t.notes}</span>
            <textarea
              rows={4}
              value={settings.notes}
              onChange={(event) => setSettings((prev) => ({ ...prev, notes: event.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.preview}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.routeTemplate}</p>
            <p className="mt-1 font-mono text-sm text-zinc-800 dark:text-zinc-100">{page.pathTemplate}</p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t.group}: {page.group}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            {isDynamic ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{t.dynamicTemplate}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={previewEn}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <FiExternalLink className="size-4" />
                  {t.previewEnglish}
                </Link>
                <Link
                  href={previewAr}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <FiExternalLink className="size-4" />
                  {t.previewArabic}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
