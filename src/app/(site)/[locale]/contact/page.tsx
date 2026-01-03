import { isLocale, type Locale } from "@/lib/locale";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="noon-text text-3xl font-semibold tracking-tight">
        {locale === "ar" ? "تواصل معنا" : "Contact Us"}
      </h1>
      <p className="noon-text-muted mt-4 text-sm">
        Phone: +968 98199508
      </p>
    </div>
  );
}
