import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiBox, FiChevronRight, FiInfo } from "react-icons/fi";

import {
  getShopProductBySlugForPublic,
  getShopProductReviewForUser,
  getShopProductReviewSummary,
  hasUserPurchasedShopProduct,
  listRelatedShopProductsForPublic,
  listShopProductReviewsForPublic,
} from "@/lib/db/shop";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { isLocale, type Locale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import ProductMediaGallery from "@/components/site/ProductMediaGallery";
import ProductPurchasePanel from "@/components/site/ProductPurchasePanel";
import ShopProductReviewsSection from "@/components/site/ShopProductReviewsSection";
import ShopProductCard from "@/components/site/ShopProductCard";

export default async function ShopProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const product = await getShopProductBySlugForPublic(slug);

  if (!product) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  const [relatedProducts, reviews, reviewSummary, viewerReview, viewerCanReview] = await Promise.all([
    listRelatedShopProductsForPublic({
      categoryId: product.category_id,
      excludeProductId: product.id,
      limit: 4,
    }),
    listShopProductReviewsForPublic(product.id),
    getShopProductReviewSummary(product.id),
    currentUser ? getShopProductReviewForUser(product.id, currentUser.id) : Promise.resolve(null),
    currentUser ? hasUserPurchasedShopProduct(currentUser.id, product.id) : Promise.resolve(false),
  ]);

  const t = {
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
    overview: isArabic ? "نظرة عامة" : "Overview",
    details: isArabic ? "تفاصيل المنتج" : "Product details",
    category: isArabic ? "التصنيف" : "Category",
    galleryCount: isArabic ? "عدد الصور" : "Gallery images",
    productCode: isArabic ? "كود المنتج" : "Product code",
    stockStatus: isArabic ? "حالة المخزون" : "Stock status",
    stockAvailable: isArabic ? "متاح للشحن الفوري" : "Available for immediate dispatch",
    stockUnavailable: isArabic ? "غير متاح حالياً" : "Currently unavailable",
    allProducts: isArabic ? "كل المنتجات" : "All products",
  };

  const title = isArabic ? product.name_ar : product.name_en;
  const description =
    (isArabic ? product.description_ar : product.description_en) || t.noDescription;
  const productImages = [
    product.image,
    ...product.gallery_images,
  ].filter((item): item is string => Boolean(item && item.trim()));
  const serializedReviews = reviews.map((review) => ({
    ...review,
    created_at: review.created_at.toISOString(),
  }));
  const serializedViewerReview = viewerReview ? {
    ...viewerReview,
    created_at: viewerReview.created_at.toISOString(),
  } : null;

  return (
    <div className="route-sharp relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-10">
        <main className="space-y-8">
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/shop/${product.category_slug}`}
              className="inline-flex items-center gap-2 border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:shadow-sm"
            >
              <FiArrowLeft className="h-4 w-4" />
              {t.backToCategory}
            </Link>
          </div>

          <div className="space-y-4 border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm sm:p-7">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
              <Link href={`/${locale}/shop`} className="hover:text-[color:var(--text)]">
                {t.allProducts}
              </Link>
              <FiChevronRight className="size-3.5" />
              <Link href={`/${locale}/shop/${product.category_slug}`} className="hover:text-[color:var(--text)]">
                {isArabic ? product.category_name_ar : product.category_name_en}
              </Link>
            </div>

            <div dir="ltr" className="grid gap-7 lg:grid-cols-[2fr_3fr]">
              <div className="lg:order-1">
                <ProductMediaGallery
                  title={title}
                  images={productImages}
                  noImageLabel={t.noImage}
                  galleryLabel={t.gallery}
                  mainAspectClass="aspect-square"
                />
              </div>

              <div dir={isArabic ? "rtl" : "ltr"} className={`space-y-5 lg:order-2 ${isArabic ? "text-right" : "text-left"}`}>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
                    {isArabic ? product.category_name_ar : product.category_name_en}
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">{title}</h1>
                  <p className="text-2xl font-extrabold text-[color:var(--text)]">
                    {formatAmountWithCurrency(product.price, product.currency)}
                  </p>
                </div>

                <div className="space-y-2 border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                    <FiInfo className="size-4" />
                    {t.overview}
                  </p>
                  <p className="text-sm leading-7 text-[color:var(--text-muted)]">{description}</p>
                </div>

                <ProductPurchasePanel
                  productId={product.id}
                  locale={locale}
                  stockQuantity={product.stock_quantity}
                  unitPrice={product.price}
                  currency={product.currency}
                />
              </div>
            </div>
          </div>

          <ShopProductReviewsSection
            productId={product.id}
            locale={locale}
            isAuthenticated={Boolean(currentUser)}
            canReview={viewerCanReview}
            loginHref={`/${locale}/login?next=${encodeURIComponent(`/${locale}/shop/product/${product.slug}`)}`}
            initialReviews={serializedReviews}
            initialAverageRating={reviewSummary.averageRating}
            initialReviewsCount={reviewSummary.reviewsCount}
            initialViewerReview={serializedViewerReview}
          />

          {relatedProducts.length > 0 ? (
            <section className="space-y-4">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-[color:var(--text)]">
                <FiBox className="h-5 w-5 text-[color:var(--primary)]" />
                {t.related}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {relatedProducts.map((related) => (
                  <ShopProductCard key={related.id} product={related} locale={locale} />
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
