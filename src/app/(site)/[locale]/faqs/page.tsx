import { isLocale, type Locale } from "@/lib/locale";

export default async function FaqsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {locale === "ar" ? "الأسئلة الشائعة" : "FAQs"}
      </h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {locale === "ar" ? "قريباً" : "Coming soon."}
      </p>
    </div>
  );
}
