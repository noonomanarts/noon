import Link from "next/link";
import { isLocale, type Locale } from "@/lib/locale";
import { findManyClasses } from "@/lib/db/classes";
import { findTrainers } from "@/lib/db/trainers";
import { listShopProductsForPublic } from "@/lib/db/shop";
import { formatAmountWithCurrency } from "@/lib/formatNumber";

function containsQuery(query: string, ...values: Array<string | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return values.some((value) => (value ?? "").toLowerCase().includes(normalized));
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const { q: rawQuery } = await searchParams;
  const query = (rawQuery ?? "").trim();
  const isArabic = locale === "ar";

  let classResults: Array<{
    id: string;
    slug: string;
    title: string;
    titleAr: string | null;
    description: string | null;
    descriptionAr: string | null;
    price: number;
    currency: string;
  }> = [];
  let trainerResults: Array<{ id: string; fullName: string }> = [];
  let productResults: Array<{
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    category_name_en: string;
    category_name_ar: string;
    price: number;
    currency: string;
  }> = [];
  let searchFailed = false;

  if (query.length >= 2) {
    try {
      const [classes, trainers, products] = await Promise.all([
        findManyClasses({ status: "PUBLISHED", limit: 100 }),
        findTrainers({ activeOnly: true }),
        listShopProductsForPublic({ limit: 100 }),
      ]);

      classResults = classes
        .filter((item) =>
          containsQuery(query, item.title, item.titleAr, item.description, item.descriptionAr, item.slug)
        )
        .map((item) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          titleAr: item.titleAr,
          description: item.description,
          descriptionAr: item.descriptionAr,
          price: item.price,
          currency: item.currency,
        }))
        .slice(0, 12);

      trainerResults = trainers
        .filter((item) => containsQuery(query, item.fullName, item.email))
        .map((item) => ({ id: item.id, fullName: item.fullName }))
        .slice(0, 12);

      productResults = products
        .filter((item) =>
          containsQuery(
            query,
            item.name_en,
            item.name_ar,
            item.description_en,
            item.description_ar,
            item.category_name_en,
            item.category_name_ar,
            item.slug
          )
        )
        .map((item) => ({
          id: item.id,
          slug: item.slug,
          name_en: item.name_en,
          name_ar: item.name_ar,
          category_name_en: item.category_name_en,
          category_name_ar: item.category_name_ar,
          price: item.price,
          currency: item.currency,
        }))
        .slice(0, 12);
    } catch {
      searchFailed = true;
    }
  }

  const totalResults = classResults.length + trainerResults.length + productResults.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)] dark:text-zinc-100">
          {isArabic ? "البحث" : "Search"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
          {isArabic
            ? "ابحث في الدورات، المدربين، ومنتجات المتجر."
            : "Search classes, trainers, and shop products."}
        </p>
      </div>

      <form action={`/${locale}/search`} method="get" className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={isArabic ? "ابحث..." : "Search..."}
            className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-white dark:focus:ring-white/10"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-[color:var(--surface)] dark:text-[color:var(--text)] dark:hover:bg-[color:var(--muted)]"
          >
            {isArabic ? "بحث" : "Search"}
          </button>
        </div>
      </form>

      {query.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--text-muted)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {isArabic
            ? "اكتب كلمة البحث لعرض النتائج."
            : "Type a search term to see results."}
        </div>
      ) : query.length < 2 ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--text-muted)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {isArabic
            ? "يرجى إدخال حرفين على الأقل."
            : "Please enter at least 2 characters."}
        </div>
      ) : searchFailed ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {isArabic
            ? "تعذر تنفيذ البحث حالياً. حاول مرة أخرى."
            : "Search is temporarily unavailable. Please try again."}
        </div>
      ) : (
        <div className="space-y-10">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {isArabic ? `عدد النتائج: ${totalResults}` : `Results: ${totalResults}`}
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--text)] dark:text-zinc-100">
              {isArabic ? "الدورات" : "Classes"}
            </h2>
            {classResults.length === 0 ? (
              <p className="text-sm text-[color:var(--text-subtle)] dark:text-zinc-400">{isArabic ? "لا توجد نتائج." : "No results."}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${locale}/classes/${item.slug}`}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <p className="text-sm font-semibold text-[color:var(--text)] dark:text-zinc-100">
                      {isArabic && item.titleAr ? item.titleAr : item.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[color:var(--text-muted)] dark:text-zinc-400">
                      {(isArabic ? item.descriptionAr : item.description) || "-"}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatAmountWithCurrency(item.price, item.currency)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--text)] dark:text-zinc-100">
              {isArabic ? "المدربون" : "Trainers"}
            </h2>
            {trainerResults.length === 0 ? (
              <p className="text-sm text-[color:var(--text-subtle)] dark:text-zinc-400">{isArabic ? "لا توجد نتائج." : "No results."}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trainerResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${locale}/trainers/${item.id}`}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <p className="text-sm font-semibold text-[color:var(--text)] dark:text-zinc-100">{item.fullName}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--text)] dark:text-zinc-100">
              {isArabic ? "منتجات المتجر" : "Shop Products"}
            </h2>
            {productResults.length === 0 ? (
              <p className="text-sm text-[color:var(--text-subtle)] dark:text-zinc-400">{isArabic ? "لا توجد نتائج." : "No results."}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {productResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${locale}/shop/product/${item.slug}`}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <p className="text-sm font-semibold text-[color:var(--text)] dark:text-zinc-100">
                      {isArabic ? item.name_ar : item.name_en}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-subtle)] dark:text-zinc-400">
                      {isArabic ? item.category_name_ar : item.category_name_en}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatAmountWithCurrency(item.price, item.currency)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
