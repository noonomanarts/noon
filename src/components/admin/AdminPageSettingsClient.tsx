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
  const [uploadingAboutMediaKey, setUploadingAboutMediaKey] = useState<"hero" | "founder" | "family" | null>(null);
  const [uploadingAboutTeamImageIndex, setUploadingAboutTeamImageIndex] = useState<number | null>(null);
  const [uploadingAboutTrainerImageIndex, setUploadingAboutTrainerImageIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const defaults = useMemo(() => getDefaultSitePageSettings(page), [page]);
  const isDynamic = isDynamicPathTemplate(page.pathTemplate);
  const isHomePage = page.key === "home";
  const isFaqPage = page.key === "faqs";
  const isTermsPage = page.key === "terms";
  const isContactPage = page.key === "contact";
  const isAboutPage = page.key === "about";
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
    faqSection: isArabic ? "إعدادات الأسئلة الشائعة" : "FAQ Settings",
    faqHint: isArabic
      ? "أدر الأسئلة والأجوبة بشكل غير محدود، مع دعم التصنيف واللغتين."
      : "Manage unlimited FAQ items with categories and bilingual content.",
    faqItem: isArabic ? "سؤال" : "FAQ Item",
    faqCategoryEn: isArabic ? "التصنيف (EN)" : "Category (EN)",
    faqCategoryAr: isArabic ? "التصنيف (AR)" : "Category (AR)",
    faqQuestionEn: isArabic ? "السؤال (EN)" : "Question (EN)",
    faqQuestionAr: isArabic ? "السؤال (AR)" : "Question (AR)",
    faqAnswerEn: isArabic ? "الإجابة (EN - Markdown)" : "Answer (EN - Markdown)",
    faqAnswerAr: isArabic ? "الإجابة (AR - Markdown)" : "Answer (AR - Markdown)",
    faqAdd: isArabic ? "إضافة سؤال" : "Add FAQ",
    faqRemove: isArabic ? "حذف السؤال" : "Remove FAQ",
    faqMoveUp: isArabic ? "أعلى" : "Up",
    faqMoveDown: isArabic ? "أسفل" : "Down",
    faqListEmpty: isArabic ? "لا توجد أسئلة حالياً. أضف أول سؤال." : "No FAQs yet. Add your first item.",
    termsSectionTitle: isArabic ? "إعدادات الشروط والأحكام" : "Terms Page Settings",
    termsHint: isArabic
      ? "أضف بنود الشروط على شكل أقسام غير محدودة مع دعم Markdown."
      : "Manage unlimited terms sections with Markdown support.",
    termsBlock: isArabic ? "بند" : "Section",
    termsTitleEn: isArabic ? "العنوان (EN)" : "Title (EN)",
    termsTitleAr: isArabic ? "العنوان (AR)" : "Title (AR)",
    termsBodyEn: isArabic ? "المحتوى (EN - Markdown)" : "Body (EN - Markdown)",
    termsBodyAr: isArabic ? "المحتوى (AR - Markdown)" : "Body (AR - Markdown)",
    termsAdd: isArabic ? "إضافة بند" : "Add Section",
    termsRemove: isArabic ? "حذف البند" : "Remove Section",
    termsMoveUp: isArabic ? "أعلى" : "Up",
    termsMoveDown: isArabic ? "أسفل" : "Down",
    termsListEmpty:
      isArabic ? "لا توجد بنود حالياً. أضف أول بند." : "No terms sections yet. Add your first section.",
    contactSection: isArabic ? "إعدادات صفحة التواصل" : "Contact Page Settings",
    contactHint: isArabic
      ? "حرر نصوص الهيدر، بيانات التواصل، الروابط الاجتماعية، والخريطة."
      : "Edit hero copy, contact details, social links, and map settings.",
    contactSubtitleEn: isArabic ? "وصف أعلى الصفحة (EN)" : "Hero Subtitle (EN)",
    contactSubtitleAr: isArabic ? "وصف أعلى الصفحة (AR)" : "Hero Subtitle (AR)",
    contactHelperEn: isArabic ? "نص مساعد (EN)" : "Helper Copy (EN)",
    contactHelperAr: isArabic ? "نص مساعد (AR)" : "Helper Copy (AR)",
    contactAddressEn: isArabic ? "العنوان (EN)" : "Address (EN)",
    contactAddressAr: isArabic ? "العنوان (AR)" : "Address (AR)",
    contactHoursEn: isArabic ? "ساعات العمل (EN)" : "Office Hours (EN)",
    contactHoursAr: isArabic ? "ساعات العمل (AR)" : "Office Hours (AR)",
    contactPhone: isArabic ? "رقم الهاتف" : "Primary Phone",
    contactEmail: isArabic ? "البريد الإلكتروني" : "Primary Email",
    contactWhatsapp: isArabic ? "رابط واتساب" : "WhatsApp Link",
    contactInstagram: isArabic ? "رابط انستغرام" : "Instagram Link",
    contactMapEmbed: isArabic ? "رابط تضمين الخريطة" : "Map Embed URL",
    contactMapLink: isArabic ? "رابط فتح الخريطة" : "Map Link",
    contactSuccessTitleEn: isArabic ? "عنوان نجاح الإرسال (EN)" : "Success Title (EN)",
    contactSuccessTitleAr: isArabic ? "عنوان نجاح الإرسال (AR)" : "Success Title (AR)",
    contactSuccessMessageEn: isArabic ? "رسالة نجاح الإرسال (EN)" : "Success Message (EN)",
    contactSuccessMessageAr: isArabic ? "رسالة نجاح الإرسال (AR)" : "Success Message (AR)",
    aboutSection: isArabic ? "إعدادات صفحة من نحن" : "About Page Settings",
    aboutHint: isArabic
      ? "تحكم كامل في محتوى صفحة من نحن: الأقسام، الصور، الفريق، والمدربين."
      : "Full control over About page content: sections, media, team, and trainers.",
    aboutHeroImage: isArabic ? "صورة الهيدر" : "Hero Image",
    aboutTitleEn: isArabic ? "عنوان عن نون (EN)" : "About Title (EN)",
    aboutTitleAr: isArabic ? "عنوان عن نون (AR)" : "About Title (AR)",
    aboutBodyEn: isArabic ? "نص عن نون (EN - Markdown)" : "About Body (EN - Markdown)",
    aboutBodyAr: isArabic ? "نص عن نون (AR - Markdown)" : "About Body (AR - Markdown)",
    aboutFounderTitleEn: isArabic ? "عنوان المؤسس (EN)" : "Founder Title (EN)",
    aboutFounderTitleAr: isArabic ? "عنوان المؤسس (AR)" : "Founder Title (AR)",
    aboutFounderBodyEn: isArabic ? "وصف المؤسس (EN - Markdown)" : "Founder Body (EN - Markdown)",
    aboutFounderBodyAr: isArabic ? "وصف المؤسس (AR - Markdown)" : "Founder Body (AR - Markdown)",
    aboutFounderQuoteEn: isArabic ? "اقتباس المؤسس (EN)" : "Founder Quote (EN)",
    aboutFounderQuoteAr: isArabic ? "اقتباس المؤسس (AR)" : "Founder Quote (AR)",
    aboutFounderImage: isArabic ? "صورة المؤسس" : "Founder Image",
    aboutFamilyTitleEn: isArabic ? "عنوان العائلة (EN)" : "Family Title (EN)",
    aboutFamilyTitleAr: isArabic ? "عنوان العائلة (AR)" : "Family Title (AR)",
    aboutFamilyBodyEn: isArabic ? "نص العائلة (EN - Markdown)" : "Family Body (EN - Markdown)",
    aboutFamilyBodyAr: isArabic ? "نص العائلة (AR - Markdown)" : "Family Body (AR - Markdown)",
    aboutFamilyImage: isArabic ? "صورة العائلة" : "Family Image",
    aboutUpload: isArabic ? "رفع" : "Upload",
    aboutUploading: isArabic ? "جارٍ الرفع..." : "Uploading...",
    aboutUploadFailed: isArabic ? "فشل رفع صورة صفحة من نحن." : "Failed to upload About page image.",
    aboutUploadDone: isArabic ? "تم رفع الصورة بنجاح." : "Image uploaded successfully.",
    aboutWhatWeDoSection: isArabic ? "قسم ماذا نقدم" : "What We Do Section",
    aboutWhatWeDoTitleEn: isArabic ? "عنوان القسم (EN)" : "Section Title (EN)",
    aboutWhatWeDoTitleAr: isArabic ? "عنوان القسم (AR)" : "Section Title (AR)",
    aboutFeatureItem: isArabic ? "عنصر" : "Item",
    aboutFeatureTextEn: isArabic ? "النص (EN)" : "Text (EN)",
    aboutFeatureTextAr: isArabic ? "النص (AR)" : "Text (AR)",
    aboutFeatureAdd: isArabic ? "إضافة عنصر" : "Add Item",
    aboutFeatureRemove: isArabic ? "حذف العنصر" : "Remove Item",
    aboutFeatureEmpty: isArabic ? "لا توجد عناصر حالياً." : "No items yet.",
    aboutTeamSection: isArabic ? "قسم الفريق" : "Team Section",
    aboutTeamTitleEn: isArabic ? "عنوان الفريق (EN)" : "Team Title (EN)",
    aboutTeamTitleAr: isArabic ? "عنوان الفريق (AR)" : "Team Title (AR)",
    aboutTeamMember: isArabic ? "عضو فريق" : "Team Member",
    aboutTeamNameEn: isArabic ? "الاسم (EN)" : "Name (EN)",
    aboutTeamNameAr: isArabic ? "الاسم (AR)" : "Name (AR)",
    aboutTeamRoleEn: isArabic ? "الوظيفة (EN)" : "Role (EN)",
    aboutTeamRoleAr: isArabic ? "الوظيفة (AR)" : "Role (AR)",
    aboutTeamImage: isArabic ? "صورة العضو" : "Member Image",
    aboutTeamAdd: isArabic ? "إضافة عضو" : "Add Member",
    aboutTeamRemove: isArabic ? "حذف العضو" : "Remove Member",
    aboutTeamEmpty: isArabic ? "لا يوجد أعضاء حالياً." : "No team members yet.",
    aboutTrainersSection: isArabic ? "قسم المدربين" : "Trainers Section",
    aboutTrainersTitleEn: isArabic ? "عنوان المدربين (EN)" : "Trainers Title (EN)",
    aboutTrainersTitleAr: isArabic ? "عنوان المدربين (AR)" : "Trainers Title (AR)",
    aboutTrainersCtaEn: isArabic ? "نص زر المدربين (EN)" : "Trainers CTA (EN)",
    aboutTrainersCtaAr: isArabic ? "نص زر المدربين (AR)" : "Trainers CTA (AR)",
    aboutTrainerCard: isArabic ? "بطاقة مدرب" : "Trainer Card",
    aboutTrainerNameEn: isArabic ? "اسم المدرب (EN)" : "Trainer Name (EN)",
    aboutTrainerNameAr: isArabic ? "اسم المدرب (AR)" : "Trainer Name (AR)",
    aboutTrainerImage: isArabic ? "صورة المدرب" : "Trainer Image",
    aboutTrainerAdd: isArabic ? "إضافة مدرب" : "Add Trainer",
    aboutTrainerRemove: isArabic ? "حذف المدرب" : "Remove Trainer",
    aboutTrainerEmpty: isArabic ? "لا يوجد مدربون حالياً." : "No trainer cards yet.",
    moveUp: isArabic ? "أعلى" : "Up",
    moveDown: isArabic ? "أسفل" : "Down",
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

  const setFaqItem = (
    index: number,
    field: keyof SitePageSettings["faqItems"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      faqItems: prev.faqItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addFaqItem = () => {
    setSettings((prev) => ({
      ...prev,
      faqItems: [
        ...prev.faqItems,
        {
          categoryEn: "",
          categoryAr: "",
          questionEn: "",
          questionAr: "",
          answerEn: "",
          answerAr: "",
        },
      ],
    }));
  };

  const removeFaqItem = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      faqItems: prev.faqItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveFaqItem = (index: number, direction: -1 | 1) => {
    setSettings((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.faqItems.length) return prev;
      const next = [...prev.faqItems];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return { ...prev, faqItems: next };
    });
  };

  const setTermsSection = (
    index: number,
    field: keyof SitePageSettings["termsSections"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      termsSections: prev.termsSections.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addTermsSection = () => {
    setSettings((prev) => ({
      ...prev,
      termsSections: [
        ...prev.termsSections,
        {
          titleEn: "",
          titleAr: "",
          bodyEn: "",
          bodyAr: "",
        },
      ],
    }));
  };

  const removeTermsSection = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      termsSections: prev.termsSections.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveTermsSection = (index: number, direction: -1 | 1) => {
    setSettings((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.termsSections.length) return prev;
      const next = [...prev.termsSections];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return { ...prev, termsSections: next };
    });
  };

  const setAboutFeatureItem = (
    index: number,
    field: keyof SitePageSettings["aboutPage"]["whatWeDoItems"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        whatWeDoItems: prev.aboutPage.whatWeDoItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addAboutFeatureItem = () => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        whatWeDoItems: [...prev.aboutPage.whatWeDoItems, { textEn: "", textAr: "" }],
      },
    }));
  };

  const removeAboutFeatureItem = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        whatWeDoItems: prev.aboutPage.whatWeDoItems.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const moveAboutFeatureItem = (index: number, direction: -1 | 1) => {
    setSettings((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.aboutPage.whatWeDoItems.length) return prev;
      const next = [...prev.aboutPage.whatWeDoItems];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return {
        ...prev,
        aboutPage: {
          ...prev.aboutPage,
          whatWeDoItems: next,
        },
      };
    });
  };

  const setAboutTeamMember = (
    index: number,
    field: keyof SitePageSettings["aboutPage"]["teamMembers"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        teamMembers: prev.aboutPage.teamMembers.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addAboutTeamMember = () => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        teamMembers: [
          ...prev.aboutPage.teamMembers,
          { nameEn: "", nameAr: "", roleEn: "", roleAr: "", imageSrc: "" },
        ],
      },
    }));
  };

  const removeAboutTeamMember = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        teamMembers: prev.aboutPage.teamMembers.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const moveAboutTeamMember = (index: number, direction: -1 | 1) => {
    setSettings((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.aboutPage.teamMembers.length) return prev;
      const next = [...prev.aboutPage.teamMembers];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return {
        ...prev,
        aboutPage: {
          ...prev.aboutPage,
          teamMembers: next,
        },
      };
    });
  };

  const setAboutTrainerHighlight = (
    index: number,
    field: keyof SitePageSettings["aboutPage"]["trainerHighlights"][number],
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        trainerHighlights: prev.aboutPage.trainerHighlights.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addAboutTrainerHighlight = () => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        trainerHighlights: [...prev.aboutPage.trainerHighlights, { nameEn: "", nameAr: "", imageSrc: "" }],
      },
    }));
  };

  const removeAboutTrainerHighlight = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      aboutPage: {
        ...prev.aboutPage,
        trainerHighlights: prev.aboutPage.trainerHighlights.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const moveAboutTrainerHighlight = (index: number, direction: -1 | 1) => {
    setSettings((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.aboutPage.trainerHighlights.length) return prev;
      const next = [...prev.aboutPage.trainerHighlights];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return {
        ...prev,
        aboutPage: {
          ...prev.aboutPage,
          trainerHighlights: next,
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

  const handleAboutMediaUpload = async (
    target: "hero" | "founder" | "family",
    file: File | null
  ) => {
    if (!file) return;
    setUploadingAboutMediaKey(target);
    setError(null);
    setInfo(null);

    try {
      const folder = target === "hero" ? "about-hero" : target === "founder" ? "about-founder" : "about-family";
      const url = await uploadAsset(file, folder, t.aboutUploadFailed);
      setSettings((prev) => ({
        ...prev,
        aboutPage: {
          ...prev.aboutPage,
          ...(target === "hero"
            ? { heroImageSrc: url }
            : target === "founder"
              ? { founderImageSrc: url }
              : { familyImageSrc: url }),
        },
      }));
      setInfo(t.aboutUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.aboutUploadFailed);
    } finally {
      setUploadingAboutMediaKey(null);
    }
  };

  const handleAboutTeamImageUpload = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadingAboutTeamImageIndex(index);
    setError(null);
    setInfo(null);

    try {
      const url = await uploadAsset(file, "about-team", t.aboutUploadFailed);
      setSettings((prev) => ({
        ...prev,
        aboutPage: {
          ...prev.aboutPage,
          teamMembers: prev.aboutPage.teamMembers.map((item, itemIndex) =>
            itemIndex === index ? { ...item, imageSrc: url } : item
          ),
        },
      }));
      setInfo(t.aboutUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.aboutUploadFailed);
    } finally {
      setUploadingAboutTeamImageIndex(null);
    }
  };

  const handleAboutTrainerImageUpload = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadingAboutTrainerImageIndex(index);
    setError(null);
    setInfo(null);

    try {
      const url = await uploadAsset(file, "about-trainers", t.aboutUploadFailed);
      setSettings((prev) => ({
        ...prev,
        aboutPage: {
          ...prev.aboutPage,
          trainerHighlights: prev.aboutPage.trainerHighlights.map((item, itemIndex) =>
            itemIndex === index ? { ...item, imageSrc: url } : item
          ),
        },
      }));
      setInfo(t.aboutUploadDone);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.aboutUploadFailed);
    } finally {
      setUploadingAboutTrainerImageIndex(null);
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

      {isAboutPage && (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.aboutSection}</h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.aboutHint}</p>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutHeroImage}</span>
                <div className="flex gap-2">
                  <input
                    value={settings.aboutPage.heroImageSrc}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aboutPage: { ...prev.aboutPage, heroImageSrc: event.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FiUpload className="size-3.5" />
                    {uploadingAboutMediaKey === "hero" ? t.aboutUploading : t.aboutUpload}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAboutMediaKey !== null}
                      onChange={(event) => {
                        void handleAboutMediaUpload("hero", event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTitleEn}</span>
                <input
                  value={settings.aboutPage.aboutTitleEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, aboutTitleEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTitleAr}</span>
                <input
                  value={settings.aboutPage.aboutTitleAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, aboutTitleAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutBodyEn}</span>
                <textarea
                  rows={5}
                  value={settings.aboutPage.aboutBodyEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, aboutBodyEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutBodyAr}</span>
                <textarea
                  rows={5}
                  value={settings.aboutPage.aboutBodyAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, aboutBodyAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFounderTitleEn}</span>
                <input
                  value={settings.aboutPage.founderTitleEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, founderTitleEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFounderTitleAr}</span>
                <input
                  value={settings.aboutPage.founderTitleAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, founderTitleAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFounderBodyEn}</span>
                <textarea
                  rows={4}
                  value={settings.aboutPage.founderBodyEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, founderBodyEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFounderBodyAr}</span>
                <textarea
                  rows={4}
                  value={settings.aboutPage.founderBodyAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, founderBodyAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFounderQuoteEn}</span>
                <textarea
                  rows={2}
                  value={settings.aboutPage.founderQuoteEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, founderQuoteEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFounderQuoteAr}</span>
                <textarea
                  rows={2}
                  value={settings.aboutPage.founderQuoteAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, founderQuoteAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFounderImage}</span>
                <div className="flex gap-2">
                  <input
                    value={settings.aboutPage.founderImageSrc}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aboutPage: { ...prev.aboutPage, founderImageSrc: event.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FiUpload className="size-3.5" />
                    {uploadingAboutMediaKey === "founder" ? t.aboutUploading : t.aboutUpload}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAboutMediaKey !== null}
                      onChange={(event) => {
                        void handleAboutMediaUpload("founder", event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFamilyTitleEn}</span>
                <input
                  value={settings.aboutPage.familyTitleEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, familyTitleEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFamilyTitleAr}</span>
                <input
                  value={settings.aboutPage.familyTitleAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, familyTitleAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFamilyBodyEn}</span>
                <textarea
                  rows={4}
                  value={settings.aboutPage.familyBodyEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, familyBodyEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFamilyBodyAr}</span>
                <textarea
                  rows={4}
                  value={settings.aboutPage.familyBodyAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, familyBodyAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutFamilyImage}</span>
                <div className="flex gap-2">
                  <input
                    value={settings.aboutPage.familyImageSrc}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aboutPage: { ...prev.aboutPage, familyImageSrc: event.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FiUpload className="size-3.5" />
                    {uploadingAboutMediaKey === "family" ? t.aboutUploading : t.aboutUpload}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAboutMediaKey !== null}
                      onChange={(event) => {
                        void handleAboutMediaUpload("family", event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.aboutWhatWeDoSection}</h2>
              <button
                type="button"
                onClick={addAboutFeatureItem}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <FiPlus className="size-3.5" />
                {t.aboutFeatureAdd}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutWhatWeDoTitleEn}</span>
                <input
                  value={settings.aboutPage.whatWeDoTitleEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, whatWeDoTitleEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutWhatWeDoTitleAr}</span>
                <input
                  value={settings.aboutPage.whatWeDoTitleAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, whatWeDoTitleAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {settings.aboutPage.whatWeDoItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  {t.aboutFeatureEmpty}
                </div>
              ) : null}
              {settings.aboutPage.whatWeDoItems.map((item, index) => (
                <div
                  key={`about-feature-${index}`}
                  className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.aboutFeatureItem} {index + 1}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveAboutFeatureItem(index, -1)}
                        disabled={index === 0}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FiArrowUp className="size-3.5" />
                        {t.moveUp}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAboutFeatureItem(index, 1)}
                        disabled={index === settings.aboutPage.whatWeDoItems.length - 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FiArrowDown className="size-3.5" />
                        {t.moveDown}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAboutFeatureItem(index)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        <FiTrash2 className="size-3.5" />
                        {t.aboutFeatureRemove}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={item.textEn}
                      onChange={(event) => setAboutFeatureItem(index, "textEn", event.target.value)}
                      placeholder={t.aboutFeatureTextEn}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      value={item.textAr}
                      onChange={(event) => setAboutFeatureItem(index, "textAr", event.target.value)}
                      placeholder={t.aboutFeatureTextAr}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.aboutTeamSection}</h2>
              <button
                type="button"
                onClick={addAboutTeamMember}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <FiPlus className="size-3.5" />
                {t.aboutTeamAdd}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTeamTitleEn}</span>
                <input
                  value={settings.aboutPage.teamTitleEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, teamTitleEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTeamTitleAr}</span>
                <input
                  value={settings.aboutPage.teamTitleAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, teamTitleAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {settings.aboutPage.teamMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  {t.aboutTeamEmpty}
                </div>
              ) : null}
              {settings.aboutPage.teamMembers.map((item, index) => (
                <div
                  key={`about-team-${index}`}
                  className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.aboutTeamMember} {index + 1}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveAboutTeamMember(index, -1)}
                        disabled={index === 0}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FiArrowUp className="size-3.5" />
                        {t.moveUp}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAboutTeamMember(index, 1)}
                        disabled={index === settings.aboutPage.teamMembers.length - 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FiArrowDown className="size-3.5" />
                        {t.moveDown}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAboutTeamMember(index)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        <FiTrash2 className="size-3.5" />
                        {t.aboutTeamRemove}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={item.nameEn}
                      onChange={(event) => setAboutTeamMember(index, "nameEn", event.target.value)}
                      placeholder={t.aboutTeamNameEn}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      value={item.nameAr}
                      onChange={(event) => setAboutTeamMember(index, "nameAr", event.target.value)}
                      placeholder={t.aboutTeamNameAr}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      value={item.roleEn}
                      onChange={(event) => setAboutTeamMember(index, "roleEn", event.target.value)}
                      placeholder={t.aboutTeamRoleEn}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      value={item.roleAr}
                      onChange={(event) => setAboutTeamMember(index, "roleAr", event.target.value)}
                      placeholder={t.aboutTeamRoleAr}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={item.imageSrc}
                      onChange={(event) => setAboutTeamMember(index, "imageSrc", event.target.value)}
                      placeholder={t.aboutTeamImage}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <FiUpload className="size-3.5" />
                      {uploadingAboutTeamImageIndex === index ? t.aboutUploading : t.aboutUpload}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAboutTeamImageIndex !== null}
                        onChange={(event) => {
                          void handleAboutTeamImageUpload(index, event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.aboutTrainersSection}</h2>
              <button
                type="button"
                onClick={addAboutTrainerHighlight}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <FiPlus className="size-3.5" />
                {t.aboutTrainerAdd}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTrainersTitleEn}</span>
                <input
                  value={settings.aboutPage.trainersTitleEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, trainersTitleEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTrainersTitleAr}</span>
                <input
                  value={settings.aboutPage.trainersTitleAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, trainersTitleAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTrainersCtaEn}</span>
                <input
                  value={settings.aboutPage.trainersCtaEn}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, trainersCtaEn: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.aboutTrainersCtaAr}</span>
                <input
                  value={settings.aboutPage.trainersCtaAr}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aboutPage: { ...prev.aboutPage, trainersCtaAr: event.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {settings.aboutPage.trainerHighlights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  {t.aboutTrainerEmpty}
                </div>
              ) : null}
              {settings.aboutPage.trainerHighlights.map((item, index) => (
                <div
                  key={`about-trainer-${index}`}
                  className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.aboutTrainerCard} {index + 1}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveAboutTrainerHighlight(index, -1)}
                        disabled={index === 0}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FiArrowUp className="size-3.5" />
                        {t.moveUp}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAboutTrainerHighlight(index, 1)}
                        disabled={index === settings.aboutPage.trainerHighlights.length - 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FiArrowDown className="size-3.5" />
                        {t.moveDown}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAboutTrainerHighlight(index)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        <FiTrash2 className="size-3.5" />
                        {t.aboutTrainerRemove}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={item.nameEn}
                      onChange={(event) => setAboutTrainerHighlight(index, "nameEn", event.target.value)}
                      placeholder={t.aboutTrainerNameEn}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      value={item.nameAr}
                      onChange={(event) => setAboutTrainerHighlight(index, "nameAr", event.target.value)}
                      placeholder={t.aboutTrainerNameAr}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={item.imageSrc}
                      onChange={(event) => setAboutTrainerHighlight(index, "imageSrc", event.target.value)}
                      placeholder={t.aboutTrainerImage}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <FiUpload className="size-3.5" />
                      {uploadingAboutTrainerImageIndex === index ? t.aboutUploading : t.aboutUpload}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAboutTrainerImageIndex !== null}
                        onChange={(event) => {
                          void handleAboutTrainerImageUpload(index, event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {isFaqPage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.faqSection}</h2>
            <button
              type="button"
              onClick={addFaqItem}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FiPlus className="size-3.5" />
              {t.faqAdd}
            </button>
          </div>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.faqHint}</p>

          <div className="space-y-4">
            {settings.faqItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.faqListEmpty}
              </div>
            ) : null}

            {settings.faqItems.map((item, index) => (
              <div
                key={`faq-item-${index}`}
                className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.faqItem} {index + 1}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveFaqItem(index, -1)}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowUp className="size-3.5" />
                      {t.faqMoveUp}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFaqItem(index, 1)}
                      disabled={index === settings.faqItems.length - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowDown className="size-3.5" />
                      {t.faqMoveDown}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFaqItem(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      <FiTrash2 className="size-3.5" />
                      {t.faqRemove}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.faqCategoryEn}</span>
                    <input
                      value={item.categoryEn}
                      onChange={(event) => setFaqItem(index, "categoryEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.faqCategoryAr}</span>
                    <input
                      value={item.categoryAr}
                      onChange={(event) => setFaqItem(index, "categoryAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.faqQuestionEn}</span>
                    <input
                      value={item.questionEn}
                      onChange={(event) => setFaqItem(index, "questionEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.faqQuestionAr}</span>
                    <input
                      value={item.questionAr}
                      onChange={(event) => setFaqItem(index, "questionAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.faqAnswerEn}</span>
                    <textarea
                      rows={4}
                      value={item.answerEn}
                      onChange={(event) => setFaqItem(index, "answerEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.faqAnswerAr}</span>
                    <textarea
                      rows={4}
                      value={item.answerAr}
                      onChange={(event) => setFaqItem(index, "answerAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isTermsPage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.termsSectionTitle}</h2>
            <button
              type="button"
              onClick={addTermsSection}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FiPlus className="size-3.5" />
              {t.termsAdd}
            </button>
          </div>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.termsHint}</p>

          <div className="space-y-4">
            {settings.termsSections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.termsListEmpty}
              </div>
            ) : null}

            {settings.termsSections.map((item, index) => (
              <div
                key={`terms-section-${index}`}
                className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.termsBlock} {index + 1}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveTermsSection(index, -1)}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowUp className="size-3.5" />
                      {t.termsMoveUp}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTermsSection(index, 1)}
                      disabled={index === settings.termsSections.length - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiArrowDown className="size-3.5" />
                      {t.termsMoveDown}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTermsSection(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800/70 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      <FiTrash2 className="size-3.5" />
                      {t.termsRemove}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.termsTitleEn}</span>
                    <input
                      value={item.titleEn}
                      onChange={(event) => setTermsSection(index, "titleEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.termsTitleAr}</span>
                    <input
                      value={item.titleAr}
                      onChange={(event) => setTermsSection(index, "titleAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.termsBodyEn}</span>
                    <textarea
                      rows={5}
                      value={item.bodyEn}
                      onChange={(event) => setTermsSection(index, "bodyEn", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.termsBodyAr}</span>
                    <textarea
                      rows={5}
                      value={item.bodyAr}
                      onChange={(event) => setTermsSection(index, "bodyAr", event.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isContactPage && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.contactSection}</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.contactHint}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactSubtitleEn}</span>
              <textarea
                rows={3}
                value={settings.contactPage.subtitleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, subtitleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactSubtitleAr}</span>
              <textarea
                rows={3}
                value={settings.contactPage.subtitleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, subtitleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactHelperEn}</span>
              <textarea
                rows={2}
                value={settings.contactPage.helperEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, helperEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactHelperAr}</span>
              <textarea
                rows={2}
                value={settings.contactPage.helperAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, helperAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactAddressEn}</span>
              <input
                value={settings.contactPage.addressEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, addressEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactAddressAr}</span>
              <input
                value={settings.contactPage.addressAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, addressAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactHoursEn}</span>
              <input
                value={settings.contactPage.officeHoursEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, officeHoursEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactHoursAr}</span>
              <input
                value={settings.contactPage.officeHoursAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, officeHoursAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactPhone}</span>
              <input
                value={settings.contactPage.phonePrimary}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, phonePrimary: event.target.value },
                  }))
                }
                placeholder="+968 98199508"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactEmail}</span>
              <input
                value={settings.contactPage.emailPrimary}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, emailPrimary: event.target.value },
                  }))
                }
                placeholder="info@noonomanarts.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactWhatsapp}</span>
              <input
                value={settings.contactPage.whatsappUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, whatsappUrl: event.target.value },
                  }))
                }
                placeholder="https://wa.me/96800000000"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactInstagram}</span>
              <input
                value={settings.contactPage.instagramUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, instagramUrl: event.target.value },
                  }))
                }
                placeholder="https://instagram.com/noonomanarts"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactMapEmbed}</span>
              <input
                value={settings.contactPage.mapEmbedUrl}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, mapEmbedUrl: event.target.value },
                  }))
                }
                placeholder="https://www.google.com/maps/embed?..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactMapLink}</span>
              <input
                value={settings.contactPage.mapLink}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, mapLink: event.target.value },
                  }))
                }
                placeholder="https://maps.app.goo.gl/..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactSuccessTitleEn}</span>
              <input
                value={settings.contactPage.successTitleEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, successTitleEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactSuccessTitleAr}</span>
              <input
                value={settings.contactPage.successTitleAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, successTitleAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactSuccessMessageEn}</span>
              <textarea
                rows={2}
                value={settings.contactPage.successMessageEn}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, successMessageEn: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactSuccessMessageAr}</span>
              <textarea
                rows={2}
                value={settings.contactPage.successMessageAr}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    contactPage: { ...prev.contactPage, successMessageAr: event.target.value },
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
          </div>
        </section>
      )}

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
