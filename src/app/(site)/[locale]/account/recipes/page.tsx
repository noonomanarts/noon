import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import { getVisibleRecipesByUserId } from '@/lib/db/classes';

function formatDate(locale: Locale, value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function AccountRecipesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const isArabic = locale === 'ar';

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const recipes = await getVisibleRecipesByUserId(user.id);

  const t = {
    title: isArabic ? 'وصفاتي' : 'My Recipes',
    subtitle: isArabic
      ? 'جميع الوصفات النهائية المتاحة لك من الورش والدورات تظهر هنا مباشرة.'
      : 'All final class recipes available to you are collected here in one place.',
    empty: isArabic ? 'لا توجد وصفات متاحة في حسابك حتى الآن.' : 'No recipes are available in your account yet.',
    englishPdf: isArabic ? 'الوصفة الإنجليزية PDF' : 'English Recipe PDF',
    arabicPdf: isArabic ? 'الوصفة العربية PDF' : 'Arabic Recipe PDF',
    fromOrder: isArabic ? 'من الطلب' : 'From order',
    classDate: isArabic ? 'موعد الورشة' : 'Class date',
    publishedAt: isArabic ? 'نُشرت في' : 'Published',
    noBrief: isArabic ? 'لا توجد نبذة مرفقة.' : 'No recipe brief attached.',
  };

  return (
    <div className="rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.title}</h2>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>

      {recipes.length === 0 ? (
        <div className="mt-6 rounded-none border border-[color:var(--border)] bg-[color:var(--muted)] p-5 text-sm text-[color:var(--text-muted)]">
          {t.empty}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {recipes.map((recipe) => {
            const localizedTitle = isArabic
              ? recipe.finalRecipeTitleAr || recipe.finalRecipeTitle || recipe.classTitleAr || recipe.classTitle
              : recipe.finalRecipeTitle || recipe.finalRecipeTitleAr || recipe.classTitle || recipe.classTitleAr;
            const localizedBrief = isArabic
              ? recipe.finalRecipeBriefAr || recipe.finalRecipeBrief
              : recipe.finalRecipeBrief || recipe.finalRecipeBriefAr;

            return (
              <article key={`${recipe.classId}-${recipe.bookingId}`} className="overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm">
                <div className="relative h-40 w-full bg-[color:var(--muted)]">
                  {recipe.classImage ? (
                    <Image src={recipe.classImage} alt={localizedTitle || recipe.classTitle} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                  ) : null}
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--text)]">{localizedTitle}</h3>
                    <div className="mt-2 space-y-1 text-xs text-[color:var(--text-subtle)]">
                      <p>{t.classDate}: {formatDate(locale, recipe.startDateTime)}</p>
                      <p>{t.publishedAt}: {formatDate(locale, recipe.finalRecipePublishedAt)}</p>
                      <p>
                        {t.fromOrder}: <Link href={`/${locale}/account/orders/${recipe.bookingId}`} className="font-medium text-[color:var(--primary)] hover:underline">{recipe.bookingNumber}</Link>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">{localizedBrief || t.noBrief}</p>

                  <div className="flex flex-wrap gap-3">
                    {recipe.finalRecipePdf ? (
                      <Link
                        href={recipe.finalRecipePdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-none bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--primary-foreground)] hover:opacity-90"
                      >
                        {t.englishPdf}
                      </Link>
                    ) : null}

                    {recipe.finalRecipePdfAr ? (
                      <Link
                        href={recipe.finalRecipePdfAr}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-none border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface)]"
                      >
                        {t.arabicPdf}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}