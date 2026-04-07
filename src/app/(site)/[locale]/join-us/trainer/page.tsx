import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";
import { getJoinUsFormsConfig } from "@/lib/db/joinUs";
import TrainerApplicationForm from "@/components/site/TrainerApplicationForm";

export default async function TrainerApplicationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  let config;
  try {
    config = await getJoinUsFormsConfig();
  } catch {
    config = { trainer: { enabled: true }, social_media: { enabled: false } };
  }

  if (!config.trainer?.enabled) {
    redirect(`/${locale}/join-us`);
  }

  return <TrainerApplicationForm locale={locale} />;
}
