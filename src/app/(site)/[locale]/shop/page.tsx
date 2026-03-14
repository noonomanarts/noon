import Image from "next/image";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { isLocale, type Locale } from "@/lib/locale";
import { listShopCategoriesForPublic, listShopProductsForPublic } from "@/lib/db/shop";
import ShopProductCard from "@/components/site/ShopProductCard";
import { getReadableTextColor, resolveHeaderColor } from "@/lib/headerBranding";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const headerColor = await resolveHeaderColor();
  const headerButtonTextColor = getReadableTextColor(headerColor);

  const t = {
    title: isArabic ? "المتجر" : "Shop",
    subtitle: isArabic
      ? "تصنيفات ومنتجات مختارة بعناية من فريق نون."
      : "Curated categories and products selected by the Noon team.",
    categories: isArabic ? "التصنيفات" : "Categories",
    noCategories: isArabic ? "لا توجد تصنيفات نشطة حالياً." : "No active categories available right now.",
    openCategory: isArabic ? "فتح التصنيف" : "Open category",
    featuredTitle: isArabic ? "منتجات مميزة" : "Featured Products",
    allProductsTitle: isArabic ? "جميع المنتجات" : "All Products",
    noProducts: isArabic ? "لا توجد منتجات منشورة حالياً." : "No published products yet.",
    outOfStock: isArabic ? "غير متوفر" : "Out of stock",
    inStock: isArabic ? "متوفر" : "In stock",
    comingSoon: isArabic ? "قريباً" : "Coming soon",
    totalProducts: isArabic ? "إجمالي المنتجات" : "Total products",
    readyToShip: isArabic ? "جاهز للشحن" : "Ready to ship",
    featuredCount: isArabic ? "منتجات مميزة" : "Featured items",
  };

  const [categories, featuredProducts, allProducts] = await Promise.all([
    listShopCategoriesForPublic(),
    listShopProductsForPublic({ featuredOnly: true, limit: 6 }),
    listShopProductsForPublic({ limit: 16 }),
  ]);
  const inStockCount = allProducts.filter((item) => item.stock_quantity > 0).length;

  return (
    <div className="route-sharp relative mx-auto w-full max-w-6xl px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-6 h-72 w-72 rounded-full bg-coral/16 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-14 h-80 w-80 rounded-full bg-teal/16 blur-3xl dark:bg-teal/10" />
      </div>

      <section className="border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">{t.subtitle}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="border border-[color:var(--border)] bg-[color:var(--muted)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.totalProducts}</p>
            <p className="mt-1 text-2xl font-extrabold text-[color:var(--text)]">{allProducts.length}</p>
          </div>
          <div className="border border-[color:var(--border)] bg-[color:var(--muted)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.readyToShip}</p>
            <p className="mt-1 text-2xl font-extrabold text-[color:var(--text)]">{inStockCount}</p>
          </div>
          <div className="border border-[color:var(--border)] bg-[color:var(--muted)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.featuredCount}</p>
            <p className="mt-1 text-2xl font-extrabold text-[color:var(--text)]">{featuredProducts.length}</p>
          </div>
        </div>
      </section>

      <div className="mt-8 space-y-8">
          {categories.length === 0 ? (
            <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-10 text-center shadow-sm">
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
                      className="group overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
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
                        <p
                          className="inline-flex w-full items-center justify-center gap-1 border border-black/20 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
                          style={{ backgroundColor: headerColor, color: headerButtonTextColor }}
                        >
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
                      <ShopProductCard key={product.id} product={product} locale={locale} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.allProductsTitle}</h2>
                {allProducts.length === 0 ? (
                  <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--text-muted)]">
                    {t.noProducts}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {allProducts.map((product) => (
                      <ShopProductCard key={product.id} product={product} locale={locale} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
      </div>
    </div>
  );
}
