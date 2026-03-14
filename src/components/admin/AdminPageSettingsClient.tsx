"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiArrowDown, FiArrowLeft, FiArrowUp, FiExternalLink, FiPenTool, FiPlus, FiRefreshCw, FiSave, FiScissors, FiTrash2, FiUpload } from "react-icons/fi";
import { GiChefToque, GiCookingPot, GiKnifeFork, GiPalette } from "react-icons/gi";

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

const COOKING_ICON_OPTIONS = [
  { value: "cooking-pot", labelEn: "Cooking Pot", labelAr: "قدر الطبخ" },
  { value: "chef-hat", labelEn: "Chef Hat", labelAr: "قبعة الشيف" },
  { value: "utensils", labelEn: "Utensils", labelAr: "أدوات المطبخ" },
] as const;

const ARTS_ICON_OPTIONS = [
  { value: "palette", labelEn: "Palette", labelAr: "لوحة ألوان" },
  { value: "craft", labelEn: "Craft", labelAr: "حرفي" },
  { value: "brush", labelEn: "Brush", labelAr: "فرشاة" },
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

function renderCourseIconPreview(icon: string, type: "cooking" | "arts", className: string) {
  if (type === "cooking") {
    if (icon === "chef-hat") return <GiChefToque className={className} />;
    if (icon === "utensils") return <GiKnifeFork className={className} />;
    return <GiCookingPot className={className} />;
  }

  if (icon === "craft") return <FiScissors className={className} />;
  if (icon === "brush") return <FiPenTool className={className} />;
  return <GiPalette className={className} />;
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
  const [uploadingHeroMedia, setUploadingHeroMedia] = useState(false);
  const [uploadingCourseImageKey, setUploadingCourseImageKey] = useState<"cooking" | "arts" | null>(null);
  const [uploadingPartnerLogoIndex, setUploadingPartnerLogoIndex] = useState<number | null>(null);
  const [uploadingUpcomingImageIndex, setUploadingUpcomingImageIndex] = useState<number | null>(null);
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
      ? "معاينة سريعة لشكل الخلفية وأزرار الهيرو."
      : "Quick preview for hero background media and CTA buttons.",
    heroMediaType: isArabic ? "نوع خلفية الهيرو" : "Hero Background Type",
    heroMediaTypeImage: isArabic ? "صورة" : "Image",
    heroMediaTypeVideo: isArabic ? "فيديو" : "Video",
    heroSlides: isArabic ? "خلفية الهيرو (صورة أو فيديو)" : "Hero Background (Image or Video)",
    heroSlidesHint: isArabic
      ? "اختر نوع الخلفية أولاً (صورة أو فيديو)، ثم ارفع الملف أو أدخل المسار. الهيرو سيعرض النوع المختار فقط."
      : "Choose the background type first (image or video), then upload or set a path. Hero will render only the selected type.",
    heroSlidesEmpty: isArabic ? "لا توجد وسائط حالياً. ارفع صورة أو أضف مسار ملف." : "No media yet. Upload an image or add a media path.",
    heroSlidePath: isArabic ? "مسار الوسائط" : "Media Path",
    heroImagePath: isArabic ? "مسار صورة الخلفية" : "Background Image Path",
    heroVideoPath: isArabic ? "مسار فيديو الخلفية" : "Background Video Path",
    heroUploadSlides: isArabic ? "رفع وسائط" : "Upload Media",
    heroReplaceImage: isArabic ? "تغيير الوسائط" : "Change Media",
    heroRemoveImage: isArabic ? "حذف الوسائط" : "Remove Media",
    heroUploadDone: isArabic ? "تم تحديث خلفية الهيرو بنجاح." : "Hero background updated successfully.",
    heroUploadFailed: isArabic ? "فشل رفع وسائط الهيرو." : "Failed to upload hero media.",
    heroUploading: isArabic ? "جارٍ رفع الوسائط..." : "Uploading media...",
    heroAutoplayMs: isArabic ? "سرعة السلايدشو (ms)" : "Slideshow Speed (ms)",
    heroAutoplayHint: isArabic ? "من 2000 إلى 12000 مللي ثانية." : "Between 2000 and 12000 ms.",
    homeCoursesSection: isArabic ? "إعدادات قسم الدورات" : "Courses Section Settings",
    homeCoursesHint: isArabic
      ? "تحكم بعنوان القسم، الوصف، ونصوص الكروت. روابط الصور تبقى قابلة للتعديل من هنا."
      : "Configure section title, subtitle, and card copy. Image paths remain editable here.",
    coursesTitleEn: isArabic ? "عنوان القسم (EN)" : "Section Title (EN)",
    coursesTitleAr: isArabic ? "عنوان القسم (AR)" : "Section Title (AR)",
    coursesSubtitleEn: isArabic ? "وصف القسم (EN)" : "Section Subtitle (EN)",
    coursesSubtitleAr: isArabic ? "وصف القسم (AR)" : "Section Subtitle (AR)",
    cookingCardTitleEn: isArabic ? "عنوان بطاقة الطبخ (EN)" : "Cooking Card Title (EN)",
    cookingCardTitleAr: isArabic ? "عنوان بطاقة الطبخ (AR)" : "Cooking Card Title (AR)",
    cookingCardDescEn: isArabic ? "وصف بطاقة الطبخ (EN)" : "Cooking Card Description (EN)",
    cookingCardDescAr: isArabic ? "وصف بطاقة الطبخ (AR)" : "Cooking Card Description (AR)",
    artsCardTitleEn: isArabic ? "عنوان بطاقة الفنون (EN)" : "Arts Card Title (EN)",
    artsCardTitleAr: isArabic ? "عنوان بطاقة الفنون (AR)" : "Arts Card Title (AR)",
    artsCardDescEn: isArabic ? "وصف بطاقة الفنون (EN)" : "Arts Card Description (EN)",
    artsCardDescAr: isArabic ? "وصف بطاقة الفنون (AR)" : "Arts Card Description (AR)",
    cookingImagePath: isArabic ? "مسار صورة الطبخ" : "Cooking Image Path",
    artsImagePath: isArabic ? "مسار صورة الفنون" : "Arts Image Path",
    cardDisplayMode: isArabic ? "طريقة العرض" : "Display Mode",
    displayIcon: isArabic ? "أيقونة" : "Icon",
    displayImage: isArabic ? "صورة" : "Image",
    cardIconChoice: isArabic ? "اختيار الأيقونة" : "Select Icon",
    cardImageUpload: isArabic ? "رفع صورة" : "Upload Image",
    cardPreview: isArabic ? "معاينة البطاقة" : "Card Preview",
    cardImageUploading: isArabic ? "جارٍ الرفع..." : "Uploading...",
    cardImageUploadDone: isArabic ? "تم رفع الصورة." : "Image uploaded successfully.",
    cardImageUploadFailed: isArabic ? "فشل رفع الصورة." : "Image upload failed.",
    cardImagePlaceholder: isArabic ? "لا توجد صورة" : "No image",
    homeUpcomingSection: isArabic ? "إعدادات قسم الدورات القادمة" : "Upcoming Classes Section Settings",
    homeUpcomingHint: isArabic
      ? "حرر عنوان القسم، الوصف، نص الزر، وأضف عددًا غير محدود من البطاقات."
      : "Configure section title, subtitle, button label, and manage unlimited upcoming cards.",
    upcomingTitleEn: isArabic ? "عنوان القسم (EN)" : "Section Title (EN)",
    upcomingTitleAr: isArabic ? "عنوان القسم (AR)" : "Section Title (AR)",
    upcomingDescriptionEn: isArabic ? "الوصف (EN)" : "Description (EN)",
    upcomingDescriptionAr: isArabic ? "الوصف (AR)" : "Description (AR)",
    upcomingBookNowLabelEn: isArabic ? "نص الزر (EN)" : "Button Label (EN)",
    upcomingBookNowLabelAr: isArabic ? "نص الزر (AR)" : "Button Label (AR)",
    upcomingCard: isArabic ? "بطاقة دورة" : "Upcoming Card",
    upcomingCardTitleEn: isArabic ? "العنوان (EN)" : "Title (EN)",
    upcomingCardTitleAr: isArabic ? "العنوان (AR)" : "Title (AR)",
    upcomingCardDatetimeEn: isArabic ? "الوقت/التاريخ (EN)" : "Datetime (EN)",
    upcomingCardDatetimeAr: isArabic ? "الوقت/التاريخ (AR)" : "Datetime (AR)",
    upcomingCardPriceEn: isArabic ? "السعر (EN)" : "Price (EN)",
    upcomingCardPriceAr: isArabic ? "السعر (AR)" : "Price (AR)",
    upcomingCardImagePath: isArabic ? "مسار الصورة" : "Image Path",
    upcomingCardLink: isArabic ? "رابط الحجز" : "Booking Link",
    upcomingAdd: isArabic ? "إضافة بطاقة" : "Add Card",
    upcomingRemove: isArabic ? "حذف البطاقة" : "Remove Card",
    upcomingMoveUp: isArabic ? "أعلى" : "Up",
    upcomingMoveDown: isArabic ? "أسفل" : "Down",
    upcomingImageUpload: isArabic ? "رفع صورة" : "Upload Image",
    upcomingImageUploading: isArabic ? "جارٍ رفع الصورة..." : "Uploading image...",
    upcomingImageUploadDone: isArabic ? "تم رفع صورة الدورة." : "Upcoming image uploaded successfully.",
    upcomingImageUploadFailed: isArabic ? "فشل رفع صورة الدورة." : "Failed to upload upcoming image.",
    upcomingListEmpty: isArabic ? "لا توجد بطاقات حالياً. أضف أول بطاقة." : "No cards yet. Add your first card.",
    homeWhyNoonSection: isArabic ? "إعدادات قسم لماذا نون" : "Why Noon Section Settings",
    homeWhyNoonHint: isArabic
      ? "تحكم بعنوان القسم، الوصف، وبطاقات لماذا نون."
      : "Configure section heading, description, and Why Noon cards.",
    whyNoonTitleEn: isArabic ? "العنوان (EN)" : "Title (EN)",
    whyNoonTitleAr: isArabic ? "العنوان (AR)" : "Title (AR)",
    whyNoonDescriptionEn: isArabic ? "الوصف (EN)" : "Description (EN)",
    whyNoonDescriptionAr: isArabic ? "الوصف (AR)" : "Description (AR)",
    whyNoonCard: isArabic ? "بطاقة سبب" : "Reason Card",
    whyNoonCardTitleEn: isArabic ? "عنوان البطاقة (EN)" : "Card Title (EN)",
    whyNoonCardTitleAr: isArabic ? "عنوان البطاقة (AR)" : "Card Title (AR)",
    whyNoonCardDescriptionEn: isArabic ? "وصف البطاقة (EN)" : "Card Description (EN)",
    whyNoonCardDescriptionAr: isArabic ? "وصف البطاقة (AR)" : "Card Description (AR)",
    homePartnersSection: isArabic ? "إعدادات قسم الشركاء" : "Partners Section Settings",
    homePartnersHint: isArabic
      ? "حرر نص القسم وأسماء الشركاء وارفع شعاراتهم."
      : "Edit section copy, partner names, and upload partner logos.",
    partnersTitleEn: isArabic ? "العنوان (EN)" : "Title (EN)",
    partnersTitleAr: isArabic ? "العنوان (AR)" : "Title (AR)",
    partnersDescriptionEn: isArabic ? "الوصف (EN)" : "Description (EN)",
    partnersDescriptionAr: isArabic ? "الوصف (AR)" : "Description (AR)",
    partnerCard: isArabic ? "بطاقة شريك" : "Partner Card",
    partnerNameEn: isArabic ? "اسم الشريك (EN)" : "Partner Name (EN)",
    partnerNameAr: isArabic ? "اسم الشريك (AR)" : "Partner Name (AR)",
    partnerLogoPath: isArabic ? "رابط الشعار" : "Logo Path",
    partnerLogoUpload: isArabic ? "رفع شعار" : "Upload Logo",
    partnerLogoUploading: isArabic ? "جارٍ رفع الشعار..." : "Uploading logo...",
    partnerLogoUploadDone: isArabic ? "تم رفع شعار الشريك." : "Partner logo uploaded successfully.",
    partnerLogoUploadFailed: isArabic ? "فشل رفع شعار الشريك." : "Failed to upload partner logo.",
    partnerLogoPreview: isArabic ? "معاينة الشعار" : "Logo Preview",
    partnerLogoRemove: isArabic ? "حذف الشعار" : "Remove Logo",
    partnerAdd: isArabic ? "إضافة شريك" : "Add Partner",
    partnerRemove: isArabic ? "حذف الشريك" : "Remove Partner",
    partnerMoveUp: isArabic ? "أعلى" : "Up",
    partnerMoveDown: isArabic ? "أسفل" : "Down",
    partnerListEmpty: isArabic ? "لا يوجد شركاء بعد. أضف أول شريك." : "No partners yet. Add your first partner.",
    homeNumbersSection: isArabic ? "إعدادات قسم الأرقام" : "Numbers Section Settings",
    homeNumbersHint: isArabic
      ? "يمكنك تعديل عنوان القسم والأرقام الأربع المعروضة فوق الفوتر في الصفحة الرئيسية."
      : "Edit the section heading and four metrics shown above the footer on the homepage.",
    numbersTitleEn: isArabic ? "عنوان القسم (EN)" : "Section Title (EN)",
    numbersTitleAr: isArabic ? "عنوان القسم (AR)" : "Section Title (AR)",
    metricCard: isArabic ? "بطاقة رقم" : "Metric Card",
    metricValueEn: isArabic ? "القيمة (EN)" : "Value (EN)",
    metricValueAr: isArabic ? "القيمة (AR)" : "Value (AR)",
    metricLabelEn: isArabic ? "الوصف (EN)" : "Label (EN)",
    metricLabelAr: isArabic ? "الوصف (AR)" : "Label (AR)",
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
  const heroMediaType = settings.homeHero.backgroundMediaType ?? "image";
  const heroImageSrc = settings.homeHero.backgroundImageSrc?.trim() ?? "";
  const heroVideoSrc = settings.homeHero.backgroundVideoSrc?.trim() ?? "";
  const heroMediaIsVideo = heroMediaType === "video";
  const heroMediaSrc = heroMediaIsVideo ? heroVideoSrc : heroImageSrc;
  const cookingPreviewTitle = (isArabic ? settings.homeCourses.cookingTitleAr : settings.homeCourses.cookingTitleEn).trim() || (isArabic ? "دورات الطبخ" : "Cooking classes");
  const artsPreviewTitle = (isArabic ? settings.homeCourses.artsTitleAr : settings.homeCourses.artsTitleEn).trim() || (isArabic ? "دورات الفنون" : "Arts & crafts classes");

  const handleReset = () => {
    setSettings(defaults);
    setKeywordsEnText(keywordsToText(defaults.keywordsEn));
    setKeywordsArText(keywordsToText(defaults.keywordsAr));
    setError(null);
    setInfo(null);
  };

  const setHeroMediaType = (nextType: "image" | "video") => {
    setSettings((prev) => ({
      ...prev,
      homeHero: {
        ...prev.homeHero,
        backgroundMediaType: nextType,
      },
    }));
  };

  const setHeroImageSrc = (imageSrc: string) => {
    setSettings((prev) => ({
      ...prev,
      homeHero: {
        ...prev.homeHero,
        backgroundImageSrc: imageSrc,
        slideImages:
          (prev.homeHero.backgroundMediaType ?? "image") === "image" && imageSrc.trim()
            ? [imageSrc.trim()]
            : [],
      },
    }));
  };

  const setHeroVideoSrc = (videoSrc: string) => {
    setSettings((prev) => ({
      ...prev,
      homeHero: {
        ...prev.homeHero,
        backgroundVideoSrc: videoSrc,
        slideImages:
          (prev.homeHero.backgroundMediaType ?? "image") === "video" && videoSrc.trim()
            ? [videoSrc.trim()]
            : [],
      },
    }));
  };

  const setHomeNumberItem = (
    index: number,
    field: keyof SitePageSettings["homeNumbers"]["items"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      homeNumbers: {
        ...prev.homeNumbers,
        items: prev.homeNumbers.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const setHomeUpcomingItem = (
    index: number,
    field: keyof SitePageSettings["homeUpcoming"]["items"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      homeUpcoming: {
        ...prev.homeUpcoming,
        items: prev.homeUpcoming.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addHomeUpcomingItem = () => {
    setSettings((prev) => ({
      ...prev,
      homeUpcoming: {
        ...prev.homeUpcoming,
        items: [
          ...prev.homeUpcoming.items,
          {
            titleEn: "",
            titleAr: "",
            datetimeTextEn: "",
            datetimeTextAr: "",
            priceTextEn: "",
            priceTextAr: "",
            imageSrc: "",
            href: "/classes/cooking",
          },
        ],
      },
    }));
  };

  const removeHomeUpcomingItem = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      homeUpcoming: {
        ...prev.homeUpcoming,
        items: prev.homeUpcoming.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const moveHomeUpcomingItem = (index: number, direction: -1 | 1) => {
    setSettings((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.homeUpcoming.items.length) return prev;
      const next = [...prev.homeUpcoming.items];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);

      return {
        ...prev,
        homeUpcoming: {
          ...prev.homeUpcoming,
          items: next,
        },
      };
    });
  };

  const setHomeWhyNoonItem = (
    index: number,
    field: keyof SitePageSettings["homeWhyNoon"]["items"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      homeWhyNoon: {
        ...prev.homeWhyNoon,
        items: prev.homeWhyNoon.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const setHomePartnerItem = (
    index: number,
    field: keyof SitePageSettings["homePartners"]["items"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      homePartners: {
        ...prev.homePartners,
        items: prev.homePartners.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addHomePartnerItem = () => {
    setSettings((prev) => ({
      ...prev,
      homePartners: {
        ...prev.homePartners,
        items: [
          ...prev.homePartners.items,
          { nameEn: "", nameAr: "", logoSrc: "" },
        ],
      },
    }));
  };

  const removeHomePartnerItem = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      homePartners: {
        ...prev.homePartners,
        items: prev.homePartners.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const moveHomePartnerItem = (index: number, direction: -1 | 1) => {
    setSettings((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.homePartners.items.length) return prev;
      const next = [...prev.homePartners.items];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);

      return {
        ...prev,
        homePartners: {
          ...prev.homePartners,
          items: next,
        },
      };
    });
  };

  const uploadAsset = async (file: File, folder: string, fallbackError: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || fallbackError);
    }

    return payload.url;
  };

  const handleHeroMediaUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingHeroMedia(true);
    setError(null);
    setInfo(null);

    try {
      const activeType = settings.homeHero.backgroundMediaType ?? "image";
      const folder = activeType === "video" ? "home-hero-video" : "home-hero-image";
      const url = await uploadAsset(file, folder, t.heroUploadFailed);
      if (activeType === "video") {
        setHeroVideoSrc(url);
      } else {
        setHeroImageSrc(url);
      }
      setInfo(t.heroUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.heroUploadFailed);
    } finally {
      setUploadingHeroMedia(false);
    }
  };

  const handleCourseImageUpload = async (target: "cooking" | "arts", file: File | null) => {
    if (!file) return;
    setUploadingCourseImageKey(target);
    setError(null);
    setInfo(null);

    try {
      const url = await uploadAsset(file, "home-courses", t.cardImageUploadFailed);
      setSettings((prev) => ({
        ...prev,
        homeCourses: {
          ...prev.homeCourses,
          ...(target === "cooking" ? { cookingImageSrc: url } : { artsImageSrc: url }),
        },
      }));
      setInfo(t.cardImageUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.cardImageUploadFailed);
    } finally {
      setUploadingCourseImageKey(null);
    }
  };

  const handlePartnerLogoUpload = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadingPartnerLogoIndex(index);
    setError(null);
    setInfo(null);

    try {
      const url = await uploadAsset(file, "home-partners", t.partnerLogoUploadFailed);
      setSettings((prev) => ({
        ...prev,
        homePartners: {
          ...prev.homePartners,
          items: prev.homePartners.items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, logoSrc: url } : item
          ),
        },
      }));
      setInfo(t.partnerLogoUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.partnerLogoUploadFailed);
    } finally {
      setUploadingPartnerLogoIndex(null);
    }
  };

  const handleUpcomingImageUpload = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadingUpcomingImageIndex(index);
    setError(null);
    setInfo(null);

    try {
      const url = await uploadAsset(file, "home-upcoming", t.upcomingImageUploadFailed);
      setSettings((prev) => ({
        ...prev,
        homeUpcoming: {
          ...prev.homeUpcoming,
          items: prev.homeUpcoming.items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, imageSrc: url } : item
          ),
        },
      }));
      setInfo(t.upcomingImageUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.upcomingImageUploadFailed);
    } finally {
      setUploadingUpcomingImageIndex(null);
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
          backgroundMediaType: settings.homeHero.backgroundMediaType ?? "image",
          backgroundImageSrc: settings.homeHero.backgroundImageSrc.trim(),
          backgroundVideoSrc: settings.homeHero.backgroundVideoSrc.trim(),
          slideImages: [
            (settings.homeHero.backgroundMediaType ?? "image") === "video"
              ? settings.homeHero.backgroundVideoSrc.trim()
              : settings.homeHero.backgroundImageSrc.trim(),
          ].filter(Boolean),
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
                {heroMediaSrc ? (
                  heroMediaIsVideo ? (
                    <video
                      className="absolute inset-0 h-full w-full object-cover opacity-35"
                      src={heroMediaSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-35"
                      style={{ backgroundImage: `url("${heroMediaSrc}")` }}
                      aria-hidden="true"
                    />
                  )
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
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                    <FiUpload className="size-3.5" />
                    {uploadingHeroMedia ? t.heroUploading : heroMediaSrc ? t.heroReplaceImage : t.heroUploadSlides}
                    <input
                      type="file"
                      accept={heroMediaType === "video" ? "video/*" : "image/*"}
                      className="hidden"
                      disabled={uploadingHeroMedia}
                      onChange={(event) => {
                        void handleHeroMediaUpload(event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {heroMediaSrc ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (heroMediaType === "video") {
                          setHeroVideoSrc("");
                        } else {
                          setHeroImageSrc("");
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      <FiTrash2 className="size-3.5" />
                      {t.heroRemoveImage}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">{t.heroMediaType}</span>
                <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setHeroMediaType("image")}
                  className={`inline-flex items-center justify-center px-3 py-2 text-sm font-semibold transition ${
                    heroMediaType === "image"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t.heroMediaTypeImage}
                </button>
                <button
                  type="button"
                  onClick={() => setHeroMediaType("video")}
                  className={`inline-flex items-center justify-center px-3 py-2 text-sm font-semibold transition ${
                    heroMediaType === "video"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t.heroMediaTypeVideo}
                </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.heroSlidesHint}</p>
              {heroMediaType === "image" ? (
                <label className="block space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.heroImagePath}</span>
                  <input
                    value={heroImageSrc}
                    onChange={(event) => setHeroImageSrc(event.target.value)}
                    placeholder="/images/slides/1.jpg"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
              ) : (
                <label className="block space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.heroVideoPath}</span>
                  <input
                    value={heroVideoSrc}
                    onChange={(event) => setHeroVideoSrc(event.target.value)}
                    placeholder="/videos/hero.mp4"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
              )}

              <div className="relative h-36 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                {heroMediaSrc ? (
                  heroMediaIsVideo ? (
                    <video
                      className="h-full w-full object-cover"
                      src={heroMediaSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${heroMediaSrc}")` }}
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                    {t.heroSlidesEmpty}
                  </div>
                )}
                {heroMediaSrc ? (
                  <div className="absolute end-2 top-2 bg-black/70 px-2 py-1 text-[10px] font-semibold tracking-wide text-white">
                    {heroMediaIsVideo ? "VIDEO" : "IMAGE"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {isHomePage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.homeCoursesSection}</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.homeCoursesHint}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.coursesTitleEn}</span>
              <input
                value={settings.homeCourses.titleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, titleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.coursesTitleAr}</span>
              <input
                value={settings.homeCourses.titleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, titleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.coursesSubtitleEn}</span>
              <textarea
                rows={2}
                value={settings.homeCourses.subtitleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, subtitleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.coursesSubtitleAr}</span>
              <textarea
                rows={2}
                value={settings.homeCourses.subtitleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, subtitleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.cookingCardTitleEn}</span>
              <input
                value={settings.homeCourses.cookingTitleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, cookingTitleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.cookingCardTitleAr}</span>
              <input
                value={settings.homeCourses.cookingTitleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, cookingTitleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.cookingCardDescEn}</span>
              <textarea
                rows={3}
                value={settings.homeCourses.cookingDescriptionEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, cookingDescriptionEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.cookingCardDescAr}</span>
              <textarea
                rows={3}
                value={settings.homeCourses.cookingDescriptionAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, cookingDescriptionAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.artsCardTitleEn}</span>
              <input
                value={settings.homeCourses.artsTitleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, artsTitleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.artsCardTitleAr}</span>
              <input
                value={settings.homeCourses.artsTitleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, artsTitleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.artsCardDescEn}</span>
              <textarea
                rows={3}
                value={settings.homeCourses.artsDescriptionEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, artsDescriptionEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.artsCardDescAr}</span>
              <textarea
                rows={3}
                value={settings.homeCourses.artsDescriptionAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeCourses: { ...prev.homeCourses, artsDescriptionAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{isArabic ? "بطاقة الطبخ" : "Cooking Card"}</h3>
              <div className="grid gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.cardDisplayMode}</span>
                  <select
                    value={settings.homeCourses.cookingDisplayMode}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        homeCourses: {
                          ...prev.homeCourses,
                          cookingDisplayMode: event.target.value === "image" ? "image" : "icon",
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="icon">{t.displayIcon}</option>
                    <option value="image">{t.displayImage}</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.cardIconChoice}</span>
                  <select
                    value={settings.homeCourses.cookingIcon}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        homeCourses: {
                          ...prev.homeCourses,
                          cookingIcon: event.target.value as SitePageSettings["homeCourses"]["cookingIcon"],
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {COOKING_ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {isArabic ? option.labelAr : option.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.cookingImagePath}</span>
                  <div className="flex gap-2">
                    <input
                      value={settings.homeCourses.cookingImageSrc}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          homeCourses: { ...prev.homeCourses, cookingImageSrc: event.target.value },
                        }))
                      }
                      placeholder="/images/cooking.png"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <FiUpload className="size-3.5" />
                      {uploadingCourseImageKey === "cooking" ? t.cardImageUploading : t.cardImageUpload}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingCourseImageKey !== null}
                        onChange={(event) => {
                          void handleCourseImageUpload("cooking", event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </label>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.cardPreview}</p>
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-gradient-to-br from-teal-50 to-cyan-100 dark:border-zinc-700 dark:from-teal-900/25 dark:to-cyan-900/20">
                  {settings.homeCourses.cookingDisplayMode === "image" ? (
                    settings.homeCourses.cookingImageSrc.trim() ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${settings.homeCourses.cookingImageSrc}")` }}
                      />
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.cardImagePlaceholder}</span>
                    )
                  ) : (
                    renderCourseIconPreview(settings.homeCourses.cookingIcon, "cooking", "h-14 w-14 text-teal-600 dark:text-teal-300")
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{cookingPreviewTitle}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{isArabic ? "بطاقة الفنون" : "Arts Card"}</h3>
              <div className="grid gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.cardDisplayMode}</span>
                  <select
                    value={settings.homeCourses.artsDisplayMode}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        homeCourses: {
                          ...prev.homeCourses,
                          artsDisplayMode: event.target.value === "image" ? "image" : "icon",
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="icon">{t.displayIcon}</option>
                    <option value="image">{t.displayImage}</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.cardIconChoice}</span>
                  <select
                    value={settings.homeCourses.artsIcon}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        homeCourses: {
                          ...prev.homeCourses,
                          artsIcon: event.target.value as SitePageSettings["homeCourses"]["artsIcon"],
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {ARTS_ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {isArabic ? option.labelAr : option.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.artsImagePath}</span>
                  <div className="flex gap-2">
                    <input
                      value={settings.homeCourses.artsImageSrc}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          homeCourses: { ...prev.homeCourses, artsImageSrc: event.target.value },
                        }))
                      }
                      placeholder="/images/art.png"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <FiUpload className="size-3.5" />
                      {uploadingCourseImageKey === "arts" ? t.cardImageUploading : t.cardImageUpload}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingCourseImageKey !== null}
                        onChange={(event) => {
                          void handleCourseImageUpload("arts", event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </label>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.cardPreview}</p>
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-gradient-to-br from-purple-50 to-fuchsia-100 dark:border-zinc-700 dark:from-purple-900/25 dark:to-fuchsia-900/20">
                  {settings.homeCourses.artsDisplayMode === "image" ? (
                    settings.homeCourses.artsImageSrc.trim() ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${settings.homeCourses.artsImageSrc}")` }}
                      />
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.cardImagePlaceholder}</span>
                    )
                  ) : (
                    renderCourseIconPreview(settings.homeCourses.artsIcon, "arts", "h-14 w-14 text-purple-600 dark:text-purple-300")
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{artsPreviewTitle}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {isHomePage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.homeUpcomingSection}</h2>
            <button
              type="button"
              onClick={addHomeUpcomingItem}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FiPlus className="size-3.5" />
              {t.upcomingAdd}
            </button>
          </div>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.homeUpcomingHint}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingTitleEn}</span>
              <input
                value={settings.homeUpcoming.titleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeUpcoming: { ...prev.homeUpcoming, titleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingTitleAr}</span>
              <input
                value={settings.homeUpcoming.titleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeUpcoming: { ...prev.homeUpcoming, titleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingDescriptionEn}</span>
              <textarea
                rows={2}
                value={settings.homeUpcoming.descriptionEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeUpcoming: { ...prev.homeUpcoming, descriptionEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingDescriptionAr}</span>
              <textarea
                rows={2}
                value={settings.homeUpcoming.descriptionAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeUpcoming: { ...prev.homeUpcoming, descriptionAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingBookNowLabelEn}</span>
              <input
                value={settings.homeUpcoming.bookNowLabelEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeUpcoming: { ...prev.homeUpcoming, bookNowLabelEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingBookNowLabelAr}</span>
              <input
                value={settings.homeUpcoming.bookNowLabelAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeUpcoming: { ...prev.homeUpcoming, bookNowLabelAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {settings.homeUpcoming.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.upcomingListEmpty}
              </div>
            ) : null}

            {settings.homeUpcoming.items.map((item, index) => (
              <div
                key={`upcoming-item-${index}`}
                className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.upcomingCard} {index + 1}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveHomeUpcomingItem(index, -1)}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowUp className="size-3.5" />
                      {t.upcomingMoveUp}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveHomeUpcomingItem(index, 1)}
                      disabled={index === settings.homeUpcoming.items.length - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowDown className="size-3.5" />
                      {t.upcomingMoveDown}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHomeUpcomingItem(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      <FiTrash2 className="size-3.5" />
                      {t.upcomingRemove}
                    </button>
                  </div>
                </div>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardTitleEn}</span>
                  <input
                    value={item.titleEn}
                    onChange={(event) => setHomeUpcomingItem(index, "titleEn", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardTitleAr}</span>
                  <input
                    value={item.titleAr}
                    onChange={(event) => setHomeUpcomingItem(index, "titleAr", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardDatetimeEn}</span>
                    <input
                      value={item.datetimeTextEn}
                      onChange={(event) => setHomeUpcomingItem(index, "datetimeTextEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardDatetimeAr}</span>
                    <input
                      value={item.datetimeTextAr}
                      onChange={(event) => setHomeUpcomingItem(index, "datetimeTextAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardPriceEn}</span>
                    <input
                      value={item.priceTextEn}
                      onChange={(event) => setHomeUpcomingItem(index, "priceTextEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardPriceAr}</span>
                    <input
                      value={item.priceTextAr}
                      onChange={(event) => setHomeUpcomingItem(index, "priceTextAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardImagePath}</span>
                  <div className="flex gap-2">
                    <input
                      value={item.imageSrc}
                      onChange={(event) => setHomeUpcomingItem(index, "imageSrc", event.target.value)}
                      placeholder="/uploads/home-upcoming/item.png"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <FiUpload className="size-3.5" />
                      {uploadingUpcomingImageIndex === index ? t.upcomingImageUploading : t.upcomingImageUpload}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingUpcomingImageIndex !== null}
                        onChange={(event) => {
                          void handleUpcomingImageUpload(index, event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.upcomingCardLink}</span>
                  <input
                    value={item.href}
                    onChange={(event) => setHomeUpcomingItem(index, "href", event.target.value)}
                    placeholder="/classes/cooking"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.cardPreview}</p>
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    {item.imageSrc.trim() ? (
                      <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${item.imageSrc}")` }} />
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.cardImagePlaceholder}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isHomePage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.homeWhyNoonSection}</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.homeWhyNoonHint}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonTitleEn}</span>
              <input
                value={settings.homeWhyNoon.titleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeWhyNoon: { ...prev.homeWhyNoon, titleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonTitleAr}</span>
              <input
                value={settings.homeWhyNoon.titleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeWhyNoon: { ...prev.homeWhyNoon, titleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonDescriptionEn}</span>
              <textarea
                rows={2}
                value={settings.homeWhyNoon.descriptionEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeWhyNoon: { ...prev.homeWhyNoon, descriptionEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonDescriptionAr}</span>
              <textarea
                rows={2}
                value={settings.homeWhyNoon.descriptionAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeWhyNoon: { ...prev.homeWhyNoon, descriptionAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {settings.homeWhyNoon.items.map((item, index) => (
              <div
                key={`why-noon-item-${index}`}
                className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.whyNoonCard} {index + 1}
                </h3>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonCardTitleEn}</span>
                  <input
                    value={item.titleEn}
                    onChange={(event) => setHomeWhyNoonItem(index, "titleEn", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonCardTitleAr}</span>
                  <input
                    value={item.titleAr}
                    onChange={(event) => setHomeWhyNoonItem(index, "titleAr", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonCardDescriptionEn}</span>
                  <textarea
                    rows={2}
                    value={item.descriptionEn}
                    onChange={(event) => setHomeWhyNoonItem(index, "descriptionEn", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.whyNoonCardDescriptionAr}</span>
                  <textarea
                    rows={2}
                    value={item.descriptionAr}
                    onChange={(event) => setHomeWhyNoonItem(index, "descriptionAr", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      )}

      {isHomePage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.homePartnersSection}</h2>
            <button
              type="button"
              onClick={addHomePartnerItem}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FiPlus className="size-3.5" />
              {t.partnerAdd}
            </button>
          </div>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.homePartnersHint}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.partnersTitleEn}</span>
              <input
                value={settings.homePartners.titleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homePartners: { ...prev.homePartners, titleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.partnersTitleAr}</span>
              <input
                value={settings.homePartners.titleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homePartners: { ...prev.homePartners, titleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.partnersDescriptionEn}</span>
              <textarea
                rows={2}
                value={settings.homePartners.descriptionEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homePartners: { ...prev.homePartners, descriptionEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.partnersDescriptionAr}</span>
              <textarea
                rows={2}
                value={settings.homePartners.descriptionAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homePartners: { ...prev.homePartners, descriptionAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {settings.homePartners.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.partnerListEmpty}
              </div>
            ) : null}

            {settings.homePartners.items.map((item, index) => (
              <div
                key={`partner-item-${index}`}
                className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.partnerCard} {index + 1}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveHomePartnerItem(index, -1)}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowUp className="size-3.5" />
                      {t.partnerMoveUp}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveHomePartnerItem(index, 1)}
                      disabled={index === settings.homePartners.items.length - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowDown className="size-3.5" />
                      {t.partnerMoveDown}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHomePartnerItem(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      <FiTrash2 className="size-3.5" />
                      {t.partnerRemove}
                    </button>
                  </div>
                </div>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.partnerNameEn}</span>
                  <input
                    value={item.nameEn}
                    onChange={(event) => setHomePartnerItem(index, "nameEn", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.partnerNameAr}</span>
                  <input
                    value={item.nameAr}
                    onChange={(event) => setHomePartnerItem(index, "nameAr", event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.partnerLogoPath}</span>
                  <input
                    value={item.logoSrc}
                    onChange={(event) => setHomePartnerItem(index, "logoSrc", event.target.value)}
                    placeholder="/uploads/home-partners/logo.png"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FiUpload className="size-3.5" />
                    {uploadingPartnerLogoIndex === index ? t.partnerLogoUploading : t.partnerLogoUpload}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPartnerLogoIndex !== null}
                      onChange={(event) => {
                        void handlePartnerLogoUpload(index, event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {item.logoSrc.trim() ? (
                    <button
                      type="button"
                      onClick={() => setHomePartnerItem(index, "logoSrc", "")}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      <FiTrash2 className="size-3.5" />
                      {t.partnerLogoRemove}
                    </button>
                  ) : null}
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.partnerLogoPreview}</p>
                  <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    {item.logoSrc.trim() ? (
                      <div
                        aria-label={isArabic ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
                        className="h-12 w-full bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url("${item.logoSrc}")` }}
                      />
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.cardImagePlaceholder}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isHomePage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.homeNumbersSection}</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.homeNumbersHint}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.numbersTitleEn}</span>
              <input
                value={settings.homeNumbers.titleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeNumbers: { ...prev.homeNumbers, titleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.numbersTitleAr}</span>
              <input
                value={settings.homeNumbers.titleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    homeNumbers: { ...prev.homeNumbers, titleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {settings.homeNumbers.items.map((item, index) => (
              <div
                key={`metric-${index}`}
                className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.metricCard} {index + 1}
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.metricValueEn}</span>
                    <input
                      value={item.valueEn}
                      onChange={(event) => setHomeNumberItem(index, "valueEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.metricValueAr}</span>
                    <input
                      value={item.valueAr}
                      onChange={(event) => setHomeNumberItem(index, "valueAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.metricLabelEn}</span>
                    <input
                      value={item.labelEn}
                      onChange={(event) => setHomeNumberItem(index, "labelEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.metricLabelAr}</span>
                    <input
                      value={item.labelAr}
                      onChange={(event) => setHomeNumberItem(index, "labelAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </div>
            ))}
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
