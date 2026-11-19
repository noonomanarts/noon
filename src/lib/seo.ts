import type { Metadata } from "next";

import { getPublicSiteBaseUrl } from "@/lib/publicSiteUrl";

type Bilingual = { ar: string; en: string };

const SITE_NAME: Bilingual = { ar: "نون", en: "Noon" };
const DEFAULT_IMAGE = "/og-image.png";

/** Plain one-line text for a meta description (drops Markdown and markup). */
export function toMetaDescription(value: string | null | undefined, maxLength = 160): string {
  const plain = (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  const cut = plain.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Per-page metadata for the public site: its own title and description, a
 * canonical URL, links between the Arabic and English versions, and social
 * sharing tags. `path` is the part after the locale ("" for the home page).
 */
export function buildPageMetadata(
  rawLocale: string,
  input: {
    path: string;
    title: Bilingual;
    description: Bilingual;
    image?: string | null;
    noindex?: boolean;
    /** Use the title as given, without the "| Noon" suffix (home page). */
    absoluteTitle?: boolean;
  }
): Metadata {
  const locale = rawLocale === "ar" ? "ar" : "en";
  const baseUrl = getPublicSiteBaseUrl();
  const path = input.path && !input.path.startsWith("/") ? `/${input.path}` : input.path;
  const urlFor = (lang: "ar" | "en") => `${baseUrl}/${lang}${path}`;

  const title = (input.title[locale] || input.title.en || input.title.ar).trim();
  const description = toMetaDescription(input.description[locale] || input.description.en || input.description.ar);
  const image = input.image?.trim() || DEFAULT_IMAGE;

  return {
    title: input.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: urlFor(locale),
      languages: { ar: urlFor("ar"), en: urlFor("en"), "x-default": urlFor("ar") },
    },
    openGraph: {
      type: "website",
      url: urlFor(locale),
      siteName: SITE_NAME[locale],
      locale: locale === "ar" ? "ar_OM" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_OM",
      title,
      description,
      images: [{ url: image, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: input.noindex ? { index: false, follow: false } : undefined,
  };
}
