import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import {
  getShopProductBySlugForPublic,
  listRelatedShopProductsForPublic,
  listShopCategoriesForPublic,
} from '@/lib/db/shop';
import AddToCartButton from '@/components/site/AddToCartButton';

export default async function ShopProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

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
    categories: locale === 'ar' ? 'التصنيفات' : 'Categories',
    allCategories: locale === 'ar' ? 'كل التصنيفات' : 'All Categories',
    stock: locale === 'ar' ? 'المخزون' : 'Stock',
    inStock: locale === 'ar' ? 'متوفر' : 'In stock',
    outOfStock: locale === 'ar' ? 'غير متوفر حالياً' : 'Out of stock',
    sku: 'SKU',
    backToCategory: locale === 'ar' ? 'العودة للتصنيف' : 'Back to category',
    related: locale === 'ar' ? 'منتجات مشابهة' : 'Related Products',
    noDescription: locale === 'ar' ? 'لا يوجد وصف متاح لهذا المنتج حالياً.' : 'No description available for this product yet.',
    gallery: locale === 'ar' ? 'صور المنتج' : 'Product Gallery',
  };

  const title = locale === 'ar' ? product.name_ar : product.name_en;
  const description = (locale === 'ar' ? product.description_ar : product.description_en) || t.noDescription;
  const primaryImage = product.image || product.gallery_images[0] || null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 lg:flex-row">
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <div className="sticky top-24">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.categories}</h2>
          <nav className="space-y-1">
            <Link
              href={`/${locale}/shop`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <span className="text-xl">🛍️</span>
              <span>{t.allCategories}</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${locale}/shop/${category.slug}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  category.slug === product.category_slug
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                }`}
              >
                <span className="text-xl">📦</span>
                <span>{locale === 'ar' ? category.name_ar : category.name_en}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
              {primaryImage ? (
                <Image src={primaryImage} alt={title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">No image</div>
              )}
            </div>

            {product.gallery_images.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.gallery}</p>
                <div className="grid grid-cols-4 gap-2">
                  {product.gallery_images.slice(0, 8).map((imageUrl) => (
                    <div key={imageUrl} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      <Image src={imageUrl} alt={title} fill sizes="120px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{locale === 'ar' ? product.category_name_ar : product.category_name_en}</p>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{product.price.toFixed(3)} {product.currency}</p>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>

            <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              {product.sku && (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold">{t.sku}:</span> {product.sku}
                </p>
              )}
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold">{t.stock}:</span> {product.stock_quantity > 0 ? `${product.stock_quantity} (${t.inStock})` : t.outOfStock}
              </p>
            </div>

            <AddToCartButton productId={product.id} locale={locale} disabled={product.stock_quantity <= 0} />

            <Link
              href={`/${locale}/shop/${product.category_slug}`}
              className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t.backToCategory}
            </Link>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t.related}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/${locale}/shop/product/${related.slug}`}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="relative h-36 w-full bg-zinc-100 dark:bg-zinc-800">
                    {related.image ? (
                      <Image src={related.image} alt={locale === 'ar' ? related.name_ar : related.name_en} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">No image</div>
                    )}
                  </div>
                  <div className="space-y-1.5 p-3">
                    <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {locale === 'ar' ? related.name_ar : related.name_en}
                    </h3>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{related.price.toFixed(3)} {related.currency}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
