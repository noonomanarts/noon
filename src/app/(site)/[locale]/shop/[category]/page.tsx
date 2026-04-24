import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { getShopCategoryBySlug, listShopProductsForPublic } from "@/lib/db/shop";
import { isLocale, type Locale } from "@/lib/locale";
import ShopProductCard from "@/components/site/ShopProductCard";

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale: rawLocale, category } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const currentCategory = await getShopCategoryBySlug(category);

  if (!currentCategory) {
    notFound();
  }

  const products = await listShopProductsForPublic({ categorySlug: category });

  const t = {
    comingSoon: isArabic ? "قريباً" : "Coming Soon",
    comingSoonDesc: isArabic
      ? "نعمل على إضافة منتجات رائعة في هذه الفئة."
      : "We're working on adding amazing products in this category.",
    openAll: isArabic ? "عرض كل التصنيفات" : "View all categories",
    noProducts: isArabic
      ? "لا توجد منتجات حالياً في هذا التصنيف."
      : "No products in this category yet.",
    inStock: isArabic ? "متوفر" : "In stock",
    outOfStock: isArabic ? "غير متوفر حالياً" : "Out of stock",
    productsCount: isArabic ? "عدد المنتجات" : "Products",
    availableCount: isArabic ? "جاهز للشحن" : "Available",
    backToShop: isArabic ? "العودة للمتجر" : "Back to shop",
  };

  const categoryName = isArabic ? currentCategory.name_ar : currentCategory.name_en;
  const categoryDescription =
    (isArabic ? currentCategory.description_ar : currentCategory.description_en) || t.comingSoonDesc;
  const inStockCount = products.filter((item) => item.stock_quantity > 0).length;

  return (
    <div className="route-sharp relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-10 text-center">
        <div className="mb-4 flex justify-center">
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center gap-2 border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:shadow-sm"
          >
            <FiArrowLeft className="h-4 w-4" />
            {t.backToShop}
          </Link>
        </div>
        <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
          <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">
            {categoryName}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {categoryDescription}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="border border-[color:var(--border)] bg-[color:var(--muted)] p-3 text-center">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.productsCount}</p>
              <p className="mt-1 text-2xl font-extrabold text-[color:var(--text)]">{products.length}</p>
            </div>
            <div className="border border-[color:var(--border)] bg-[color:var(--muted)] p-3 text-center">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.availableCount}</p>
              <p className="mt-1 text-2xl font-extrabold text-[color:var(--text)]">{inStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-6xl space-y-6 px-4 text-center">
        <main>
          {products.length === 0 ? (
            <div className="overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm">
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
                  className="mt-6 inline-flex items-center justify-center border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:shadow-sm"
                >
                  {t.openAll}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {products.map((product) => (
                <ShopProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
