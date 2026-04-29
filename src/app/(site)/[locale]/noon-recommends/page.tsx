import Image from "next/image";
import { FiExternalLink } from "react-icons/fi";

import { isLocale, type Locale } from "@/lib/locale";
import { getNoonRecommendationsContent } from "@/lib/recommendationsContent";

export default async function NoonRecommendsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const content = getNoonRecommendationsContent();

  const t = {
    title: isArabic ? "نون يوصي" : "Noon Recommends",
    subtitle: isArabic
      ? "منتجات وعلامات موصى بها بعد تجربة فعلية في مطبخ نون وورشنا."
      : "Products and brands recommended after real use in Noon classes and kitchen sessions.",
    usedBadge: isArabic ? "مستخدم في ورشنا" : "Used in our classes",
    buyFrom: isArabic ? "اشترِ من" : "Buy from",
    partnersTitle: isArabic ? "شركاء العلامات" : "Brand Partners",
    whyNoon: isArabic ? "لماذا نون يوصي؟" : "Why Noon recommends it",
    freeRecipe: isArabic ? "وصفة مجانية من نون" : "Free recipe by Noon",
    noProducts: isArabic ? "لا توجد منتجات في هذا التصنيف حالياً." : "No products in this category yet.",
    noPartners: isArabic ? "لا يوجد شركاء لهذا التصنيف حالياً." : "No partners for this category yet.",
  };

  return (
    <div className="route-sharp relative mx-auto w-full max-w-6xl px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-6 h-72 w-72 rounded-full bg-coral/16 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-14 h-80 w-80 rounded-full bg-teal/16 blur-3xl dark:bg-teal/10" />
      </div>

      <section className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative min-h-[260px]">
            <Image
              src={content.introImage || "/og-image.png"}
              alt={t.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">{t.title}</h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-muted)]">{t.subtitle}</p>
            <p className="mt-4 text-sm leading-7 text-[color:var(--text)]">
              {isArabic ? content.introTextAr : content.introTextEn}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 space-y-12">
        {content.categories.map((category) => (
          <section key={category.id} className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-[color:var(--text)]">
                {isArabic ? category.nameAr : category.nameEn}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                {isArabic ? category.descriptionAr : category.descriptionEn}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {category.products.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-5 text-sm text-[color:var(--text-muted)]">
                  {t.noProducts}
                </div>
              ) : (
                category.products.map((product) => (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm"
                  >
                    <div className="relative h-44">
                      <Image
                        src={product.image || "/og-image.png"}
                        alt={isArabic ? product.nameAr : product.nameEn}
                        fill
                        sizes="(max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-[color:var(--text)]">
                          {isArabic ? product.nameAr : product.nameEn}
                        </h3>
                        {product.usedInClasses ? (
                          <span className="rounded-full bg-[color:var(--muted)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--primary)]">
                            {t.usedBadge}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm text-[color:var(--text-muted)]">
                        {isArabic ? product.whyAr : product.whyEn}
                      </p>

                      <a
                        href={product.buyUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--primary)] px-3 py-2 text-sm font-medium text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
                      >
                        {`${t.buyFrom} ${isArabic ? product.buyLabelAr : product.buyLabelEn}`}
                        <FiExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[color:var(--text)]">{t.partnersTitle}</h3>

              {category.partners.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-5 text-sm text-[color:var(--text-muted)]">
                  {t.noPartners}
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {category.partners.map((partner) => (
                    <article
                      key={partner.id}
                      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="relative block h-12 w-12 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]">
                          <Image
                            src={partner.logo || "/og-image.png"}
                            alt={isArabic ? partner.brandNameAr : partner.brandNameEn}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </span>

                        <div>
                          <p className="text-sm font-semibold text-[color:var(--text)]">
                            {isArabic ? partner.brandNameAr : partner.brandNameEn}
                          </p>
                          <a
                            href={partner.websiteUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
                          >
                            {partner.websiteUrl || "#"}
                            <FiExternalLink className="size-3.5" />
                          </a>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {partner.productPhotos.slice(0, 3).map((photo, index) => (
                          <span
                            key={`${partner.id}-${index}`}
                            className="relative block h-20 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]"
                          >
                            <Image
                              src={photo || "/og-image.png"}
                              alt={`${partner.brandNameEn}-${index + 1}`}
                              fill
                              sizes="120px"
                              className="object-cover"
                            />
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-subtle)]">
                            {t.whyNoon}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                            {isArabic ? partner.whyAr : partner.whyEn}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-subtle)]">
                            {t.freeRecipe}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">
                            {isArabic ? partner.freeRecipeTitleAr : partner.freeRecipeTitleEn}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                            {isArabic ? partner.freeRecipeBodyAr : partner.freeRecipeBodyEn}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
