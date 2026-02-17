import { isLocale, type Locale } from "@/lib/locale";
import Image from "next/image";
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
      ? "منتجات وعلامات نثق بها بعد اختبارها داخل مطبخ نون ودوراتنا العملية."
      : "Products and brands we genuinely trust after testing them in our Noon kitchen and classes.",
    usedBadge: isArabic ? "(مستخدم في دوراتنا)" : "(used in our classes)",
    buyFrom: isArabic ? "اشترِ من" : "Buy from",
    partnersTitle: isArabic ? "شركاء العلامات" : "Brand Partners",
    whyNoon: isArabic ? "لماذا نون يوصي؟" : "Why Noon recommends it",
    freeRecipe: isArabic ? "وصفة مجانية من نون" : "Free Recipe by Noon",
    noProducts: isArabic ? "لا توجد منتجات حالياً في هذا التصنيف." : "No products yet in this category.",
    noPartners: isArabic ? "لا يوجد شركاء مضافون لهذا التصنيف حالياً." : "No partners added for this category yet.",
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
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
            <h1 className="noon-text text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{t.subtitle}</p>
            <p className="mt-4 text-sm leading-7 text-zinc-700 dark:text-zinc-200">
              {isArabic ? content.introTextAr : content.introTextEn}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 space-y-12">
        {content.categories.map((category) => (
          <section key={category.id} className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {isArabic ? category.nameAr : category.nameEn}
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {isArabic ? category.descriptionAr : category.descriptionEn}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {category.products.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                  {t.noProducts}
                </div>
              ) : (
                category.products.map((product) => (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900"
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
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          {isArabic ? product.nameAr : product.nameEn}
                        </h3>
                        {product.usedInClasses ? (
                          <span className="rounded-full bg-[color:var(--noon-teal-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--noon-teal-strong)]">
                            {t.usedBadge}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {isArabic ? product.whyAr : product.whyEn}
                      </p>

                      <a
                        href={product.buyUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      >
                        {`${t.buyFrom} ${isArabic ? product.buyLabelAr : product.buyLabelEn}`}
                      </a>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t.partnersTitle}</h3>

              {category.partners.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                  {t.noPartners}
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {category.partners.map((partner) => (
                    <article
                      key={partner.id}
                      className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-3">
                        <span className="relative block h-12 w-12 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                          <Image
                            src={partner.logo || "/og-image.png"}
                            alt={isArabic ? partner.brandNameAr : partner.brandNameEn}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </span>

                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {isArabic ? partner.brandNameAr : partner.brandNameEn}
                          </p>
                          <a
                            href={partner.websiteUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-[color:var(--noon-teal-strong)] hover:underline"
                          >
                            {partner.websiteUrl || "#"}
                          </a>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {partner.productPhotos.slice(0, 3).map((photo, index) => (
                          <span
                            key={`${partner.id}-${index}`}
                            className="relative block h-20 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
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
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {t.whyNoon}
                          </p>
                          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                            {isArabic ? partner.whyAr : partner.whyEn}
                          </p>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {t.freeRecipe}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {isArabic ? partner.freeRecipeTitleAr : partner.freeRecipeTitleEn}
                          </p>
                          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
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
