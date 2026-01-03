import type { Locale } from "@/lib/locale";

export type SiteNavKey =
  | "home"
  | "about"
  | "classes"
  | "groupBooking"
  | "noonRecommends"
  | "contact"
  | "account";

export type HomeNumbersItem = {
  label: string;
  value: string;
};

export type HomeUpcomingClass = {
  id: string;
  title: string;
  datetimeText: string;
  priceText: string;
  imageSrc: string;
};

export type HomeWhyItem = {
  title: string;
  description: string;
};

export type Partner = {
  id: string;
  name: string;
  logoText?: string;
  logoSrc?: string;
  href?: string;
};

export type HomeContent = {
  locale: Locale;
  hero: {
    headline: string;
    subheadline?: string;
    ctaExploreClasses: string;
    backgroundImageSrc?: string;
  };
  courses: {
    title: string;
    cookingLabel: string;
    artsLabel: string;
  };
  numbers: {
    title: string;
    items: HomeNumbersItem[];
  };
  upcoming: {
    title: string;
    items: HomeUpcomingClass[];
    bookNowLabel: string;
  };
  whyNoon: {
    title: string;
    items: HomeWhyItem[];
  };
  partners: {
    title: string;
    description: string;
    items: Partner[];
  };
};
