import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowRight, FiBox } from "react-icons/fi";

import { getShopCategoryBySlug, listShopCategoriesForPublic, listShopProductsForPublic } from "@/lib/db/shop";
import { isLocale, type Locale } from "@/lib/locale";

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale: rawLocale, category } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const [categories, currentCategory] = await Promise.all([
    listShopCategoriesForPublic(),
    getShopCategoryBySlug(category),
  ]);

  if (!currentCategory) {
    notFound();
  }

  const products = await listShopProductsForPublic({ categorySlug: category });

  const t = {
    categories: isArabic ? "التصنيفات" : "Categories",
    products: isArabic ? "المنتجات" : "Products",
    comingSoon: isArabic ? "قريباً" : "Coming Soon",
    comingSoonDesc: isArabic
      ? "نعمل على إضافة منتجات رائعة في هذه الفئة."
      : "We're working on adding amazing products in this category.",
    allProducts: isArabic ? "كل التصنيفات" : "All Categories",
    openAll: isArabic ? "عرض كل التصنيفات" : "View all categories",
    noProducts: isArabic
      ? "لا توجد منتجات حالياً في هذا التصنيف."
      : "No products in this category yet.",
    inStock: isArabic ? "متوفر" : "In stock",
    outOfStock: isArabic ? "غير متوفر حالياً" : "Out of stock",
  };

  const categoryName = isArabic ? currentCategory.name_ar : currentCategory.name_en;
  const categoryDescription =
    (isArabic ? currentCategory.description_ar : currentCategory.description_en) || t.comingSoonDesc;

  return (
    <div className="relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-10">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            <FiBox className="h-4 w-4 text-[color:var(--primary)]" />
            {t.products}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">
            {categoryName}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {categoryDescription}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row">
        <aside className="w-full lg:w-72 lg:flex-shrink-0">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-base font-semibold text-[color:var(--text)]">{t.categories}</h2>
            <nav className="mt-4 space-y-1.5">
              <Link
                href={`/${locale}/shop`}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2.5 text-sm font-medium text-[color:var(--text)] transition hover:shadow-sm"
              >
                <span>{t.allProducts}</span>
                <FiArrowRight className="h-4 w-4 text-[color:var(--text-subtle)]" />
              </Link>
              {categories.map((cat) => {
                const isActive = cat.slug === category;
                return (
                  <Link
                    key={cat.slug}
                    href={`/${locale}/shop/${cat.slug}`}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                        : "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] hover:bg-[color:var(--muted)]"
                    }`}
                  >
                    {isArabic ? cat.name_ar : cat.name_en}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1">
          {products.length === 0 ? (
            <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm">
              <div className="relative h-56 w-full bg-[color:var(--muted)]">
                {currentCategory.image ? (
                  <Image
                    src={currentCategory.image}
                    alt={categoryName}
                    fill
                    sizes="(max-width: 1024px) 100vw, 70vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[color:var(--text-subtle)]">
                    {t.comingSoon}
                  </div>
                )}
              </div>
              <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center">
                <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.comingSoon}</h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-[color:var(--text-muted)]">{t.noProducts}</p>
                <Link
                  href={`/${locale}/shop`}
                  className="mt-6 inline-flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:shadow-sm"
                >
                  {t.openAll}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/${locale}/shop/product/${product.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative h-44 w-full bg-[color:var(--muted)]">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={isArabic ? product.name_ar : product.name_en}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-subtle)]">
                        {t.comingSoon}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-4">
                    <h3 className="line-clamp-1 text-sm font-semibold text-[color:var(--text)]">
                      {isArabic ? product.name_ar : product.name_en}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-6 text-[color:var(--text-muted)]">
                      {(isArabic ? product.description_ar : product.description_en) || t.comingSoonDesc}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-sm font-semibold text-[color:var(--text)]">
                        {product.price.toFixed(3)} {product.currency}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          product.stock_quantity > 0
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {product.stock_quantity > 0 ? t.inStock : t.outOfStock}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
