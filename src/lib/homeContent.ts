import type { Locale } from "@/lib/locale";
import type { HomeContent } from "@/types/siteContent";

// In-memory storage for home content
const contentStore = new Map<string, HomeContent>();

const KEY_PREFIX = "content:home:";

const DEFAULT_HOME_CONTENT: Record<Locale, HomeContent> = {
  en: {
    locale: "en",
    hero: {
      headline: "cooking is an experience",
      subheadline:
        "Learn, create, and celebrate with Noon.",
      ctaExploreClasses: "Explore classes",
      backgroundImageSrc: "/og-image.png",
    },
    courses: {
      title: "Our courses",
      cookingLabel: "Cooking classes",
      artsLabel: "Arts & crafts classes",
    },
    numbers: {
      title: "Our numbers",
      items: [
        { value: "4500+", label: "Students Trained" },
        { value: "200+", label: "Classes Conducted" },
        { value: "100+", label: "Corporate & Private Events" },
        { value: "7+", label: "Years of Experience" },
      ],
    },
    upcoming: {
      title: "Upcoming classes",
      bookNowLabel: "Book now",
      items: [
        {
          id: "up-1",
          title: "Italian Pasta Night",
          datetimeText: "Jan 12 · 6:00 PM",
          priceText: "OMR 25",
          imageSrc: "/og-image.png",
        },
        {
          id: "up-2",
          title: "Bread & Baking Basics",
          datetimeText: "Jan 18 · 10:00 AM",
          priceText: "OMR 20",
          imageSrc: "/og-image.png",
        },
        {
          id: "up-3",
          title: "Craft & Create: Resin Art",
          datetimeText: "Jan 24 · 5:00 PM",
          priceText: "OMR 18",
          imageSrc: "/og-image.png",
        },
      ],
    },
    whyNoon: {
      title: "Why Noon",
      items: [
        {
          title: "Expert-Led Classes",
          description: "Taught by experienced instructors.",
        },
        {
          title: "Hands-On Learning",
          description: "Real cooking, real tools, real results.",
        },
        {
          title: "Community-Focused",
          description: "A welcoming space for all skill levels.",
        },
      ],
    },
    partners: {
      title: "Our partners",
      description: "",
      items: [
        { id: "p-1", name: "Partner One", logoText: "Partner One" },
        { id: "p-2", name: "Partner Two", logoText: "Partner Two" },
        { id: "p-3", name: "Partner Three", logoText: "Partner Three" },
      ],
    },
  },
  ar: {
    locale: "ar",
    hero: {
      headline: "الطبخ تجربة",
      subheadline: "تعلّم وابدع واحتفل مع نون.",
      ctaExploreClasses: "استكشف الورش",
      backgroundImageSrc: "/og-image.png",
    },
    courses: {
      title: "ورشنا",
      cookingLabel: "ورش الطبخ",
      artsLabel: "ورش الفنون والأشغال",
    },
    numbers: {
      title: "أرقامنا",
      items: [
        { value: "4500+", label: "متدرب" },
        { value: "200+", label: "ورشة" },
        { value: "100+", label: "فعالية خاصة وشركات" },
        { value: "7+", label: "سنوات خبرة" },
      ],
    },
    upcoming: {
      title: "الورش القادمة",
      bookNowLabel: "احجز الآن",
      items: [
        {
          id: "up-1",
          title: "ليلة الباستا الإيطالية",
          datetimeText: "12 يناير · 6:00 مساءً",
          priceText: "25 ر.ع",
          imageSrc: "/og-image.png",
        },
        {
          id: "up-2",
          title: "أساسيات الخبز والمعجنات",
          datetimeText: "18 يناير · 10:00 صباحاً",
          priceText: "20 ر.ع",
          imageSrc: "/og-image.png",
        },
        {
          id: "up-3",
          title: "حِرف وإبداع: فن الرِّيزن",
          datetimeText: "24 يناير · 5:00 مساءً",
          priceText: "18 ر.ع",
          imageSrc: "/og-image.png",
        },
      ],
    },
    whyNoon: {
      title: "لماذا نون",
      items: [
        {
          title: "مدرّبون خبراء",
          description: "بإشراف مدربين ذوي خبرة.",
        },
        {
          title: "تعلّم عملي",
          description: "تجربة حقيقية بأدوات حقيقية ونتائج ملموسة.",
        },
        {
          title: "مجتمع مُرحّب",
          description: "مساحة مناسبة لكل المستويات.",
        },
      ],
    },
    partners: {
      title: "شركاؤنا",
      description: "",
      items: [
        { id: "p-1", name: "شريك ١", logoText: "شريك ١" },
        { id: "p-2", name: "شريك ٢", logoText: "شريك ٢" },
        { id: "p-3", name: "شريك ٣", logoText: "شريك ٣" },
      ],
    },
  },
};

export function getHomeContent(locale: Locale): HomeContent {
  const key = `${KEY_PREFIX}${locale}`;
  const fromStore = contentStore.get(key);
  if (fromStore) return fromStore;

  // Use default content and store it
  const defaultContent = DEFAULT_HOME_CONTENT[locale];
  contentStore.set(key, defaultContent);
  return defaultContent;
}
