"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiExternalLink, FiFileText, FiSearch, FiSettings } from "react-icons/fi";

import type { Locale } from "@/lib/locale";
import { buildLocalizedPagePath, isDynamicPathTemplate, type SitePageGroup } from "@/lib/admin/sitePages";

export type AdminSitePageListItem = {
  key: string;
  pathTemplate: string;
  group: SitePageGroup;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  hasCustomSettings: boolean;
  visibility: "PUBLISHED" | "DRAFT" | "HIDDEN";
  navPlacement: "PRIMARY" | "SECONDARY" | "NONE";
  footerVisible: boolean;
  indexable: boolean;
};

type GroupFilter = "all" | SitePageGroup;

function visibilityBadgeClass(visibility: AdminSitePageListItem["visibility"]): string {
  if (visibility === "PUBLISHED") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (visibility === "DRAFT") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
}

export default function AdminPagesPageClient({
  locale,
  initialPages,
}: {
  locale: Locale;
  initialPages: AdminSitePageListItem[];
}) {
  const isArabic = locale === "ar";
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");

  const t = {
    title: isArabic ? "إدارة صفحات الموقع" : "Site Pages Manager",
    subtitle: isArabic
      ? "إعدادات شاملة لكل صفحة في الموقع باللغتين العربية والإنجليزية."
      : "Centralized bilingual settings for every site page.",
    search: isArabic ? "ابحث بالاسم أو المسار..." : "Search by page name or route...",
    all: isArabic ? "الكل" : "All",
    core: isArabic ? "أساسية" : "Core",
    classes: isArabic ? "الدورات" : "Classes",
    events: isArabic ? "الفعاليات" : "Events",
    commerce: isArabic ? "التجارة" : "Commerce",
    account: isArabic ? "الحساب" : "Account",
    page: isArabic ? "الصفحة" : "Page",
    route: isArabic ? "المسار" : "Route",
    status: isArabic ? "الحالة" : "Status",
    placement: isArabic ? "الظهور" : "Placement",
    seo: isArabic ? "SEO" : "SEO",
    actions: isArabic ? "الإجراءات" : "Actions",
    published: isArabic ? "منشور" : "Published",
    draft: isArabic ? "مسودة" : "Draft",
    hidden: isArabic ? "مخفي" : "Hidden",
    primaryNav: isArabic ? "قائمة رئيسية" : "Primary Nav",
    secondaryNav: isArabic ? "قائمة ثانوية" : "Secondary Nav",
    notInNav: isArabic ? "بدون قائمة" : "No Nav",
    footerOn: isArabic ? "الفوتر: مفعّل" : "Footer: On",
    footerOff: isArabic ? "الفوتر: معطّل" : "Footer: Off",
    indexableOn: isArabic ? "قابل للفهرسة" : "Indexable",
    indexableOff: isArabic ? "غير مفهرس" : "Noindex",
    customized: isArabic ? "مخصص" : "Customized",
    default: isArabic ? "افتراضي" : "Default",
    manage: isArabic ? "إدارة الإعدادات" : "Manage Settings",
    preview: isArabic ? "فتح الصفحة" : "Open Page",
    templateOnly: isArabic ? "قالب ديناميكي" : "Dynamic Template",
    empty: isArabic ? "لا توجد صفحات مطابقة." : "No matching pages found.",
    totalPages: isArabic ? "إجمالي الصفحات" : "Total Pages",
  };

  const groupLabels: Record<GroupFilter, string> = {
    all: t.all,
    core: t.core,
    classes: t.classes,
    events: t.events,
    commerce: t.commerce,
    account: t.account,
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialPages.filter((page) => {
      if (group !== "all" && page.group !== group) return false;
      if (!query) return true;

      const text = [
        page.key,
        page.pathTemplate,
        page.nameEn,
        page.nameAr,
        page.descriptionEn,
        page.descriptionAr,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [group, initialPages, search]);

  const totalPages = initialPages.length;
  const dynamicCount = initialPages.filter((page) => isDynamicPathTemplate(page.pathTemplate)).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
              <FiFileText className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <p>{t.totalPages}: <strong>{totalPages}</strong></p>
            <p>{t.templateOnly}: <strong>{dynamicCount}</strong></p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              className="w-full rounded-xl border border-zinc-300 bg-transparent py-2 ps-9 pe-3 text-sm text-zinc-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(groupLabels) as GroupFilter[]).map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setGroup(candidate)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  group === candidate
                    ? "bg-cyan-600 text-white"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                {groupLabels[candidate]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.page}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.route}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.status}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.placement}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.seo}</th>
                <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                filtered.map((page) => {
                  const statusLabel =
                    page.visibility === "PUBLISHED"
                      ? t.published
                      : page.visibility === "DRAFT"
                        ? t.draft
                        : t.hidden;
                  const navLabel =
                    page.navPlacement === "PRIMARY"
                      ? t.primaryNav
                      : page.navPlacement === "SECONDARY"
                        ? t.secondaryNav
                        : t.notInNav;
                  const pageRoute = buildLocalizedPagePath(page.pathTemplate, locale);
                  const isDynamic = isDynamicPathTemplate(page.pathTemplate);

                  return (
                    <tr key={page.key} className="align-top hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{page.nameEn}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{page.nameAr}</p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{isArabic ? page.descriptionAr : page.descriptionEn}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{page.pathTemplate}</p>
                        {isDynamic ? (
                          <span className="mt-2 inline-flex rounded-full bg-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                            {t.templateOnly}
                          </span>
                        ) : (
                          <Link
                            href={pageRoute}
                            target="_blank"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                          >
                            <FiExternalLink className="size-3.5" />
                            {t.preview}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${visibilityBadgeClass(page.visibility)}`}>
                          {statusLabel}
                        </span>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {page.hasCustomSettings ? t.customized : t.default}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{navLabel}</p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {page.footerVisible ? t.footerOn : t.footerOff}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            page.indexable
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                          }`}
                        >
                          {page.indexable ? t.indexableOn : t.indexableOff}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-end">
                        <Link
                          href={`/${locale}/admin/pages/${page.key}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                          <FiSettings className="size-4" />
                          {t.manage}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
