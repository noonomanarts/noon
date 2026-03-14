"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiArrowDown, FiArrowLeft, FiArrowUp, FiExternalLink, FiPlus, FiRefreshCw, FiSave, FiTrash2, FiUpload } from "react-icons/fi";

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

const NOON_HERO_BUTTON_COLORS = [
  "#f77d6b",
  "#ef6b58",
  "#f2cb56",
  "#e8be40",
  "#7b3f8d",
  "#6a347b",
  "#17b0ad",
  "#109d9a",
] as const;

function normalizeHexColor(value: string, fallback: string): string {
  const input = value.trim().toLowerCase();
  const match = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return fallback;

  if (match[1].length === 3) {
    const [r, g, b] = match[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return input;
}

function getReadableTextColor(hex: string): "#ffffff" | "#23150f" {
  const normalized = normalizeHexColor(hex, "#000000");
  const raw = normalized.slice(1);
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#23150f" : "#ffffff";
}

function resolvePreviewHref(locale: Locale, value: string, fallback: string): string {
  const normalized = value.trim();
  if (!normalized) return `/${locale}${fallback}`;
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(normalized)) return normalized;
  if (/^\/(en|ar)(?=\/|$)/.test(normalized)) return normalized;
  if (normalized.startsWith("/")) return `/${locale}${normalized}`;
  return `/${locale}${fallback}`;
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
  const [uploadingSlideKey, setUploadingSlideKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const defaults = useMemo(() => getDefaultSitePageSettings(page), [page]);
  const isDynamic = isDynamicPathTemplate(page.pathTemplate);
  const isHomePage = page.key === "home";
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
    heroSection: isArabic ? "إعدادات الهيرو (الصفحة الرئيسية)" : "Hero Settings (Home Page)",
    heroHint: isArabic
      ? "العنوان في قسم المحتوى أعلاه يظهر مباشرة في هيرو الصفحة الرئيسية."
      : "The heading in the content section above is used directly in the home hero.",
    heroPrimaryCtaEn: isArabic ? "زر رئيسي (EN)" : "Primary CTA (EN)",
    heroPrimaryCtaAr: isArabic ? "زر رئيسي (AR)" : "Primary CTA (AR)",
    heroSecondaryCtaEn: isArabic ? "زر ثانوي (EN)" : "Secondary CTA (EN)",
    heroSecondaryCtaAr: isArabic ? "زر ثانوي (AR)" : "Secondary CTA (AR)",
    heroPrimaryLink: isArabic ? "رابط الزر الرئيسي" : "Primary Button Link",
    heroSecondaryLink: isArabic ? "رابط الزر الثانوي" : "Secondary Button Link",
    heroPrimaryColor: isArabic ? "لون الزر الرئيسي" : "Primary Button Color",
    heroSecondaryColor: isArabic ? "لون الزر الثانوي" : "Secondary Button Color",
    heroPrimaryButton: isArabic ? "إعدادات الزر الرئيسي" : "Primary Button Setup",
    heroSecondaryButton: isArabic ? "إعدادات الزر الثانوي" : "Secondary Button Setup",
    heroColorPicker: isArabic ? "منتقي اللون" : "Color Picker",
    heroCtaHint: isArabic
      ? "يمكنك وضع مسار داخلي مثل /classes/cooking أو رابط خارجي كامل."
      : "Use an internal path like /classes/cooking or a full external URL.",
    heroPreviewTitle: isArabic ? "معاينة مصغرة للهيرو" : "Hero Mini Preview",
    heroPreviewHint: isArabic
      ? "هذه معاينة سريعة للشكل النهائي للدكّتين على الهيرو."
      : "A quick visual preview of how both hero buttons will appear.",
    heroSlides: isArabic ? "صور السلايدشو" : "Slideshow Images",
    heroSlidesHint: isArabic
      ? "يمكنك تعديل الرابط، حذف الصورة، تغيير ترتيبها، أو رفع صور جديدة."
      : "You can edit the path, delete, reorder, or upload new slides.",
    heroSlidesEmpty: isArabic ? "لا توجد صور حالياً. ارفع أول صورة أو أضف رابطاً." : "No slides yet. Upload the first image or add a path.",
    heroSlidePath: isArabic ? "مسار الصورة" : "Image Path",
    heroAddSlide: isArabic ? "إضافة مسار فارغ" : "Add Empty Slide",
    heroUploadSlides: isArabic ? "رفع صور" : "Upload Images",
    heroReplaceImage: isArabic ? "استبدال" : "Replace",
    heroRemoveImage: isArabic ? "حذف" : "Remove",
    heroMoveUp: isArabic ? "أعلى" : "Up",
    heroMoveDown: isArabic ? "أسفل" : "Down",
    heroUploadDone: isArabic ? "تم رفع صور الهيرو بنجاح." : "Hero slides uploaded successfully.",
    heroUploadFailed: isArabic ? "فشل رفع صور الهيرو." : "Failed to upload hero slides.",
    heroUploading: isArabic ? "جارٍ الرفع..." : "Uploading...",
    heroAutoplayMs: isArabic ? "سرعة السلايدشو (ms)" : "Slideshow Speed (ms)",
    heroAutoplayHint: isArabic ? "من 2000 إلى 12000 مللي ثانية." : "Between 2000 and 12000 ms.",
    homeLayoutSection: isArabic ? "تخطيط الصفحة الرئيسية" : "Home Layout",
    homeLayoutHint: isArabic
      ? "تحكم بإظهار أقسام الصفحة الرئيسية من مكان واحد."
      : "Control homepage sections visibility in one place.",
    showHero: isArabic ? "إظهار الهيرو" : "Show Hero",
    showCourses: isArabic ? "إظهار قسم الدورات" : "Show Courses Section",
    showNumbers: isArabic ? "إظهار قسم الأرقام" : "Show Numbers Section",
    showUpcoming: isArabic ? "إظهار قسم الدورات القادمة" : "Show Upcoming Section",
    showWhyNoon: isArabic ? "إظهار قسم لماذا نون" : "Show Why Noon Section",
    showPartners: isArabic ? "إظهار قسم الشركاء" : "Show Partners Section",
    routeTemplate: isArabic ? "قالب المسار" : "Route Template",
    group: isArabic ? "المجموعة" : "Group",
    preview: isArabic ? "معاينة الصفحة" : "Page Preview",
    dynamicTemplate: isArabic ? "هذه صفحة قالب ديناميكي وتحتاج معرّفًا لعرضها." : "This is a dynamic template page and needs a real identifier to preview.",
    previewEnglish: isArabic ? "فتح النسخة الإنجليزية" : "Open English",
    previewArabic: isArabic ? "فتح النسخة العربية" : "Open Arabic",
  };

  const heroPreviewHeading = (isArabic ? settings.headingAr : settings.headingEn).trim() || (isArabic ? "شعار الموقع" : "Main Site Slogan");
  const heroPrimaryLabel = (isArabic ? settings.homeHero.primaryCtaAr : settings.homeHero.primaryCtaEn).trim() || (isArabic ? "زر رئيسي" : "Primary");
  const heroSecondaryLabel = (isArabic ? settings.homeHero.secondaryCtaAr : settings.homeHero.secondaryCtaEn).trim() || (isArabic ? "زر ثانوي" : "Secondary");
  const heroPrimaryColor = normalizeHexColor(settings.homeHero.primaryCtaColor, "#f77d6b");
  const heroSecondaryColor = normalizeHexColor(settings.homeHero.secondaryCtaColor, "#17b0ad");
  const heroPrimaryPreviewHref = resolvePreviewHref(locale, settings.homeHero.primaryCtaHref, "/classes/cooking");
  const heroSecondaryPreviewHref = resolvePreviewHref(locale, settings.homeHero.secondaryCtaHref, "/classes/arts-crafts");

  const handleReset = () => {
    setSettings(defaults);
    setKeywordsEnText(keywordsToText(defaults.keywordsEn));
    setKeywordsArText(keywordsToText(defaults.keywordsAr));
    setError(null);
    setInfo(null);
  };

  const setHomeSlides = (nextSlides: string[]) => {
    setSettings((prev) => ({
      ...prev,
      homeHero: {
        ...prev.homeHero,
        slideImages: nextSlides.slice(0, 12),
      },
    }));
  };

  const handleSlidePathChange = (index: number, value: string) => {
    const next = [...settings.homeHero.slideImages];
    next[index] = value;
    setHomeSlides(next);
  };

  const handleSlideMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= settings.homeHero.slideImages.length) return;
    const next = [...settings.homeHero.slideImages];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setHomeSlides(next);
  };

  const handleSlideRemove = (index: number) => {
    const next = settings.homeHero.slideImages.filter((_, idx) => idx !== index);
    setHomeSlides(next);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "home-hero-slides");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || t.heroUploadFailed);
    }

    return payload.url;
  };

  const handleUploadAppend = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingSlideKey("append");
    setError(null);
    setInfo(null);

    try {
      const availableSlots = Math.max(0, 12 - settings.homeHero.slideImages.length);
      const selectedFiles = Array.from(files).slice(0, availableSlots);
      const uploadedUrls = await Promise.all(selectedFiles.map((file) => uploadImage(file)));
      setHomeSlides([...settings.homeHero.slideImages, ...uploadedUrls]);
      setInfo(t.heroUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.heroUploadFailed);
    } finally {
      setUploadingSlideKey(null);
    }
  };

  const handleUploadReplace = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadingSlideKey(`replace-${index}`);
    setError(null);
    setInfo(null);

    try {
      const url = await uploadImage(file);
      const next = [...settings.homeHero.slideImages];
      next[index] = url;
      setHomeSlides(next);
      setInfo(t.heroUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.heroUploadFailed);
    } finally {
      setUploadingSlideKey(null);
    }
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
        homeHero: {
          ...settings.homeHero,
          slideImages: settings.homeHero.slideImages
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 12),
        },
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
          {!isHomePage && (
            <>
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
            </>
          )}
        </div>
      </section>

      {isHomePage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.heroSection}</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.heroHint}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.heroPrimaryCtaEn}</span>
              <input
                value={settings.homeHero.primaryCtaEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeHero: { ...prev.homeHero, primaryCtaEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.heroPrimaryCtaAr}</span>
              <input
                value={settings.homeHero.primaryCtaAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeHero: { ...prev.homeHero, primaryCtaAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.heroSecondaryCtaEn}</span>
              <input
                value={settings.homeHero.secondaryCtaEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeHero: { ...prev.homeHero, secondaryCtaEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.heroSecondaryCtaAr}</span>
              <input
                value={settings.homeHero.secondaryCtaAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeHero: { ...prev.homeHero, secondaryCtaAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <div className="grid gap-4 md:col-span-2 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.heroPrimaryButton}</h3>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.heroPrimaryLink}</span>
                  <input
                    value={settings.homeHero.primaryCtaHref}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        homeHero: { ...prev.homeHero, primaryCtaHref: event.target.value },
                      }))
                    }
                    placeholder="/classes/cooking"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.heroColorPicker}</span>
                    <input
                      type="color"
                      value={heroPrimaryColor}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, primaryCtaColor: normalizeHexColor(event.target.value, "#f77d6b") },
                        }))
                      }
                      className="h-10 w-16 cursor-pointer border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.heroPrimaryColor}</span>
                    <input
                      value={settings.homeHero.primaryCtaColor}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, primaryCtaColor: event.target.value },
                        }))
                      }
                      onBlur={() =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: {
                            ...prev.homeHero,
                            primaryCtaColor: normalizeHexColor(prev.homeHero.primaryCtaColor, "#f77d6b"),
                          },
                        }))
                      }
                      placeholder="#f77d6b"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {NOON_HERO_BUTTON_COLORS.map((color) => (
                    <button
                      key={`primary-cta-color-${color}`}
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, primaryCtaColor: color },
                        }))
                      }
                      className={`h-8 border transition ${
                        heroPrimaryColor === color
                          ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/30"
                          : "border-black/10 hover:border-black/35 dark:border-white/15 dark:hover:border-white/40"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.heroSecondaryButton}</h3>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.heroSecondaryLink}</span>
                  <input
                    value={settings.homeHero.secondaryCtaHref}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        homeHero: { ...prev.homeHero, secondaryCtaHref: event.target.value },
                      }))
                    }
                    placeholder="/classes/arts-crafts"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.heroColorPicker}</span>
                    <input
                      type="color"
                      value={heroSecondaryColor}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, secondaryCtaColor: normalizeHexColor(event.target.value, "#17b0ad") },
                        }))
                      }
                      className="h-10 w-16 cursor-pointer border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.heroSecondaryColor}</span>
                    <input
                      value={settings.homeHero.secondaryCtaColor}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, secondaryCtaColor: event.target.value },
                        }))
                      }
                      onBlur={() =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: {
                            ...prev.homeHero,
                            secondaryCtaColor: normalizeHexColor(prev.homeHero.secondaryCtaColor, "#17b0ad"),
                          },
                        }))
                      }
                      placeholder="#17b0ad"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {NOON_HERO_BUTTON_COLORS.map((color) => (
                    <button
                      key={`secondary-cta-color-${color}`}
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          homeHero: { ...prev.homeHero, secondaryCtaColor: color },
                        }))
                      }
                      className={`h-8 border transition ${
                        heroSecondaryColor === color
                          ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/30"
                          : "border-black/10 hover:border-black/35 dark:border-white/15 dark:hover:border-white/40"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.heroCtaHint}</p>
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.heroPreviewTitle}</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.heroPreviewHint}</p>
              </div>
              <div className="relative overflow-hidden border border-zinc-200 bg-zinc-900/80 p-5 dark:border-zinc-700">
                {settings.homeHero.slideImages[0]?.trim() ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-35"
                    style={{ backgroundImage: `url("${settings.homeHero.slideImages[0]}")` }}
                    aria-hidden="true"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 to-black/70" aria-hidden="true" />
                <div className="relative space-y-4">
                  <h3 className="line-clamp-2 text-2xl font-black leading-tight text-white">
                    {heroPreviewHeading}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className="inline-flex min-h-11 items-center justify-center px-4 py-3 text-center text-sm font-extrabold"
                      style={{
                        backgroundColor: heroPrimaryColor,
                        color: getReadableTextColor(heroPrimaryColor),
                      }}
                    >
                      {heroPrimaryLabel}
                    </div>
                    <div
                      className="inline-flex min-h-11 items-center justify-center px-4 py-3 text-center text-sm font-extrabold"
                      style={{
                        backgroundColor: heroSecondaryColor,
                        color: getReadableTextColor(heroSecondaryColor),
                      }}
                    >
                      {heroSecondaryLabel}
                    </div>
                  </div>
                  <div className="grid gap-2 text-[11px] text-white/85 sm:grid-cols-2">
                    <code className="truncate bg-black/35 px-2 py-1">{heroPrimaryPreviewHref}</code>
                    <code className="truncate bg-black/35 px-2 py-1">{heroSecondaryPreviewHref}</code>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">{t.heroSlides}</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setHomeSlides([...settings.homeHero.slideImages, ""])}
                    disabled={settings.homeHero.slideImages.length >= 12}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <FiPlus className="size-3.5" />
                    {t.heroAddSlide}
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                    <FiUpload className="size-3.5" />
                    {uploadingSlideKey === "append" ? t.heroUploading : t.heroUploadSlides}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingSlideKey !== null || settings.homeHero.slideImages.length >= 12}
                      onChange={(event) => {
                        void handleUploadAppend(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.heroSlidesHint}</p>

              {settings.homeHero.slideImages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  {t.heroSlidesEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.homeHero.slideImages.map((slide, index) => (
                    <div
                      key={`hero-slide-${index}`}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-800/40"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative h-24 w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 sm:w-36 dark:border-zinc-700 dark:bg-zinc-800">
                          {slide.trim() ? (
                            <div
                              className="h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url("${slide}")` }}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                              {isArabic ? "بدون صورة" : "No image"}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <label className="block space-y-1 text-sm">
                            <span className="text-zinc-600 dark:text-zinc-300">{t.heroSlidePath}</span>
                            <input
                              value={slide}
                              onChange={(event) => handleSlidePathChange(index, event.target.value)}
                              placeholder="/images/slides/1.jpg"
                              className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleSlideMove(index, -1)}
                              disabled={index === 0}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              <FiArrowUp className="size-3.5" />
                              {t.heroMoveUp}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSlideMove(index, 1)}
                              disabled={index === settings.homeHero.slideImages.length - 1}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              <FiArrowDown className="size-3.5" />
                              {t.heroMoveDown}
                            </button>
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              <FiUpload className="size-3.5" />
                              {uploadingSlideKey === `replace-${index}` ? t.heroUploading : t.heroReplaceImage}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingSlideKey !== null}
                                onChange={(event) => {
                                  void handleUploadReplace(index, event.target.files?.[0] ?? null);
                                  event.currentTarget.value = "";
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSlideRemove(index)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                            >
                              <FiTrash2 className="size-3.5" />
                              {t.heroRemoveImage}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-zinc-600 dark:text-zinc-300">{t.heroAutoplayMs}</span>
              <input
                type="number"
                min={2000}
                max={12000}
                step={100}
                value={settings.homeHero.autoplayMs}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeHero: {
                      ...prev.homeHero,
                      autoplayMs: Number(event.target.value) || prev.homeHero.autoplayMs,
                    },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.heroAutoplayHint}</p>
            </label>
          </div>
        </section>
      )}

      {isHomePage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.homeLayoutSection}</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.homeLayoutHint}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <span className="text-zinc-700 dark:text-zinc-300">{t.showHero}</span>
              <input
                type="checkbox"
                checked={settings.homeLayout.showHero}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeLayout: { ...prev.homeLayout, showHero: event.target.checked },
                  }))
                }
                className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <span className="text-zinc-700 dark:text-zinc-300">{t.showCourses}</span>
              <input
                type="checkbox"
                checked={settings.homeLayout.showCourses}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeLayout: { ...prev.homeLayout, showCourses: event.target.checked },
                  }))
                }
                className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <span className="text-zinc-700 dark:text-zinc-300">{t.showNumbers}</span>
              <input
                type="checkbox"
                checked={settings.homeLayout.showNumbers}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeLayout: { ...prev.homeLayout, showNumbers: event.target.checked },
                  }))
                }
                className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <span className="text-zinc-700 dark:text-zinc-300">{t.showUpcoming}</span>
              <input
                type="checkbox"
                checked={settings.homeLayout.showUpcoming}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeLayout: { ...prev.homeLayout, showUpcoming: event.target.checked },
                  }))
                }
                className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <span className="text-zinc-700 dark:text-zinc-300">{t.showWhyNoon}</span>
              <input
                type="checkbox"
                checked={settings.homeLayout.showWhyNoon}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeLayout: { ...prev.homeLayout, showWhyNoon: event.target.checked },
                  }))
                }
                className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <span className="text-zinc-700 dark:text-zinc-300">{t.showPartners}</span>
              <input
                type="checkbox"
                checked={settings.homeLayout.showPartners}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeLayout: { ...prev.homeLayout, showPartners: event.target.checked },
                  }))
                }
                className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
              />
            </label>
          </div>
        </section>
      )}

      {!isHomePage && (
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
      )}

      {!isHomePage && (
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
      )}

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
