import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiPackage, FiTag } from "react-icons/fi";

import { isLocale, type Locale } from "@/lib/locale";
import { listShopCategoriesForPublic, listShopProductsForPublic } from "@/lib/db/shop";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const t = {
    title: isArabic ? "المتجر" : "Shop",
    subtitle: isArabic
      ? "تصنيفات ومنتجات مختارة بعناية من فريق نون."
      : "Curated categories and products selected by the Noon team.",
    categories: isArabic ? "التصنيفات" : "Categories",
    allCategories: isArabic ? "كل التصنيفات" : "All Categories",
    noCategories: isArabic ? "لا توجد تصنيفات نشطة حالياً." : "No active categories available right now.",
    openCategory: isArabic ? "فتح التصنيف" : "Open category",
    featuredTitle: isArabic ? "منتجات مميزة" : "Featured Products",
    allProductsTitle: isArabic ? "جميع المنتجات" : "All Products",
    noProducts: isArabic ? "لا توجد منتجات منشورة حالياً." : "No published products yet.",
    outOfStock: isArabic ? "غير متوفر" : "Out of stock",
    inStock: isArabic ? "متوفر" : "In stock",
    comingSoon: isArabic ? "قريباً" : "Coming soon",
  };

  const [categories, featuredProducts, allProducts] = await Promise.all([
    listShopCategoriesForPublic(),
    listShopProductsForPublic({ featuredOnly: true, limit: 6 }),
    listShopProductsForPublic({ limit: 16 }),
  ]);

  return (
    <div className="route-sharp relative mx-auto w-full max-w-6xl px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-6 h-72 w-72 rounded-full bg-coral/16 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-14 h-80 w-80 rounded-full bg-teal/16 blur-3xl dark:bg-teal/10" />
      </div>

      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">{t.subtitle}</p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="h-fit rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
            {t.categories}
          </h2>
          <nav className="space-y-1.5">
            <Link
              href={`/${locale}/shop`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
            >
              <FiPackage className="size-4" />
              {t.allCategories}
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/${locale}/shop/${category.slug}`}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
              >
                <FiTag className="size-4" />
                {isArabic ? category.name_ar : category.name_en}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="space-y-8">
          {categories.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-10 text-center shadow-sm">
              <p className="text-sm text-[color:var(--text-muted)]">{t.noCategories}</p>
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.categories}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/${locale}/shop/${category.slug}`}
                      className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative h-40 overflow-hidden bg-[color:var(--muted)]">
                        {category.image ? (
                          <Image
                            src={category.image}
                            alt={isArabic ? category.name_ar : category.name_en}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[color:var(--text-subtle)]">
                            {t.comingSoon}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <h3 className="line-clamp-1 text-base font-semibold text-[color:var(--text)]">
                          {isArabic ? category.name_ar : category.name_en}
                        </h3>
                        <p className="line-clamp-2 text-sm text-[color:var(--text-muted)]">
                          {(isArabic ? category.description_ar : category.description_en) || t.comingSoon}
                        </p>
                        <p className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--primary)]">
                          {t.openCategory}
                          <FiArrowRight className="size-3.5" />
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {featuredProducts.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.featuredTitle}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {featuredProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/${locale}/shop/product/${product.slug}`}
                        className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="relative h-44 bg-[color:var(--muted)]">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={isArabic ? product.name_ar : product.name_en}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-subtle)]">
                              {t.comingSoon}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5 p-4">
                          <p className="text-xs text-[color:var(--text-subtle)]">
                            {isArabic ? product.category_name_ar : product.category_name_en}
                          </p>
                          <h3 className="line-clamp-1 text-sm font-semibold text-[color:var(--text)]">
                            {isArabic ? product.name_ar : product.name_en}
                          </h3>
                          <p className="text-sm font-semibold text-[color:var(--text)]">
                            {product.price.toFixed(3)} {product.currency}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.allProductsTitle}</h2>
                {allProducts.length === 0 ? (
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--text-muted)]">
                    {t.noProducts}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {allProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/${locale}/shop/product/${product.slug}`}
                        className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="relative h-44 bg-[color:var(--muted)]">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={isArabic ? product.name_ar : product.name_en}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-subtle)]">
                              {t.comingSoon}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5 p-4">
                          <p className="text-xs text-[color:var(--text-subtle)]">
                            {isArabic ? product.category_name_ar : product.category_name_en}
                          </p>
                          <h3 className="line-clamp-1 text-sm font-semibold text-[color:var(--text)]">
                            {isArabic ? product.name_ar : product.name_en}
                          </h3>
                          <p className="line-clamp-2 text-xs text-[color:var(--text-muted)]">
                            {(isArabic ? product.description_ar : product.description_en) || t.comingSoon}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-sm font-semibold text-[color:var(--text)]">
                              {product.price.toFixed(3)} {product.currency}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                product.stock_quantity > 0
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
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
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
