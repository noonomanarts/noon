export type SitePageGroup = "core" | "classes" | "events" | "commerce" | "account";

export type NavPlacement = "PRIMARY" | "SECONDARY" | "NONE";
export type PageVisibility = "PUBLISHED" | "DRAFT" | "HIDDEN";
export type HomeHeroMediaType = "image" | "video";

export type HomeHeroSettings = {
  primaryCtaEn: string;
  primaryCtaAr: string;
  primaryCtaHref: string;
  primaryCtaColor: string;
  secondaryCtaEn: string;
  secondaryCtaAr: string;
  secondaryCtaHref: string;
  secondaryCtaColor: string;
  backgroundMediaType: HomeHeroMediaType;
  backgroundImageSrc: string;
  backgroundVideoSrc: string;
  slideImages: string[];
  autoplayMs: number;
};

export type HomeLayoutSettings = {
  showHero: boolean;
  showCourses: boolean;
  showNumbers: boolean;
  showUpcoming: boolean;
  showWhyNoon: boolean;
  showPartners: boolean;
};

export type HomeCoursesSettings = {
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  cookingTitleEn: string;
  cookingTitleAr: string;
  cookingDescriptionEn: string;
  cookingDescriptionAr: string;
  cookingImageSrc: string;
  cookingDisplayMode: "icon" | "image";
  cookingIcon: "cooking-pot" | "chef-hat" | "utensils";
  artsTitleEn: string;
  artsTitleAr: string;
  artsDescriptionEn: string;
  artsDescriptionAr: string;
  artsImageSrc: string;
  artsDisplayMode: "icon" | "image";
  artsIcon: "palette" | "craft" | "brush";
};

export type HomeUpcomingItemSettings = {
  titleEn: string;
  titleAr: string;
  datetimeTextEn: string;
  datetimeTextAr: string;
  priceTextEn: string;
  priceTextAr: string;
  imageSrc: string;
  href: string;
};

export type HomeUpcomingSettings = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bookNowLabelEn: string;
  bookNowLabelAr: string;
  items: HomeUpcomingItemSettings[];
};

export type HomeNumbersItemSettings = {
  valueEn: string;
  valueAr: string;
  labelEn: string;
  labelAr: string;
};

export type HomeNumbersSettings = {
  titleEn: string;
  titleAr: string;
  items: HomeNumbersItemSettings[];
};

export type HomeWhyNoonItemSettings = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
};

export type HomeWhyNoonSettings = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  backgroundImageSrc: string;
  sectionTitleColor: string;
  cardTitleColor: string;
  items: HomeWhyNoonItemSettings[];
};

export type HomePartnerItemSettings = {
  nameEn: string;
  nameAr: string;
  logoSrc: string;
};

export type HomePartnersSettings = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  items: HomePartnerItemSettings[];
};

export type FaqItemSettings = {
  categoryEn: string;
  categoryAr: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
};

export type TermsSectionSettings = {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
};

export type ContactPageSettings = {
  subtitleEn: string;
  subtitleAr: string;
  helperEn: string;
  helperAr: string;
  addressEn: string;
  addressAr: string;
  officeHoursEn: string;
  officeHoursAr: string;
  phonePrimary: string;
  emailPrimary: string;
  whatsappUrl: string;
  instagramUrl: string;
  mapEmbedUrl: string;
  mapLink: string;
  successTitleEn: string;
  successTitleAr: string;
  successMessageEn: string;
  successMessageAr: string;
};

export type AboutFeatureItemSettings = {
  textEn: string;
  textAr: string;
};

export type AboutTeamMemberSettings = {
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  imageSrc: string;
};

export type AboutTrainerHighlightSettings = {
  nameEn: string;
  nameAr: string;
  imageSrc: string;
};

export type AboutPageSettings = {
  heroImageSrc: string;
  aboutTitleEn: string;
  aboutTitleAr: string;
  aboutBodyEn: string;
  aboutBodyAr: string;
  founderTitleEn: string;
  founderTitleAr: string;
  founderBodyEn: string;
  founderBodyAr: string;
  founderQuoteEn: string;
  founderQuoteAr: string;
  founderImageSrc: string;
  whatWeDoTitleEn: string;
  whatWeDoTitleAr: string;
  whatWeDoItems: AboutFeatureItemSettings[];
  teamTitleEn: string;
  teamTitleAr: string;
  teamMembers: AboutTeamMemberSettings[];
  trainersTitleEn: string;
  trainersTitleAr: string;
  trainersCtaEn: string;
  trainersCtaAr: string;
  trainerHighlights: AboutTrainerHighlightSettings[];
  familyTitleEn: string;
  familyTitleAr: string;
  familyBodyEn: string;
  familyBodyAr: string;
  familyImageSrc: string;
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
  homeCourses: HomeCoursesSettings;
  homeUpcoming: HomeUpcomingSettings;
  homeWhyNoon: HomeWhyNoonSettings;
  homePartners: HomePartnersSettings;
  homeNumbers: HomeNumbersSettings;
  homeLayout: HomeLayoutSettings;
  faqItems: FaqItemSettings[];
  termsSections: TermsSectionSettings[];
  contactPage: ContactPageSettings;
  aboutPage: AboutPageSettings;
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

function toOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

function toHexColor(value: unknown, fallback: string): string {
  const normalized = toSafeString(value, 16).toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return fallback;

  if (match[1].length === 3) {
    const [r, g, b] = match[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return normalized;
}

function toSafeHref(value: unknown, fallback: string): string {
  const normalized = toSafeString(value, 320);
  if (!normalized) return fallback;

  const isInternal = normalized.startsWith("/") || normalized.startsWith("#");
  const isAbsolute = /^(https?:\/\/|mailto:|tel:)/i.test(normalized);

  return isInternal || isAbsolute ? normalized : fallback;
}

function toSafeHttpUrl(value: unknown, fallback: string): string {
  const normalized = toSafeString(value, 500);
  if (!normalized) return fallback;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return fallback;
}

function isVideoSource(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(normalized);
}

function sanitizeHomeNumbersItems(
  value: unknown,
  fallback: HomeNumbersItemSettings[]
): HomeNumbersItemSettings[] {
  const list = Array.isArray(value) ? value : [];

  return fallback.map((fallbackItem, index) => {
    const candidate = list[index];
    const source =
      candidate && typeof candidate === "object"
        ? (candidate as Partial<HomeNumbersItemSettings>)
        : {};

    return {
      valueEn: toSafeString(source.valueEn, 40) || fallbackItem.valueEn,
      valueAr: toSafeString(source.valueAr, 40) || fallbackItem.valueAr,
      labelEn: toSafeString(source.labelEn, 180) || fallbackItem.labelEn,
      labelAr: toSafeString(source.labelAr, 180) || fallbackItem.labelAr,
    };
  });
}

function sanitizeHomeWhyNoonItems(
  value: unknown,
  fallback: HomeWhyNoonItemSettings[]
): HomeWhyNoonItemSettings[] {
  const list = Array.isArray(value) ? value : [];

  return fallback.map((fallbackItem, index) => {
    const candidate = list[index];
    const source =
      candidate && typeof candidate === "object"
        ? (candidate as Partial<HomeWhyNoonItemSettings>)
        : {};

    return {
      titleEn: toSafeString(source.titleEn, 180) || fallbackItem.titleEn,
      titleAr: toSafeString(source.titleAr, 180) || fallbackItem.titleAr,
      descriptionEn: toSafeString(source.descriptionEn, 500) || fallbackItem.descriptionEn,
      descriptionAr: toSafeString(source.descriptionAr, 500) || fallbackItem.descriptionAr,
    };
  });
}

function sanitizeHomeUpcomingItems(
  value: unknown,
  fallback: HomeUpcomingItemSettings[]
): HomeUpcomingItemSettings[] {
  const list = Array.isArray(value) ? value : [];
  const sourceList = list.length > 0 ? list : fallback;

  const normalized = sourceList.map((candidate, index) => {
    const fallbackItem =
      fallback[index] ??
      fallback[fallback.length - 1] ?? {
        titleEn: `Upcoming Class ${index + 1}`,
        titleAr: `دورة قادمة ${index + 1}`,
        datetimeTextEn: "Jan 12 · 6:00 PM",
        datetimeTextAr: "12 يناير · 6:00 مساءً",
        priceTextEn: "OMR 25",
        priceTextAr: "25 ر.ع",
        imageSrc: "/og-image.png",
        href: "/classes/cooking",
      };
    const source =
      candidate && typeof candidate === "object"
        ? (candidate as Partial<HomeUpcomingItemSettings>)
        : {};

    return {
      titleEn: toSafeString(source.titleEn, 180) || fallbackItem.titleEn,
      titleAr: toSafeString(source.titleAr, 180) || fallbackItem.titleAr,
      datetimeTextEn: toSafeString(source.datetimeTextEn, 120) || fallbackItem.datetimeTextEn,
      datetimeTextAr: toSafeString(source.datetimeTextAr, 120) || fallbackItem.datetimeTextAr,
      priceTextEn: toSafeString(source.priceTextEn, 80) || fallbackItem.priceTextEn,
      priceTextAr: toSafeString(source.priceTextAr, 80) || fallbackItem.priceTextAr,
      imageSrc: toSafeString(source.imageSrc, 500) || fallbackItem.imageSrc,
      href: toSafeHref(source.href, fallbackItem.href),
    };
  });

  const filtered = normalized.filter(
    (item) =>
      Boolean(item.titleEn.trim()) ||
      Boolean(item.titleAr.trim()) ||
      Boolean(item.datetimeTextEn.trim()) ||
      Boolean(item.datetimeTextAr.trim()) ||
      Boolean(item.priceTextEn.trim()) ||
      Boolean(item.priceTextAr.trim()) ||
      Boolean(item.imageSrc.trim())
  );

  if (filtered.length === 0) return fallback;
  return filtered;
}

function sanitizeHomePartnersItems(
  value: unknown,
  fallback: HomePartnerItemSettings[]
): HomePartnerItemSettings[] {
  const list = Array.isArray(value) ? value : [];
  const sourceList = list.length > 0 ? list : fallback;
  const normalized = sourceList.map((candidate, index) => {
    const fallbackItem =
      fallback[index] ??
      fallback[fallback.length - 1] ?? {
        nameEn: `Partner ${index + 1}`,
        nameAr: `شريك ${index + 1}`,
        logoSrc: "",
      };
    const source =
      candidate && typeof candidate === "object"
        ? (candidate as Partial<HomePartnerItemSettings>)
        : {};

    return {
      nameEn: toSafeString(source.nameEn, 180) || fallbackItem.nameEn,
      nameAr: toSafeString(source.nameAr, 180) || fallbackItem.nameAr,
      logoSrc: toSafeString(source.logoSrc, 500),
    };
  });

  const filtered = normalized.filter(
    (item) => Boolean(item.nameEn.trim()) || Boolean(item.nameAr.trim()) || Boolean(item.logoSrc.trim())
  );

  if (filtered.length === 0) return fallback;
  return filtered;
}

function sanitizeFaqItems(value: unknown, fallback: FaqItemSettings[]): FaqItemSettings[] {
  const list = Array.isArray(value) ? value : fallback;
  const normalized = list.slice(0, 120).map((candidate) => {
    const source = candidate && typeof candidate === "object" ? (candidate as Partial<FaqItemSettings>) : {};
    return {
      categoryEn: toSafeString(source.categoryEn, 120),
      categoryAr: toSafeString(source.categoryAr, 120),
      questionEn: toSafeString(source.questionEn, 300),
      questionAr: toSafeString(source.questionAr, 300),
      answerEn: toSafeString(source.answerEn, 4000),
      answerAr: toSafeString(source.answerAr, 4000),
    };
  });

  return normalized.filter(
    (item) =>
      Boolean(item.questionEn) ||
      Boolean(item.questionAr) ||
      Boolean(item.answerEn) ||
      Boolean(item.answerAr) ||
      Boolean(item.categoryEn) ||
      Boolean(item.categoryAr)
  );
}

function sanitizeTermsSections(value: unknown, fallback: TermsSectionSettings[]): TermsSectionSettings[] {
  const list = Array.isArray(value) ? value : fallback;
  const normalized = list.slice(0, 80).map((candidate, index) => {
    const fallbackItem =
      fallback[index] ??
      fallback[fallback.length - 1] ?? {
        titleEn: `Section ${index + 1}`,
        titleAr: `القسم ${index + 1}`,
        bodyEn: "",
        bodyAr: "",
      };
    const source =
      candidate && typeof candidate === "object"
        ? (candidate as Partial<TermsSectionSettings>)
        : {};
    return {
      titleEn: toSafeString(source.titleEn, 220) || fallbackItem.titleEn,
      titleAr: toSafeString(source.titleAr, 220) || fallbackItem.titleAr,
      bodyEn: toSafeString(source.bodyEn, 8000),
      bodyAr: toSafeString(source.bodyAr, 8000),
    };
  });

  return normalized.filter(
    (item) => Boolean(item.titleEn) || Boolean(item.titleAr) || Boolean(item.bodyEn) || Boolean(item.bodyAr)
  );
}

function sanitizeAboutFeatures(
  value: unknown,
  fallback: AboutFeatureItemSettings[]
): AboutFeatureItemSettings[] {
  const list = Array.isArray(value) ? value : fallback;
  const normalized = list.slice(0, 40).map((candidate) => {
    const source = candidate && typeof candidate === "object" ? (candidate as Partial<AboutFeatureItemSettings>) : {};
    return {
      textEn: toSafeString(source.textEn, 240),
      textAr: toSafeString(source.textAr, 240),
    };
  });
  return normalized.filter((item) => Boolean(item.textEn) || Boolean(item.textAr));
}

function sanitizeAboutTeamMembers(
  value: unknown,
  fallback: AboutTeamMemberSettings[]
): AboutTeamMemberSettings[] {
  const list = Array.isArray(value) ? value : fallback;
  const normalized = list.slice(0, 48).map((candidate) => {
    const source = candidate && typeof candidate === "object" ? (candidate as Partial<AboutTeamMemberSettings>) : {};
    return {
      nameEn: toSafeString(source.nameEn, 180),
      nameAr: toSafeString(source.nameAr, 180),
      roleEn: toSafeString(source.roleEn, 180),
      roleAr: toSafeString(source.roleAr, 180),
      imageSrc: toSafeString(source.imageSrc, 500),
    };
  });
  return normalized.filter(
    (item) =>
      Boolean(item.nameEn) ||
      Boolean(item.nameAr) ||
      Boolean(item.roleEn) ||
      Boolean(item.roleAr) ||
      Boolean(item.imageSrc)
  );
}

function sanitizeAboutTrainerHighlights(
  value: unknown,
  fallback: AboutTrainerHighlightSettings[]
): AboutTrainerHighlightSettings[] {
  const list = Array.isArray(value) ? value : fallback;
  const normalized = list.slice(0, 48).map((candidate) => {
    const source =
      candidate && typeof candidate === "object"
        ? (candidate as Partial<AboutTrainerHighlightSettings>)
        : {};
    return {
      nameEn: toSafeString(source.nameEn, 180),
      nameAr: toSafeString(source.nameAr, 180),
      imageSrc: toSafeString(source.imageSrc, 500),
    };
  });
  return normalized.filter((item) => Boolean(item.nameEn) || Boolean(item.nameAr) || Boolean(item.imageSrc));
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
  const faqItems: FaqItemSettings[] =
    page.key === "faqs"
      ? [
          {
            categoryEn: "Booking",
            categoryAr: "الحجوزات",
            questionEn: "How do I book a workshop?",
            questionAr: "كيف يمكنني حجز ورشة؟",
            answerEn:
              "Open the class page, choose your preferred session, then complete checkout. You will receive confirmation by email.",
            answerAr:
              "افتح صفحة الدورة، اختر الجلسة المناسبة، ثم أكمل الدفع. ستصلك رسالة تأكيد عبر البريد الإلكتروني.",
          },
          {
            categoryEn: "Payments",
            categoryAr: "المدفوعات",
            questionEn: "Which payment methods are accepted?",
            questionAr: "ما طرق الدفع المقبولة؟",
            answerEn: "We accept cards and online payment methods listed on the checkout page.",
            answerAr: "نقبل البطاقات ووسائل الدفع الإلكتروني المتاحة في صفحة الدفع.",
          },
          {
            categoryEn: "Attendance",
            categoryAr: "الحضور",
            questionEn: "Can I transfer my booking to another person?",
            questionAr: "هل يمكن تحويل الحجز لشخص آخر؟",
            answerEn:
              "Yes, contact support before the class starts with your booking reference and replacement attendee details.",
            answerAr:
              "نعم، تواصل مع الدعم قبل بداية الدورة مع رقم الحجز وبيانات الشخص البديل.",
          },
          {
            categoryEn: "Policy",
            categoryAr: "السياسات",
            questionEn: "What is your cancellation policy?",
            questionAr: "ما هي سياسة الإلغاء؟",
            answerEn:
              "Cancellation and rescheduling terms depend on workshop type and timing. Please review policy details before confirming your booking.",
            answerAr:
              "تعتمد سياسة الإلغاء وإعادة الجدولة على نوع الورشة وتوقيتها. يرجى مراجعة تفاصيل السياسة قبل تأكيد الحجز.",
          },
        ]
      : [];
  const termsSections: TermsSectionSettings[] =
    page.key === "terms"
      ? [
          {
            titleEn: "Acceptance of Terms",
            titleAr: "قبول الشروط",
            bodyEn:
              "By using Noon services, you agree to these terms and all applicable policies published on the website.",
            bodyAr: "باستخدام خدمات نون، فإنك توافق على هذه الشروط وجميع السياسات المعمول بها والمنشورة في الموقع.",
          },
          {
            titleEn: "Bookings and Payments",
            titleAr: "الحجوزات والمدفوعات",
            bodyEn:
              "Workshop seats are confirmed only after successful payment. Prices and availability may change without prior notice.",
            bodyAr:
              "يتم تأكيد مقعد الورشة فقط بعد إتمام الدفع بنجاح. قد تتغير الأسعار والتوافر دون إشعار مسبق.",
          },
          {
            titleEn: "Changes, Cancellations, and Refunds",
            titleAr: "التعديلات والإلغاء والاسترجاع",
            bodyEn:
              "Reschedule, cancellation, and refund eligibility is determined by the policy linked to the booked workshop.",
            bodyAr:
              "تحدد أهلية إعادة الجدولة أو الإلغاء أو الاسترجاع وفق السياسة المرتبطة بالورشة المحجوزة.",
          },
          {
            titleEn: "Liability and Conduct",
            titleAr: "المسؤولية والسلوك",
            bodyEn:
              "Participants must follow trainer and safety instructions. Noon may deny access for behavior that affects safety or quality of experience.",
            bodyAr:
              "يلتزم المشاركون باتباع تعليمات المدرب والسلامة. ويحق لنون رفض المشاركة في حال السلوك الذي يؤثر على السلامة أو جودة التجربة.",
          },
        ]
      : [];
  const aboutPage: AboutPageSettings =
    page.key === "about"
      ? {
          heroImageSrc: "/images/cooking.png",
          aboutTitleEn: "About Noon",
          aboutTitleAr: "عن نون",
          aboutBodyEn:
            "Noon is a space for learning and joy through cooking, arts, and crafts. We design hands-on, expert-led experiences with a warm community that encourages sharing and exploration.",
          aboutBodyAr:
            "نون مساحة للتعلم والمرح عبر الطبخ والفنون والحرف. نصمم تجارب عملية يقودها خبراء، مع مجتمع دافئ يشجع على المشاركة والتجربة.",
          founderTitleEn: "Meet the Founder",
          founderTitleAr: "تعرف على المؤسسة",
          founderBodyEn:
            "Noon was founded to blend hands-on learning with creativity. We believe in rich experiences that inspire and build confidence.",
          founderBodyAr:
            "أسست نون لتكون وجهة تجمع بين التعلم العملي والإبداع. نؤمن بالتجارب الغنية التي تلهم وتدعم الثقة بالنفس.",
          founderQuoteEn: "I believe cooking and art bring people together and create lasting memories.",
          founderQuoteAr: "أؤمن أن الطهي والفن يقربان الناس ويخلقان ذكريات جميلة.",
          founderImageSrc: "/images/logo-noon.png",
          whatWeDoTitleEn: "What We Do",
          whatWeDoTitleAr: "ماذا نقدم",
          whatWeDoItems: [
            { textEn: "Expert-led, hands-on classes", textAr: "دورات عملية بقيادة خبراء" },
            { textEn: "Arts & crafts workshops for all levels", textAr: "ورش فنون وحرف لجميع المستويات" },
            { textEn: "Group events and corporate experiences", textAr: "فعاليات جماعية وتجارب للشركات" },
            {
              textEn: "Downloadable recipes and class resources",
              textAr: "مواد تدريبية ووصفات قابلة للتحميل",
            },
            { textEn: "A welcoming, community-first atmosphere", textAr: "مجتمع ودود يشجع المشاركة" },
          ],
          teamTitleEn: "The Noon Team",
          teamTitleAr: "فريق نون",
          teamMembers: [
            {
              nameEn: "Reem Al Abd",
              nameAr: "ريم العبد",
              roleEn: "Programs Lead",
              roleAr: "مديرة البرامج",
              imageSrc: "/images/art.png",
            },
            {
              nameEn: "Sara Al Kaabi",
              nameAr: "سارة الكعبي",
              roleEn: "Events Coordinator",
              roleAr: "منسقة الفعاليات",
              imageSrc: "/images/art.png",
            },
            {
              nameEn: "Omar Al Harthi",
              nameAr: "عمر الحارثي",
              roleEn: "Customer Experience",
              roleAr: "تجربة العملاء",
              imageSrc: "/images/art.png",
            },
            {
              nameEn: "Hind Al Faris",
              nameAr: "هند الفارس",
              roleEn: "Content & Marketing",
              roleAr: "المحتوى والتسويق",
              imageSrc: "/images/art.png",
            },
          ],
          trainersTitleEn: "Noon Trainers",
          trainersTitleAr: "مدربو نون",
          trainersCtaEn: "View all trainers",
          trainersCtaAr: "عرض جميع المدربين",
          trainerHighlights: [
            { nameEn: "Chef Maya", nameAr: "الشيف مايا", imageSrc: "/images/cooking.png" },
            { nameEn: "Chef Rashid", nameAr: "الشيف راشد", imageSrc: "/images/cooking.png" },
            { nameEn: "Arts Trainer: Lina", nameAr: "مدربة فنون: لينا", imageSrc: "/images/cooking.png" },
            { nameEn: "Pastry Trainer: Nasser", nameAr: "مدرب حلويات: ناصر", imageSrc: "/images/cooking.png" },
          ],
          familyTitleEn: "The Bigger Noon Family",
          familyTitleAr: "عائلة نون الكبيرة",
          familyBodyEn:
            "Behind every class and campaign is a crew of trusted freelancers who make the experience shine.",
          familyBodyAr: "خلف كل صف وحملة فريق من مستقلين موثوقين يجعل التجربة أجمل.",
          familyImageSrc: "/images/art.png",
        }
      : {
          heroImageSrc: "",
          aboutTitleEn: "",
          aboutTitleAr: "",
          aboutBodyEn: "",
          aboutBodyAr: "",
          founderTitleEn: "",
          founderTitleAr: "",
          founderBodyEn: "",
          founderBodyAr: "",
          founderQuoteEn: "",
          founderQuoteAr: "",
          founderImageSrc: "",
          whatWeDoTitleEn: "",
          whatWeDoTitleAr: "",
          whatWeDoItems: [],
          teamTitleEn: "",
          teamTitleAr: "",
          teamMembers: [],
          trainersTitleEn: "",
          trainersTitleAr: "",
          trainersCtaEn: "",
          trainersCtaAr: "",
          trainerHighlights: [],
          familyTitleEn: "",
          familyTitleAr: "",
          familyBodyEn: "",
          familyBodyAr: "",
          familyImageSrc: "",
        };

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
      primaryCtaHref: "/classes/cooking",
      primaryCtaColor: "#f77d6b",
      secondaryCtaEn: "Book an event",
      secondaryCtaAr: "احجز فعالية",
      secondaryCtaHref: "/classes/arts-crafts",
      secondaryCtaColor: "#17b0ad",
      backgroundMediaType: "image",
      backgroundImageSrc: "/images/slides/1.jpg",
      backgroundVideoSrc: "",
      slideImages: ["/images/slides/1.jpg"],
      autoplayMs: 3800,
    },
    homeCourses: {
      titleEn: "Our courses",
      titleAr: "دوراتنا",
      subtitleEn: "Signature programs crafted for every level.",
      subtitleAr: "برامج متجددة بلمسة إبداعية.",
      cookingTitleEn: "Cooking classes",
      cookingTitleAr: "دورات الطبخ",
      cookingDescriptionEn: "From foundations to advanced techniques in a practical, immersive format.",
      cookingDescriptionAr: "من أساسيات الطبخ حتى التجارب المتقدمة بطابع عملي ممتع.",
      cookingImageSrc: "/images/cooking.png",
      cookingDisplayMode: "icon",
      cookingIcon: "cooking-pot",
      artsTitleEn: "Arts & crafts classes",
      artsTitleAr: "دورات الفنون والحرف",
      artsDescriptionEn: "Creative sessions that blend craftsmanship and artistic expression.",
      artsDescriptionAr: "جلسات إبداعية تدمج الحرفة والفن في بيئة ملهمة.",
      artsImageSrc: "/images/art.png",
      artsDisplayMode: "icon",
      artsIcon: "palette",
    },
    homeUpcoming: {
      titleEn: "Upcoming classes",
      titleAr: "الدورات القادمة",
      descriptionEn: "Handpicked sessions you can book right away.",
      descriptionAr: "جلسات قادمة جاهزة للحجز.",
      bookNowLabelEn: "Book now",
      bookNowLabelAr: "احجز الآن",
      items: [],
    },
    homeWhyNoon: {
      titleEn: "Why Noon",
      titleAr: "لماذا نون",
      descriptionEn: "What truly sets the Noon experience apart.",
      descriptionAr: "ما الذي يجعل تجربة نون مختلفة فعلاً.",
      backgroundImageSrc: "",
      sectionTitleColor: "#ffffff",
      cardTitleColor: "#111827",
      items: [
        {
          titleEn: "Expert-Led Classes",
          titleAr: "مدرّبون خبراء",
          descriptionEn: "Taught by experienced instructors.",
          descriptionAr: "بإشراف مدربين ذوي خبرة.",
        },
        {
          titleEn: "Hands-On Learning",
          titleAr: "تعلّم عملي",
          descriptionEn: "Real cooking, real tools, real results.",
          descriptionAr: "تجربة حقيقية بأدوات حقيقية ونتائج ملموسة.",
        },
        {
          titleEn: "Community-Focused",
          titleAr: "مجتمع مُرحّب",
          descriptionEn: "A welcoming space for all skill levels.",
          descriptionAr: "مساحة مناسبة لكل المستويات.",
        },
      ],
    },
    homePartners: {
      titleEn: "Our partners",
      titleAr: "شركاؤنا",
      descriptionEn: "",
      descriptionAr: "",
      items: [
        {
          nameEn: "Partner One",
          nameAr: "شريك ١",
          logoSrc: "",
        },
        {
          nameEn: "Partner Two",
          nameAr: "شريك ٢",
          logoSrc: "",
        },
        {
          nameEn: "Partner Three",
          nameAr: "شريك ٣",
          logoSrc: "",
        },
      ],
    },
    homeNumbers: {
      titleEn: "Our numbers",
      titleAr: "أرقامنا",
      items: [
        {
          valueEn: "4500+",
          valueAr: "4500+",
          labelEn: "Students Trained",
          labelAr: "متدرب",
        },
        {
          valueEn: "200+",
          valueAr: "200+",
          labelEn: "Classes Conducted",
          labelAr: "ورشة",
        },
        {
          valueEn: "100+",
          valueAr: "100+",
          labelEn: "Corporate & Private Events",
          labelAr: "فعالية خاصة وشركات",
        },
        {
          valueEn: "7+",
          valueAr: "7+",
          labelEn: "Years of Experience",
          labelAr: "سنوات خبرة",
        },
      ],
    },
    homeLayout: {
      showHero: true,
      showCourses: false,
      showNumbers: true,
      showUpcoming: true,
      showWhyNoon: true,
      showPartners: true,
    },
    faqItems,
    termsSections,
    contactPage: {
      subtitleEn:
        "The Noon team is ready to support your questions on classes, bookings, and private experiences.",
      subtitleAr: "فريق نون جاهز للرد على استفساراتك حول الدورات والحجوزات والتجارب الخاصة.",
      helperEn: "Send us your message and we usually get back within one business day.",
      helperAr: "أرسل رسالتك وسنعود إليك خلال يوم عمل واحد عادةً.",
      addressEn: "Muscat, Sultanate of Oman",
      addressAr: "مسقط، سلطنة عمان",
      officeHoursEn: "Sunday - Thursday • 9:00 AM - 6:00 PM",
      officeHoursAr: "الأحد - الخميس • 9:00 صباحًا - 6:00 مساءً",
      phonePrimary: "+968 98199508",
      emailPrimary: "info@noonomanarts.com",
      whatsappUrl: "https://wa.me/96898199508",
      instagramUrl: "https://instagram.com/noonomanarts",
      mapEmbedUrl: "",
      mapLink: "",
      successTitleEn: "Message Sent",
      successTitleAr: "تم إرسال رسالتك",
      successMessageEn: "Thank you for contacting us. Our team will reply shortly.",
      successMessageAr: "شكرًا لتواصلك. سيقوم فريقنا بالرد عليك قريبًا.",
    },
    aboutPage,
  };
}

export function sanitizeSitePageSettings(
  page: SitePageDefinition,
  input: Partial<SitePageSettings> | null | undefined
): SitePageSettings {
  const defaults = getDefaultSitePageSettings(page);
  const source: Partial<SitePageSettings> = { ...defaults, ...(input ?? {}) };
  const normalizedSlideImages = toStringArray(source.homeHero?.slideImages, 1, 500);
  const legacyMediaSrc = normalizedSlideImages[0]?.trim() ?? "";
  const legacyMediaType: HomeHeroMediaType = isVideoSource(legacyMediaSrc) ? "video" : "image";
  const backgroundMediaType = toOneOf(
    source.homeHero?.backgroundMediaType,
    ["image", "video"] as const,
    legacyMediaSrc ? legacyMediaType : defaults.homeHero.backgroundMediaType
  );
  const backgroundImageSrc =
    toSafeString(source.homeHero?.backgroundImageSrc, 500) ||
    (legacyMediaSrc && legacyMediaType === "image" ? legacyMediaSrc : defaults.homeHero.backgroundImageSrc);
  const backgroundVideoSrc =
    toSafeString(source.homeHero?.backgroundVideoSrc, 500) ||
    (legacyMediaSrc && legacyMediaType === "video" ? legacyMediaSrc : defaults.homeHero.backgroundVideoSrc);
  const selectedBackgroundSrc = backgroundMediaType === "video" ? backgroundVideoSrc : backgroundImageSrc;

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
      primaryCtaHref: toSafeHref(source.homeHero?.primaryCtaHref, defaults.homeHero.primaryCtaHref),
      primaryCtaColor: toHexColor(source.homeHero?.primaryCtaColor, defaults.homeHero.primaryCtaColor),
      secondaryCtaEn: toSafeString(source.homeHero?.secondaryCtaEn, 120) || defaults.homeHero.secondaryCtaEn,
      secondaryCtaAr: toSafeString(source.homeHero?.secondaryCtaAr, 120) || defaults.homeHero.secondaryCtaAr,
      secondaryCtaHref: toSafeHref(source.homeHero?.secondaryCtaHref, defaults.homeHero.secondaryCtaHref),
      secondaryCtaColor: toHexColor(source.homeHero?.secondaryCtaColor, defaults.homeHero.secondaryCtaColor),
      backgroundMediaType,
      backgroundImageSrc,
      backgroundVideoSrc,
      slideImages: selectedBackgroundSrc ? [selectedBackgroundSrc] : [],
      autoplayMs: toNumberInRange(source.homeHero?.autoplayMs, defaults.homeHero.autoplayMs, 2000, 12000),
    },
    homeCourses: {
      titleEn: toSafeString(source.homeCourses?.titleEn, 180) || defaults.homeCourses.titleEn,
      titleAr: toSafeString(source.homeCourses?.titleAr, 180) || defaults.homeCourses.titleAr,
      subtitleEn: toSafeString(source.homeCourses?.subtitleEn, 500) || defaults.homeCourses.subtitleEn,
      subtitleAr: toSafeString(source.homeCourses?.subtitleAr, 500) || defaults.homeCourses.subtitleAr,
      cookingTitleEn: toSafeString(source.homeCourses?.cookingTitleEn, 180) || defaults.homeCourses.cookingTitleEn,
      cookingTitleAr: toSafeString(source.homeCourses?.cookingTitleAr, 180) || defaults.homeCourses.cookingTitleAr,
      cookingDescriptionEn: toSafeString(source.homeCourses?.cookingDescriptionEn, 500) || defaults.homeCourses.cookingDescriptionEn,
      cookingDescriptionAr: toSafeString(source.homeCourses?.cookingDescriptionAr, 500) || defaults.homeCourses.cookingDescriptionAr,
      cookingImageSrc: toSafeString(source.homeCourses?.cookingImageSrc, 500) || defaults.homeCourses.cookingImageSrc,
      cookingDisplayMode: toOneOf(
        source.homeCourses?.cookingDisplayMode,
        ["icon", "image"] as const,
        defaults.homeCourses.cookingDisplayMode
      ),
      cookingIcon: toOneOf(
        source.homeCourses?.cookingIcon,
        ["cooking-pot", "chef-hat", "utensils"] as const,
        defaults.homeCourses.cookingIcon
      ),
      artsTitleEn: toSafeString(source.homeCourses?.artsTitleEn, 180) || defaults.homeCourses.artsTitleEn,
      artsTitleAr: toSafeString(source.homeCourses?.artsTitleAr, 180) || defaults.homeCourses.artsTitleAr,
      artsDescriptionEn: toSafeString(source.homeCourses?.artsDescriptionEn, 500) || defaults.homeCourses.artsDescriptionEn,
      artsDescriptionAr: toSafeString(source.homeCourses?.artsDescriptionAr, 500) || defaults.homeCourses.artsDescriptionAr,
      artsImageSrc: toSafeString(source.homeCourses?.artsImageSrc, 500) || defaults.homeCourses.artsImageSrc,
      artsDisplayMode: toOneOf(
        source.homeCourses?.artsDisplayMode,
        ["icon", "image"] as const,
        defaults.homeCourses.artsDisplayMode
      ),
      artsIcon: toOneOf(
        source.homeCourses?.artsIcon,
        ["palette", "craft", "brush"] as const,
        defaults.homeCourses.artsIcon
      ),
    },
    homeUpcoming: {
      titleEn: toSafeString(source.homeUpcoming?.titleEn, 180) || defaults.homeUpcoming.titleEn,
      titleAr: toSafeString(source.homeUpcoming?.titleAr, 180) || defaults.homeUpcoming.titleAr,
      descriptionEn:
        toSafeString(source.homeUpcoming?.descriptionEn, 500) || defaults.homeUpcoming.descriptionEn,
      descriptionAr:
        toSafeString(source.homeUpcoming?.descriptionAr, 500) || defaults.homeUpcoming.descriptionAr,
      bookNowLabelEn:
        toSafeString(source.homeUpcoming?.bookNowLabelEn, 120) || defaults.homeUpcoming.bookNowLabelEn,
      bookNowLabelAr:
        toSafeString(source.homeUpcoming?.bookNowLabelAr, 120) || defaults.homeUpcoming.bookNowLabelAr,
      items: sanitizeHomeUpcomingItems(source.homeUpcoming?.items, defaults.homeUpcoming.items),
    },
    homeWhyNoon: {
      titleEn: toSafeString(source.homeWhyNoon?.titleEn, 180) || defaults.homeWhyNoon.titleEn,
      titleAr: toSafeString(source.homeWhyNoon?.titleAr, 180) || defaults.homeWhyNoon.titleAr,
      descriptionEn:
        toSafeString(source.homeWhyNoon?.descriptionEn, 500) || defaults.homeWhyNoon.descriptionEn,
      descriptionAr:
        toSafeString(source.homeWhyNoon?.descriptionAr, 500) || defaults.homeWhyNoon.descriptionAr,
      backgroundImageSrc:
        toSafeString(source.homeWhyNoon?.backgroundImageSrc, 500) || defaults.homeWhyNoon.backgroundImageSrc,
      sectionTitleColor:
        toHexColor(source.homeWhyNoon?.sectionTitleColor, defaults.homeWhyNoon.sectionTitleColor),
      cardTitleColor:
        toHexColor(source.homeWhyNoon?.cardTitleColor, defaults.homeWhyNoon.cardTitleColor),
      items: sanitizeHomeWhyNoonItems(source.homeWhyNoon?.items, defaults.homeWhyNoon.items),
    },
    homePartners: {
      titleEn: toSafeString(source.homePartners?.titleEn, 180) || defaults.homePartners.titleEn,
      titleAr: toSafeString(source.homePartners?.titleAr, 180) || defaults.homePartners.titleAr,
      descriptionEn:
        toSafeString(source.homePartners?.descriptionEn, 500) || defaults.homePartners.descriptionEn,
      descriptionAr:
        toSafeString(source.homePartners?.descriptionAr, 500) || defaults.homePartners.descriptionAr,
      items: sanitizeHomePartnersItems(source.homePartners?.items, defaults.homePartners.items),
    },
    homeNumbers: {
      titleEn: toSafeString(source.homeNumbers?.titleEn, 180) || defaults.homeNumbers.titleEn,
      titleAr: toSafeString(source.homeNumbers?.titleAr, 180) || defaults.homeNumbers.titleAr,
      items: sanitizeHomeNumbersItems(source.homeNumbers?.items, defaults.homeNumbers.items),
    },
    homeLayout: {
      showHero: toBoolean(source.homeLayout?.showHero, defaults.homeLayout.showHero),
      showCourses: toBoolean(source.homeLayout?.showCourses, defaults.homeLayout.showCourses),
      showNumbers: toBoolean(source.homeLayout?.showNumbers, defaults.homeLayout.showNumbers),
      showUpcoming: toBoolean(source.homeLayout?.showUpcoming, defaults.homeLayout.showUpcoming),
      showWhyNoon: toBoolean(source.homeLayout?.showWhyNoon, defaults.homeLayout.showWhyNoon),
      showPartners: toBoolean(source.homeLayout?.showPartners, defaults.homeLayout.showPartners),
    },
    faqItems: sanitizeFaqItems(source.faqItems, defaults.faqItems),
    termsSections: sanitizeTermsSections(source.termsSections, defaults.termsSections),
    contactPage: {
      subtitleEn: toSafeString(source.contactPage?.subtitleEn, 500) || defaults.contactPage.subtitleEn,
      subtitleAr: toSafeString(source.contactPage?.subtitleAr, 500) || defaults.contactPage.subtitleAr,
      helperEn: toSafeString(source.contactPage?.helperEn, 500) || defaults.contactPage.helperEn,
      helperAr: toSafeString(source.contactPage?.helperAr, 500) || defaults.contactPage.helperAr,
      addressEn: toSafeString(source.contactPage?.addressEn, 320) || defaults.contactPage.addressEn,
      addressAr: toSafeString(source.contactPage?.addressAr, 320) || defaults.contactPage.addressAr,
      officeHoursEn:
        toSafeString(source.contactPage?.officeHoursEn, 320) || defaults.contactPage.officeHoursEn,
      officeHoursAr:
        toSafeString(source.contactPage?.officeHoursAr, 320) || defaults.contactPage.officeHoursAr,
      phonePrimary: toSafeString(source.contactPage?.phonePrimary, 100) || defaults.contactPage.phonePrimary,
      emailPrimary: toSafeString(source.contactPage?.emailPrimary, 180) || defaults.contactPage.emailPrimary,
      whatsappUrl: toSafeHref(source.contactPage?.whatsappUrl, ""),
      instagramUrl: toSafeHref(source.contactPage?.instagramUrl, ""),
      mapEmbedUrl: toSafeHttpUrl(source.contactPage?.mapEmbedUrl, ""),
      mapLink: toSafeHref(source.contactPage?.mapLink, ""),
      successTitleEn:
        toSafeString(source.contactPage?.successTitleEn, 180) || defaults.contactPage.successTitleEn,
      successTitleAr:
        toSafeString(source.contactPage?.successTitleAr, 180) || defaults.contactPage.successTitleAr,
      successMessageEn:
        toSafeString(source.contactPage?.successMessageEn, 500) || defaults.contactPage.successMessageEn,
      successMessageAr:
        toSafeString(source.contactPage?.successMessageAr, 500) || defaults.contactPage.successMessageAr,
    },
    aboutPage: {
      heroImageSrc: toSafeString(source.aboutPage?.heroImageSrc, 500) || defaults.aboutPage.heroImageSrc,
      aboutTitleEn: toSafeString(source.aboutPage?.aboutTitleEn, 180) || defaults.aboutPage.aboutTitleEn,
      aboutTitleAr: toSafeString(source.aboutPage?.aboutTitleAr, 180) || defaults.aboutPage.aboutTitleAr,
      aboutBodyEn: toSafeString(source.aboutPage?.aboutBodyEn, 4000) || defaults.aboutPage.aboutBodyEn,
      aboutBodyAr: toSafeString(source.aboutPage?.aboutBodyAr, 4000) || defaults.aboutPage.aboutBodyAr,
      founderTitleEn:
        toSafeString(source.aboutPage?.founderTitleEn, 180) || defaults.aboutPage.founderTitleEn,
      founderTitleAr:
        toSafeString(source.aboutPage?.founderTitleAr, 180) || defaults.aboutPage.founderTitleAr,
      founderBodyEn: toSafeString(source.aboutPage?.founderBodyEn, 4000) || defaults.aboutPage.founderBodyEn,
      founderBodyAr: toSafeString(source.aboutPage?.founderBodyAr, 4000) || defaults.aboutPage.founderBodyAr,
      founderQuoteEn:
        toSafeString(source.aboutPage?.founderQuoteEn, 1200) || defaults.aboutPage.founderQuoteEn,
      founderQuoteAr:
        toSafeString(source.aboutPage?.founderQuoteAr, 1200) || defaults.aboutPage.founderQuoteAr,
      founderImageSrc:
        toSafeString(source.aboutPage?.founderImageSrc, 500) || defaults.aboutPage.founderImageSrc,
      whatWeDoTitleEn:
        toSafeString(source.aboutPage?.whatWeDoTitleEn, 180) || defaults.aboutPage.whatWeDoTitleEn,
      whatWeDoTitleAr:
        toSafeString(source.aboutPage?.whatWeDoTitleAr, 180) || defaults.aboutPage.whatWeDoTitleAr,
      whatWeDoItems: sanitizeAboutFeatures(source.aboutPage?.whatWeDoItems, defaults.aboutPage.whatWeDoItems),
      teamTitleEn: toSafeString(source.aboutPage?.teamTitleEn, 180) || defaults.aboutPage.teamTitleEn,
      teamTitleAr: toSafeString(source.aboutPage?.teamTitleAr, 180) || defaults.aboutPage.teamTitleAr,
      teamMembers: sanitizeAboutTeamMembers(source.aboutPage?.teamMembers, defaults.aboutPage.teamMembers),
      trainersTitleEn:
        toSafeString(source.aboutPage?.trainersTitleEn, 180) || defaults.aboutPage.trainersTitleEn,
      trainersTitleAr:
        toSafeString(source.aboutPage?.trainersTitleAr, 180) || defaults.aboutPage.trainersTitleAr,
      trainersCtaEn: toSafeString(source.aboutPage?.trainersCtaEn, 120) || defaults.aboutPage.trainersCtaEn,
      trainersCtaAr: toSafeString(source.aboutPage?.trainersCtaAr, 120) || defaults.aboutPage.trainersCtaAr,
      trainerHighlights: sanitizeAboutTrainerHighlights(
        source.aboutPage?.trainerHighlights,
        defaults.aboutPage.trainerHighlights
      ),
      familyTitleEn: toSafeString(source.aboutPage?.familyTitleEn, 180) || defaults.aboutPage.familyTitleEn,
      familyTitleAr: toSafeString(source.aboutPage?.familyTitleAr, 180) || defaults.aboutPage.familyTitleAr,
      familyBodyEn: toSafeString(source.aboutPage?.familyBodyEn, 4000) || defaults.aboutPage.familyBodyEn,
      familyBodyAr: toSafeString(source.aboutPage?.familyBodyAr, 4000) || defaults.aboutPage.familyBodyAr,
      familyImageSrc: toSafeString(source.aboutPage?.familyImageSrc, 500) || defaults.aboutPage.familyImageSrc,
    },
  };
}
