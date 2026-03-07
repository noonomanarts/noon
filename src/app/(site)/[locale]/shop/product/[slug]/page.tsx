import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiBox } from "react-icons/fi";

import AddToCartButton from "@/components/site/AddToCartButton";
import {
  getShopProductBySlugForPublic,
  listRelatedShopProductsForPublic,
  listShopCategoriesForPublic,
} from "@/lib/db/shop";
import { isLocale, type Locale } from "@/lib/locale";

export default async function ShopProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const [categories, product] = await Promise.all([
    listShopCategoriesForPublic(),
    getShopProductBySlugForPublic(slug),
  ]);

  if (!product) {
    notFound();
  }

  const relatedProducts = await listRelatedShopProductsForPublic({
    categoryId: product.category_id,
    excludeProductId: product.id,
    limit: 4,
  });

  const t = {
    categories: isArabic ? "التصنيفات" : "Categories",
    allCategories: isArabic ? "كل التصنيفات" : "All Categories",
    stock: isArabic ? "المخزون" : "Stock",
    inStock: isArabic ? "متوفر" : "In stock",
    outOfStock: isArabic ? "غير متوفر حالياً" : "Out of stock",
    sku: "SKU",
    backToCategory: isArabic ? "العودة للتصنيف" : "Back to category",
    related: isArabic ? "منتجات مشابهة" : "Related Products",
    noDescription: isArabic
      ? "لا يوجد وصف متاح لهذا المنتج حالياً."
      : "No description available for this product yet.",
    gallery: isArabic ? "صور المنتج" : "Product Gallery",
    noImage: isArabic ? "لا توجد صورة" : "No image",
  };

  const title = isArabic ? product.name_ar : product.name_en;
  const description =
    (isArabic ? product.description_ar : product.description_en) || t.noDescription;
  const primaryImage = product.image || product.gallery_images[0] || null;

  return (
    <div className="relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-10 lg:flex-row">
        <aside className="w-full lg:w-72 lg:flex-shrink-0">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-base font-semibold text-[color:var(--text)]">{t.categories}</h2>
            <nav className="mt-4 space-y-1.5">
              <Link
                href={`/${locale}/shop`}
                className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2.5 text-sm font-medium text-[color:var(--text)] transition hover:shadow-sm"
              >
                {t.allCategories}
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${locale}/shop/${category.slug}`}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    category.slug === product.category_slug
                      ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                      : "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] hover:bg-[color:var(--muted)]"
                  }`}
                >
                  {isArabic ? category.name_ar : category.name_en}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 space-y-8">
          <div className="grid gap-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm sm:p-7 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]">
                {primaryImage ? (
                  <Image
                    src={primaryImage}
                    alt={title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[color:var(--text-subtle)]">
                    {t.noImage}
                  </div>
                )}
              </div>

              {product.gallery_images.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[color:var(--text)]">{t.gallery}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {product.gallery_images.slice(0, 8).map((imageUrl) => (
                      <div
                        key={imageUrl}
                        className="relative aspect-square overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]"
                      >
                        <Image src={imageUrl} alt={title} fill sizes="120px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
                {isArabic ? product.category_name_ar : product.category_name_en}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">{title}</h1>
              <p className="text-lg font-semibold text-[color:var(--text)]">
                {product.price.toFixed(3)} {product.currency}
              </p>
              <p className="text-sm leading-7 text-[color:var(--text-muted)]">{description}</p>

              <div className="space-y-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                {product.sku ? (
                  <p className="text-sm text-[color:var(--text)]">
                    <span className="font-semibold">{t.sku}:</span> {product.sku}
                  </p>
                ) : null}
                <p className="text-sm text-[color:var(--text)]">
                  <span className="font-semibold">{t.stock}:</span>{" "}
                  {product.stock_quantity > 0
                    ? `${product.stock_quantity} (${t.inStock})`
                    : t.outOfStock}
                </p>
              </div>

              <AddToCartButton
                productId={product.id}
                locale={locale}
                disabled={product.stock_quantity <= 0}
              />

              <Link
                href={`/${locale}/shop/${product.category_slug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:shadow-sm"
              >
                <FiArrowLeft className="h-4 w-4" />
                {t.backToCategory}
              </Link>
            </div>
          </div>

          {relatedProducts.length > 0 ? (
            <section className="space-y-4">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-[color:var(--text)]">
                <FiBox className="h-5 w-5 text-[color:var(--primary)]" />
                {t.related}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {relatedProducts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/${locale}/shop/product/${related.slug}`}
                    className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative h-36 w-full bg-[color:var(--muted)]">
                      {related.image ? (
                        <Image
                          src={related.image}
                          alt={isArabic ? related.name_ar : related.name_en}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-subtle)]">
                          {t.noImage}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 p-3">
                      <h3 className="line-clamp-1 text-sm font-semibold text-[color:var(--text)]">
                        {isArabic ? related.name_ar : related.name_en}
                      </h3>
                      <p className="text-sm font-semibold text-[color:var(--text)]">
                        {related.price.toFixed(3)} {related.currency}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
