import type { MetadataRoute } from "next";

import { query } from "@/lib/db/pool";
import { getPublicSiteBaseUrl } from "@/lib/publicSiteUrl";

// Generated per request, not at build time: the image is built without a
// database, and a sitemap frozen then would list no workshops or products.
export const dynamic = "force-dynamic";

const LOCALES = ["ar", "en"] as const;

const STATIC_PATHS: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/classes/cooking", priority: 0.9, changeFrequency: "daily" },
  { path: "/classes/arts-crafts", priority: 0.9, changeFrequency: "daily" },
  { path: "/shop", priority: 0.8, changeFrequency: "daily" },
  { path: "/group-booking-events", priority: 0.8, changeFrequency: "weekly" },
  { path: "/group-booking-events/cooking-competition", priority: 0.7, changeFrequency: "weekly" },
  { path: "/group-booking-events/private-classes", priority: 0.7, changeFrequency: "weekly" },
  { path: "/group-booking-events/birthday-parties", priority: 0.7, changeFrequency: "weekly" },
  { path: "/trainers", priority: 0.6, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faqs", priority: 0.5, changeFrequency: "monthly" },
  { path: "/join-us", priority: 0.4, changeFrequency: "monthly" },
  { path: "/suggest-workshop", priority: 0.4, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
];

type Row = { key: string; updated_at: Date | string | null };

/** A failing query must never take the whole sitemap down with it. */
async function safeRows(sql: string): Promise<Row[]> {
  try {
    const result = await query(sql);
    return result.rows as Row[];
  } catch (error) {
    console.error("[sitemap] query failed:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicSiteBaseUrl();
  const now = new Date();

  const [classes, products, categories, trainers] = await Promise.all([
    safeRows(`SELECT slug AS key, updated_at FROM classes WHERE status = 'PUBLISHED' AND slug IS NOT NULL ORDER BY updated_at DESC LIMIT 2000`),
    safeRows(`SELECT slug AS key, updated_at FROM shop_products WHERE is_active = TRUE AND available_online = TRUE ORDER BY updated_at DESC LIMIT 2000`),
    safeRows(`SELECT slug AS key, updated_at FROM shop_categories WHERE is_active = TRUE ORDER BY sort_order LIMIT 200`),
    safeRows(`SELECT id::text AS key, updated_at FROM users WHERE role = 'TRAINER' AND status = 'ACTIVE' LIMIT 500`),
  ]);

  const entry = (
    path: string,
    lastModified: Date,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number
  ): MetadataRoute.Sitemap =>
    LOCALES.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((alt) => [alt, `${baseUrl}/${alt}${path}`])),
      },
    }));

  const toDate = (value: Row["updated_at"]) => {
    const date = value ? new Date(value) : now;
    return Number.isNaN(date.getTime()) ? now : date;
  };

  return [
    ...STATIC_PATHS.flatMap((item) => entry(item.path, now, item.changeFrequency, item.priority)),
    ...classes.flatMap((row) => entry(`/classes/${encodeURIComponent(row.key)}`, toDate(row.updated_at), "weekly", 0.8)),
    ...categories.flatMap((row) => entry(`/shop/${encodeURIComponent(row.key)}`, toDate(row.updated_at), "weekly", 0.6)),
    ...products.flatMap((row) => entry(`/shop/product/${encodeURIComponent(row.key)}`, toDate(row.updated_at), "weekly", 0.7)),
    ...trainers.flatMap((row) => entry(`/trainers/${row.key}`, toDate(row.updated_at), "monthly", 0.5)),
  ];
}
