import Image from "next/image";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiBox } from "react-icons/fi";

import { isLocale, type Locale } from "@/lib/locale";
import { listShopCategoriesForPublic, listShopProductsForPublic } from "@/lib/db/shop";
import ShopProductCard from "@/components/site/ShopProductCard";
import { getShopPageContentSettings } from "@/lib/shopPageContent";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";
import { getReadableTextColor, resolveHeaderColor } from "@/lib/headerBranding";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const MoreArrowIcon = isArabic ? FiArrowLeft : FiArrowRight;

  const t = {
    defaultTitle: isArabic ? "المتجر" : "Shop",
    noCategories: isArabic ? "لا توجد تصنيفات نشطة حالياً." : "No active categories available right now.",
    noProductsInCategory: isArabic ? "لا توجد منتجات منشورة في هذا التصنيف حالياً." : "No published products in this category right now.",
    noProducts: isArabic ? "لا توجد منتجات منشورة حالياً." : "No published products yet.",
    moreProducts: isArabic ? "المزيد من المنتجات" : "More products",
    viewAllProducts: isArabic ? "عرض كل المنتجات في هذا التصنيف" : "View all products in this category",
    discoverMore: isArabic ? "Discover more" : "Discover more",
    visitWebsite: isArabic ? "زيارة الموقع" : "Visit website",
  };

  const [categories, allProducts, shopPageContent, shopPageSettings] = await Promise.all([
    listShopCategoriesForPublic(),
    listShopProductsForPublic({ limit: 200 }),
    getShopPageContentSettings(),
    getPublicSitePageSettings("shop_index"),
  ]);
  const siteButtonColor = await resolveHeaderColor();
  const siteButtonTextColor = getReadableTextColor(siteButtonColor);

  const pageTitle =
    (isArabic ? shopPageSettings?.headingAr : shopPageSettings?.headingEn)?.trim() || t.defaultTitle;

  const preferredOrder = ["butter-n-butter", "sweets", "raw-materials", "gift-vouchers"];
  const categoryTitleOverrides: Record<string, { en: string; ar: string }> = {
    "butter-n-butter": { en: "Butter n butter", ar: "Butter n butter" },
    sweets: { en: "Butter n butter", ar: "Butter n butter" },
    "raw-materials": { en: "Raw materials", ar: "المواد الخام" },
    "gift-vouchers": { en: "Gift vouchers", ar: "قسائم الهدايا" },
  };

  const orderedCategories = [...categories].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.slug);
    const bIndex = preferredOrder.indexOf(b.slug);
    const aOrder = aIndex === -1 ? preferredOrder.length + a.sort_order : aIndex;
    const bOrder = bIndex === -1 ? preferredOrder.length + b.sort_order : bIndex;
    return aOrder - bOrder;
  });

  const categoriesWithProducts = orderedCategories.map((category) => {
    const products = allProducts
      .filter((product) => product.category_id === category.id)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    return {
      category,
      products,
      previewProducts: products.slice(0, 3),
    };
  });

  const discoverLinks = shopPageContent.discoverLinks
    .filter((item) => item.isActive && item.url)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.titleEn.localeCompare(b.titleEn));

  return (
    <div className="route-sharp pb-14">
      <section className="relative mb-10 h-[16rem] w-full overflow-hidden sm:h-[19rem] md:h-[22rem]">
        <Image
          src={shopPageContent.headerImage}
          alt={pageTitle}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/40 to-black/50" />
        <div className="absolute inset-0 mx-auto flex w-full max-w-6xl items-center justify-center px-4 text-center">
          <h1 className="w-full text-4xl font-bold text-white sm:text-5xl">{pageTitle}</h1>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 text-center">
        {categoriesWithProducts.length === 0 ? (
          <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-10 text-center shadow-sm">
            <p className="text-sm text-[color:var(--text-muted)]">{t.noCategories}</p>
          </div>
        ) : (
          categoriesWithProducts.map(({ category, products, previewProducts }) => {
            const override = categoryTitleOverrides[category.slug];
            const categoryTitle = override
              ? isArabic
                ? override.ar
                : override.en
              : isArabic
                ? category.name_ar
                : category.name_en;

            return (
              <section key={category.id} className="space-y-4">
                <h2 className="inline-flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight text-[color:var(--text)] sm:text-4xl">
                  <FiBox className="size-7 text-coral" />
                  {categoryTitle}
                </h2>

                {products.length === 0 ? (
                  <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--text-muted)]">
                    {t.noProductsInCategory}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {previewProducts.map((product) => (
                      <ShopProductCard key={product.id} product={product} locale={locale} />
                    ))}
                    <Link
                      href={`/${locale}/shop/${category.slug}`}
                      className="group flex h-full flex-col items-center justify-center gap-3 border border-white/35 p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-lg"
                      style={{ backgroundColor: siteButtonColor, color: siteButtonTextColor }}
                    >
                      <span className="inline-flex size-14 items-center justify-center border border-white/35 bg-black/10">
                        <MoreArrowIcon className="size-6" />
                      </span>
                      <p className="text-2xl font-extrabold tracking-tight">{t.moreProducts}</p>
                      <p className="w-full max-w-[24ch] text-center text-sm opacity-90">{t.viewAllProducts}</p>
                    </Link>
                  </div>
                )}
              </section>
            );
          })
        )}

        {discoverLinks.length > 0 ? (
          <section className="space-y-4 pt-2">
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.discoverMore}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {discoverLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative h-44 overflow-hidden bg-[color:var(--muted)]">
                    {link.image ? (
                      <Image
                        src={link.image}
                        alt={(isArabic ? link.titleAr : link.titleEn) || link.titleEn || link.titleAr || t.discoverMore}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2 p-4 text-center">
                    <h3 className="line-clamp-1 text-base font-semibold text-[color:var(--text)]">
                      {(isArabic ? link.titleAr : link.titleEn) || link.titleEn || link.titleAr}
                    </h3>
                    {(link.descriptionEn || link.descriptionAr) ? (
                      <p className="line-clamp-2 text-sm text-[color:var(--text-muted)]">
                        {(isArabic ? link.descriptionAr : link.descriptionEn) || link.descriptionEn || link.descriptionAr}
                      </p>
                    ) : null}
                    <p
                      className="inline-flex w-full items-center justify-center gap-1 border border-black/20 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
                      style={{ backgroundColor: siteButtonColor, color: siteButtonTextColor }}
                    >
                      {t.visitWebsite}
                      <FiArrowRight className="size-3.5" />
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {allProducts.length === 0 ? (
          <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-center text-sm text-[color:var(--text-muted)]">
            {t.noProducts}
          </div>
        ) : null}
      </div>
    </div>
  );
}
