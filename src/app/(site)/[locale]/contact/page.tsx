import { isLocale, type Locale } from "@/lib/locale";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ sent?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sent = resolvedSearchParams?.sent === "1";
  const error = resolvedSearchParams?.sent === "0";

  const t = {
    title: locale === "ar" ? "تواصل معنا" : "Contact Us",
    subtitle:
      locale === "ar"
        ? "أرسل لنا رسالتك وسنعود إليك قريباً"
        : "Send us a message and we will get back to you soon",
    fullName: locale === "ar" ? "الاسم الكامل" : "Full Name",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    phone: locale === "ar" ? "رقم الهاتف" : "Phone Number",
    subject: locale === "ar" ? "الموضوع" : "Subject",
    message: locale === "ar" ? "الرسالة" : "Message",
    send: locale === "ar" ? "إرسال الرسالة" : "Send Message",
    success:
      locale === "ar"
        ? "تم استلام رسالتك بنجاح. سنقوم بالرد قريباً."
        : "Your message has been received. We will reply soon.",
    error:
      locale === "ar"
        ? "تعذر إرسال الرسالة حالياً. يرجى المحاولة لاحقاً."
        : "Unable to send the message right now. Please try again later.",
    contactInfo: locale === "ar" ? "معلومات التواصل" : "Contact Information",
    phoneLabel: locale === "ar" ? "الهاتف" : "Phone",
    emailLabel: locale === "ar" ? "البريد الإلكتروني" : "Email",
  };

  async function submitContact(formData: FormData) {
    "use server";

    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!fullName || !email || !phone || !subject || !message) {
      redirect(`/${locale}/contact?sent=0`);
    }

    const contactMessageModel = (prisma as unknown as {
      contactMessage?: {
        create: (args: {
          data: {
            fullName: string;
            email: string;
            phone: string;
            subject: string;
            message: string;
          };
        }) => Promise<unknown>;
      };
    }).contactMessage;

    if (!contactMessageModel) {
      redirect(`/${locale}/contact?sent=0`);
    }

    try {
      await contactMessageModel.create({
        data: {
          fullName,
          email,
          phone,
          subject,
          message,
        },
      });
    } catch {
      redirect(`/${locale}/contact?sent=0`);
    }

    redirect(`/${locale}/contact?sent=1`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="noon-text text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="noon-text-muted mt-2 text-sm">{t.subtitle}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {sent ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
              {t.success}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
              {t.error}
            </div>
          ) : null}

          <form action={submitContact} className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.fullName}
              </label>
              <input
                type="text"
                name="fullName"
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.email}
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.phone}
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.subject}
              </label>
              <input
                type="text"
                name="subject"
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.message}
              </label>
              <textarea
                name="message"
                rows={5}
                required
                className="mt-1 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {t.send}
            </button>
          </form>
        </div>

        <aside className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.contactInfo}
          </h2>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {t.phoneLabel}
            </p>
            <p>+968 98199508</p>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {t.emailLabel}
            </p>
            <p>info@noonomanarts.com</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
