import { isLocale, type Locale } from "@/lib/locale";

export default async function BirthdayPartiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="noon-text text-3xl font-semibold tracking-tight">
        {locale === "ar" ? "حفلات أعياد الميلاد" : "Birthday parties"}
      </h1>
      <p className="noon-text-muted mt-4 max-w-3xl text-sm leading-6">
        {locale === "ar"
          ? "سيتم بناء تدفق الحجز حسب A.md."
          : "Booking flow will be implemented per A.md."}
      </p>
    </div>
  );
}
