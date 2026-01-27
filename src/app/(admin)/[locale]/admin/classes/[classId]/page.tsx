import { isLocale, type Locale } from "@/lib/locale";

export default async function AdminClassDetailsPlaceholder({
  params,
}: {
  params: Promise<{ locale: string; classId: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {locale === "ar" ? "تفاصيل الصف" : "Class Details"}
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {locale === "ar"
          ? "هذه الصفحة سيتم تطويرها لاحقاً."
          : "This page will be implemented later."}
      </p>
    </div>
  );
}
