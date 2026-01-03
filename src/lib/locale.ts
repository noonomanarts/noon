export type Locale = "en" | "ar";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ar";
}

export function getDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "ar" : "en";
}
