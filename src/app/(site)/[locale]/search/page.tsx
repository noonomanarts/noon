import { isLocale, type Locale } from "@/lib/locale";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const { q } = await searchParams;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="noon-text text-3xl font-semibold tracking-tight">
        {locale === "ar" ? "بحث" : "Search"}
      </h1>
      <p className="noon-text-muted mt-4 text-sm">
        {locale === "ar" ? "استعلام" : "Query"}: {q ?? "-"}
      </p>
    </div>
  );
}
