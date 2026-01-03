import { isLocale, type Locale } from "@/lib/locale";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="noon-text text-3xl font-semibold tracking-tight">
        {locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}
      </h1>
      <p className="noon-text-muted mt-4 text-sm">
        {locale === "ar" ? "قريباً" : "Coming soon."}
      </p>
    </div>
  );
}
