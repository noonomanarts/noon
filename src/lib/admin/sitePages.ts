export type SitePageGroup = "core" | "classes" | "events" | "commerce" | "account";

export type NavPlacement = "PRIMARY" | "SECONDARY" | "NONE";
export type PageVisibility = "PUBLISHED" | "DRAFT" | "HIDDEN";

export type HomeHeroSettings = {
  primaryCtaEn: string;
  primaryCtaAr: string;
  secondaryCtaEn: string;
  secondaryCtaAr: string;
  trustLineEn: string;
  trustLineAr: string;
  slideImages: string[];
  autoplayMs: number;
};

export type SitePageDefinition = {
  key: string;
  pathTemplate: string;
  group: SitePageGroup;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  defaultNavPlacement: NavPlacement;
  defaultFooterVisible: boolean;
  defaultVisibility?: PageVisibility;
};

export type SitePageSettings = {
  visibility: PageVisibility;
  navPlacement: NavPlacement;
  footerVisible: boolean;
  indexable: boolean;
  headingEn: string;
  headingAr: string;
  subheadingEn: string;
  subheadingAr: string;
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  keywordsEn: string[];
  keywordsAr: string[];
  canonicalUrl: string;
  ogImage: string;
  customCssClass: string;
  notes: string;
  homeHero: HomeHeroSettings;
};

export const sitePageCatalog: SitePageDefinition[] = [
  {
    key: "home",
    pathTemplate: "/",
    group: "core",
    nameEn: "Home",
    nameAr: "الصفحة الرئيسية",
    descriptionEn: "Main landing page and hero sections.",
    descriptionAr: "الصفحة الافتتاحية الرئيسية ومحتوى البداية.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "about",
    pathTemplate: "/about",
    group: "core",
    nameEn: "About Us",
    nameAr: "من نحن",
    descriptionEn: "Brand story, founder, team, and mission.",
    descriptionAr: "قصة العلامة، المؤسسة، الفريق، ورسالة نون.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "contact",
    pathTemplate: "/contact",
    group: "core",
    nameEn: "Contact Us",
    nameAr: "تواصل معنا",
    descriptionEn: "Contact form and support details.",
    descriptionAr: "نموذج التواصل وبيانات الدعم.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "faqs",
    pathTemplate: "/faqs",
    group: "core",
    nameEn: "FAQs",
    nameAr: "الأسئلة الشائعة",
    descriptionEn: "Frequently asked questions and quick answers.",
    descriptionAr: "الأسئلة الأكثر شيوعًا وإجاباتها.",
    defaultNavPlacement: "SECONDARY",
    defaultFooterVisible: true,
  },
  {
    key: "terms",
    pathTemplate: "/terms",
    group: "core",
    nameEn: "Terms & Conditions",
    nameAr: "الشروط والأحكام",
    descriptionEn: "Terms, legal conditions, and policies.",
    descriptionAr: "الشروط والسياسات والأحكام القانونية.",
    defaultNavPlacement: "SECONDARY",
    defaultFooterVisible: true,
  },
  {
    key: "search",
    pathTemplate: "/search",
    group: "core",
    nameEn: "Search",
    nameAr: "البحث",
    descriptionEn: "Global search page for classes and content.",
    descriptionAr: "صفحة البحث الشامل للدورات والمحتوى.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "noon_recommends",
    pathTemplate: "/noon-recommends",
    group: "core",
    nameEn: "Noon Recommends",
    nameAr: "توصيات نون",
    descriptionEn: "Recommended tools, brands, and products.",
    descriptionAr: "ترشيحات الأدوات والمنتجات والعلامات.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "login",
    pathTemplate: "/login",
    group: "core",
    nameEn: "Login",
    nameAr: "تسجيل الدخول",
    descriptionEn: "Login page for customer and admin users.",
    descriptionAr: "صفحة تسجيل الدخول للعملاء والإدارة.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: false,
  },
  {
    key: "register",
    pathTemplate: "/register",
    group: "core",
    nameEn: "Register",
    nameAr: "إنشاء حساب",
    descriptionEn: "Customer registration and onboarding page.",
    descriptionAr: "صفحة تسجيل حساب جديد للعملاء.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: false,
  },
  {
    key: "classes_index",
    pathTemplate: "/classes",
    group: "classes",
    nameEn: "Classes Hub",
    nameAr: "صفحة الدورات",
    descriptionEn: "Main directory of classes.",
    descriptionAr: "الصفحة الجامعة لجميع الدورات.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "classes_cooking",
    pathTemplate: "/classes/cooking",
    group: "classes",
    nameEn: "Cooking Classes",
    nameAr: "دورات الطبخ",
    descriptionEn: "Cooking classes listing page.",
    descriptionAr: "صفحة قائمة دورات الطبخ.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "classes_arts_crafts",
    pathTemplate: "/classes/arts-crafts",
    group: "classes",
    nameEn: "Arts & Crafts Classes",
    nameAr: "دورات الفنون والأشغال",
    descriptionEn: "Arts and crafts classes listing page.",
    descriptionAr: "صفحة قائمة دورات الفنون والأشغال.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "class_detail_template",
    pathTemplate: "/classes/[slug]",
    group: "classes",
    nameEn: "Class Detail Template",
    nameAr: "قالب تفاصيل الدورة",
    descriptionEn: "Template settings for class detail pages.",
    descriptionAr: "إعدادات قالب صفحات تفاصيل الدورة.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "class_booking_template",
    pathTemplate: "/classes/[slug]/book",
    group: "classes",
    nameEn: "Class Booking Template",
    nameAr: "قالب حجز الدورة",
    descriptionEn: "Template settings for class booking pages.",
    descriptionAr: "إعدادات قالب صفحات حجز الدورة.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "events_index",
    pathTemplate: "/group-booking-events",
    group: "events",
    nameEn: "Group Events Hub",
    nameAr: "صفحة فعاليات المجموعات",
    descriptionEn: "Main page for group events and bookings.",
    descriptionAr: "الصفحة الرئيسية لفعاليات وحجوزات المجموعات.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "events_competition",
    pathTemplate: "/group-booking-events/cooking-competition",
    group: "events",
    nameEn: "Cooking Competition",
    nameAr: "مسابقة الطبخ",
    descriptionEn: "Information page for cooking competition.",
    descriptionAr: "صفحة تفاصيل مسابقة الطبخ.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "events_competition_booking",
    pathTemplate: "/group-booking-events/cooking-competition/book",
    group: "events",
    nameEn: "Cooking Competition Booking",
    nameAr: "حجز مسابقة الطبخ",
    descriptionEn: "Booking flow for cooking competition.",
    descriptionAr: "رحلة حجز مسابقة الطبخ.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "events_private_classes",
    pathTemplate: "/group-booking-events/private-classes",
    group: "events",
    nameEn: "Private Classes",
    nameAr: "الدروس الخاصة",
    descriptionEn: "Information page for private classes.",
    descriptionAr: "صفحة تفاصيل الدروس الخاصة.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "events_private_classes_booking",
    pathTemplate: "/group-booking-events/private-classes/book",
    group: "events",
    nameEn: "Private Classes Booking",
    nameAr: "حجز الدروس الخاصة",
    descriptionEn: "Booking flow for private classes.",
    descriptionAr: "رحلة حجز الدروس الخاصة.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "events_birthday",
    pathTemplate: "/group-booking-events/birthday-parties",
    group: "events",
    nameEn: "Birthday Parties",
    nameAr: "حفلات أعياد الميلاد",
    descriptionEn: "Information page for birthday parties.",
    descriptionAr: "صفحة تفاصيل حفلات أعياد الميلاد.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "events_birthday_booking",
    pathTemplate: "/group-booking-events/birthday-parties/book",
    group: "events",
    nameEn: "Birthday Booking",
    nameAr: "حجز حفلة عيد ميلاد",
    descriptionEn: "Booking flow for birthday events.",
    descriptionAr: "رحلة حجز فعالية عيد الميلاد.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "shop_index",
    pathTemplate: "/shop",
    group: "commerce",
    nameEn: "Shop",
    nameAr: "المتجر",
    descriptionEn: "Main shopping page and categories.",
    descriptionAr: "الصفحة الرئيسية للمتجر وتصنيفاته.",
    defaultNavPlacement: "PRIMARY",
    defaultFooterVisible: true,
  },
  {
    key: "shop_category_template",
    pathTemplate: "/shop/[category]",
    group: "commerce",
    nameEn: "Shop Category Template",
    nameAr: "قالب تصنيف المتجر",
    descriptionEn: "Template settings for category listing pages.",
    descriptionAr: "إعدادات قالب صفحات تصنيفات المتجر.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "shop_product_template",
    pathTemplate: "/shop/product/[slug]",
    group: "commerce",
    nameEn: "Product Detail Template",
    nameAr: "قالب تفاصيل المنتج",
    descriptionEn: "Template settings for product detail pages.",
    descriptionAr: "إعدادات قالب صفحات تفاصيل المنتج.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "cart",
    pathTemplate: "/cart",
    group: "commerce",
    nameEn: "Cart",
    nameAr: "السلة",
    descriptionEn: "Cart page and item summary.",
    descriptionAr: "صفحة السلة وملخص المنتجات.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "checkout",
    pathTemplate: "/checkout",
    group: "commerce",
    nameEn: "Checkout",
    nameAr: "إتمام الشراء",
    descriptionEn: "Checkout and payment flow.",
    descriptionAr: "رحلة إتمام الشراء والدفع.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "trainers",
    pathTemplate: "/trainers",
    group: "core",
    nameEn: "Trainers",
    nameAr: "المدربون",
    descriptionEn: "Trainers listing page.",
    descriptionAr: "صفحة قائمة المدربين.",
    defaultNavPlacement: "SECONDARY",
    defaultFooterVisible: true,
  },
  {
    key: "trainer_profile_template",
    pathTemplate: "/trainers/[trainerId]",
    group: "core",
    nameEn: "Trainer Profile Template",
    nameAr: "قالب ملف المدرب",
    descriptionEn: "Template settings for trainer profile pages.",
    descriptionAr: "إعدادات قالب صفحات ملف المدرب.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "account_dashboard",
    pathTemplate: "/account",
    group: "account",
    nameEn: "Account Dashboard",
    nameAr: "لوحة الحساب",
    descriptionEn: "Main customer account overview page.",
    descriptionAr: "الصفحة الرئيسية للوحة حساب العميل.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "account_profile",
    pathTemplate: "/account/profile",
    group: "account",
    nameEn: "Account Profile",
    nameAr: "الملف الشخصي",
    descriptionEn: "Customer profile settings page.",
    descriptionAr: "صفحة إعدادات الملف الشخصي للعميل.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "account_orders",
    pathTemplate: "/account/orders",
    group: "account",
    nameEn: "My Orders",
    nameAr: "طلباتي",
    descriptionEn: "Customer order and bookings history.",
    descriptionAr: "سجل طلبات وحجوزات العميل.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "account_wallet",
    pathTemplate: "/account/wallet",
    group: "account",
    nameEn: "Wallet",
    nameAr: "المحفظة",
    descriptionEn: "Wallet balance and transaction page.",
    descriptionAr: "صفحة الرصيد وحركات المحفظة.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "account_loyalty",
    pathTemplate: "/account/loyalty",
    group: "account",
    nameEn: "Loyalty",
    nameAr: "الولاء",
    descriptionEn: "Loyalty points and rewards page.",
    descriptionAr: "صفحة نقاط الولاء والمكافآت.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "account_notifications",
    pathTemplate: "/account/notifications",
    group: "account",
    nameEn: "Notifications",
    nameAr: "الإشعارات",
    descriptionEn: "Customer notifications center.",
    descriptionAr: "مركز إشعارات العميل.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
  {
    key: "account_settings",
    pathTemplate: "/account/settings",
    group: "account",
    nameEn: "Account Settings",
    nameAr: "إعدادات الحساب",
    descriptionEn: "Personal and account settings page.",
    descriptionAr: "صفحة الإعدادات الشخصية والحساب.",
    defaultNavPlacement: "NONE",
    defaultFooterVisible: true,
  },
];

const sitePageMap = new Map(sitePageCatalog.map((page) => [page.key, page]));

function toSafeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function toKeywordArray(value: unknown, maxItems: number, maxItemLength: number): string[] {
  const list =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value
        : [];

  const normalized = list
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .map((item) => item.slice(0, maxItemLength));

  return Array.from(new Set(normalized)).slice(0, maxItems);
}

function toStringArray(value: unknown, maxItems: number, maxItemLength: number): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];

  const normalized = list
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .map((item) => item.slice(0, maxItemLength));

  return Array.from(new Set(normalized)).slice(0, maxItems);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function toVisibility(value: unknown, fallback: PageVisibility): PageVisibility {
  if (value === "PUBLISHED" || value === "DRAFT" || value === "HIDDEN") return value;
  return fallback;
}

function toNavPlacement(value: unknown, fallback: NavPlacement): NavPlacement {
  if (value === "PRIMARY" || value === "SECONDARY" || value === "NONE") return value;
  return fallback;
}

function toNumberInRange(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function makeSitePageSettingsKey(pageKey: string): string {
  return `page:${pageKey}`;
}

export function getSitePageByKey(pageKey: string): SitePageDefinition | null {
  return sitePageMap.get(pageKey) ?? null;
}

export function buildLocalizedPagePath(pathTemplate: string, locale: "en" | "ar"): string {
  if (pathTemplate === "/") return `/${locale}`;
  return `/${locale}${pathTemplate}`;
}

export function isDynamicPathTemplate(pathTemplate: string): boolean {
  return pathTemplate.includes("[") || pathTemplate.includes("]");
}

export function getDefaultSitePageSettings(page: SitePageDefinition): SitePageSettings {
  return {
    visibility: page.defaultVisibility ?? "PUBLISHED",
    navPlacement: page.defaultNavPlacement,
    footerVisible: page.defaultFooterVisible,
    indexable: true,
    headingEn: page.nameEn,
    headingAr: page.nameAr,
    subheadingEn: page.descriptionEn,
    subheadingAr: page.descriptionAr,
    seoTitleEn: `${page.nameEn} | Noon`,
    seoTitleAr: `${page.nameAr} | نون`,
    seoDescriptionEn: page.descriptionEn,
    seoDescriptionAr: page.descriptionAr,
    keywordsEn: [],
    keywordsAr: [],
    canonicalUrl: "",
    ogImage: "",
    customCssClass: "",
    notes: "",
    homeHero: {
      primaryCtaEn: "Explore classes",
      primaryCtaAr: "استكشف الدورات",
      secondaryCtaEn: "Book an event",
      secondaryCtaAr: "احجز فعالية",
      trustLineEn: "Trusted classes and events for teams, families, and individuals.",
      trustLineAr: "تجربة موثوقة للمجموعات والعائلات والأفراد.",
      slideImages: [
        "/images/slides/1.jpg",
        "/images/slides/2.jpg",
        "/images/slides/3.jpg",
        "/images/slides/4.jpg",
        "/images/slides/5.jpg",
        "/images/slides/6.jpg",
      ],
      autoplayMs: 3800,
    },
  };
}

export function sanitizeSitePageSettings(
  page: SitePageDefinition,
  input: Partial<SitePageSettings> | null | undefined
): SitePageSettings {
  const defaults = getDefaultSitePageSettings(page);
  const source: Partial<SitePageSettings> = { ...defaults, ...(input ?? {}) };
  const rawSlideImages = input?.homeHero?.slideImages;
  const hasExplicitSlideImages = Array.isArray(rawSlideImages) || typeof rawSlideImages === "string";
  const normalizedSlideImages = toStringArray(source.homeHero?.slideImages, 12, 300);

  return {
    visibility: toVisibility(source.visibility, defaults.visibility),
    navPlacement: toNavPlacement(source.navPlacement, defaults.navPlacement),
    footerVisible: toBoolean(source.footerVisible, defaults.footerVisible),
    indexable: toBoolean(source.indexable, defaults.indexable),
    headingEn: toSafeString(source.headingEn, 180),
    headingAr: toSafeString(source.headingAr, 180),
    subheadingEn: toSafeString(source.subheadingEn, 500),
    subheadingAr: toSafeString(source.subheadingAr, 500),
    seoTitleEn: toSafeString(source.seoTitleEn, 180),
    seoTitleAr: toSafeString(source.seoTitleAr, 180),
    seoDescriptionEn: toSafeString(source.seoDescriptionEn, 500),
    seoDescriptionAr: toSafeString(source.seoDescriptionAr, 500),
    keywordsEn: toKeywordArray(source.keywordsEn, 24, 50),
    keywordsAr: toKeywordArray(source.keywordsAr, 24, 50),
    canonicalUrl: toSafeString(source.canonicalUrl, 500),
    ogImage: toSafeString(source.ogImage, 500),
    customCssClass: toSafeString(source.customCssClass, 120),
    notes: toSafeString(source.notes, 4000),
    homeHero: {
      primaryCtaEn: toSafeString(source.homeHero?.primaryCtaEn, 120) || defaults.homeHero.primaryCtaEn,
      primaryCtaAr: toSafeString(source.homeHero?.primaryCtaAr, 120) || defaults.homeHero.primaryCtaAr,
      secondaryCtaEn: toSafeString(source.homeHero?.secondaryCtaEn, 120) || defaults.homeHero.secondaryCtaEn,
      secondaryCtaAr: toSafeString(source.homeHero?.secondaryCtaAr, 120) || defaults.homeHero.secondaryCtaAr,
      trustLineEn: toSafeString(source.homeHero?.trustLineEn, 280) || defaults.homeHero.trustLineEn,
      trustLineAr: toSafeString(source.homeHero?.trustLineAr, 280) || defaults.homeHero.trustLineAr,
      slideImages: hasExplicitSlideImages ? normalizedSlideImages : defaults.homeHero.slideImages,
      autoplayMs: toNumberInRange(source.homeHero?.autoplayMs, defaults.homeHero.autoplayMs, 2000, 12000),
    },
  };
}
