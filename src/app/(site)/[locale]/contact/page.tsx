"use client";

import { isLocale, type Locale } from "@/lib/locale";
import { useEffect, useState, useTransition } from "react";
import {
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdSend,
  MdCheckCircle,
} from "react-icons/md";
import { FaWhatsapp, FaInstagram } from "react-icons/fa6";

export default function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ locale: rawLocale }) => {
      setLocale(isLocale(rawLocale) ? rawLocale : "en");
    });
  }, [params]);

  const isArabic = locale === "ar";

  const t = {
    title: locale === "ar" ? "تواصل معنا" : "Contact Us",
    subtitle:
      locale === "ar"
        ? "يسعدنا الرد على استفساراتك ومساعدتك في أي وقت."
        : "We would love to hear from you and help with your questions.",
    helper:
      locale === "ar"
        ? "فريق نون جاهز لدعمك في تفاصيل الدورات والحجوزات والطلبات الخاصة."
        : "Our Noon team is ready to support classes, bookings, and special requests.",
    name: locale === "ar" ? "الاسم الكامل" : "Full Name",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    phone: locale === "ar" ? "رقم الهاتف" : "Phone Number",
    subject: locale === "ar" ? "الموضوع" : "Subject",
    message: locale === "ar" ? "الرسالة" : "Message",
    send: locale === "ar" ? "إرسال الرسالة" : "Send Message",
    sending: locale === "ar" ? "جاري الإرسال..." : "Sending...",
    successTitle: locale === "ar" ? "تم الإرسال بنجاح!" : "Message Sent!",
    successMessage:
      locale === "ar"
        ? "شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن."
        : "Thank you for contacting us. We'll get back to you as soon as possible.",
    sendAnother: locale === "ar" ? "إرسال رسالة أخرى" : "Send Another Message",
    errorMessage:
      locale === "ar"
        ? "حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى."
        : "An error occurred. Please try again.",
    required: locale === "ar" ? "مطلوب" : "required",
    visitUs: locale === "ar" ? "زورنا" : "Visit Us",
    callUs: locale === "ar" ? "اتصل بنا" : "Call Us",
    emailUs: locale === "ar" ? "راسلنا" : "Email Us",
    followUs: locale === "ar" ? "تابعنا" : "Follow Us",
    address:
      locale === "ar"
        ? "مسقط، سلطنة عمان"
        : "Muscat, Sultanate of Oman",
    officeHours:
      locale === "ar"
        ? "الأحد - الخميس • 9:00 صباحاً - 6:00 مساءً"
        : "Sunday - Thursday • 9:00 AM - 6:00 PM",
    quickResponse:
      locale === "ar"
        ? "عادةً نرد خلال يوم عمل واحد."
        : "We usually reply within one business day.",
    contactDetails: locale === "ar" ? "معلومات التواصل" : "Contact Details",
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };

    startTransition(async () => {
      try {
        const response = await fetch("/api/public/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        setIsSubmitted(true);
      } catch {
        setError(t.errorMessage);
      }
    });
  };

  if (isSubmitted) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-6xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200/70 bg-white p-8 text-center shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full noon-soft-teal">
            <MdCheckCircle className="h-10 w-10 text-[color:var(--noon-teal-strong)]" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {t.successTitle}
          </h2>
          <p className="mb-7 text-sm text-zinc-600 dark:text-zinc-300">
            {t.successMessage}
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="noon-btn-teal rounded-xl px-6 py-3 text-sm font-semibold"
          >
            {t.sendAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10" dir={isArabic ? "rtl" : "ltr"}>
      <section className="overflow-hidden rounded-3xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
        <div className="bg-gradient-to-br from-[color:var(--noon-teal)] to-[color:var(--noon-teal-strong)] px-6 py-10 text-white md:px-10">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/95">{t.subtitle}</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">{t.helper}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t.contactDetails}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.quickResponse}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg noon-soft-coral">
              <MdLocationOn className="h-5 w-5 text-[color:var(--noon-coral-strong)]" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.visitUs}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.address}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.officeHours}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center noon-soft-teal rounded-lg">
              <MdPhone className="h-5 w-5 text-[color:var(--noon-teal-strong)]" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.callUs}</h3>
            <a href="tel:+96898199508" className="mt-1 block text-sm font-medium text-[color:var(--noon-teal-strong)] hover:underline">
              +968 98199508
            </a>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center noon-soft-purple rounded-lg">
              <MdEmail className="h-5 w-5 text-[color:var(--noon-purple-strong)]" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.emailUs}</h3>
            <a href="mailto:hello@noonoman.com" className="mt-1 block text-sm font-medium text-[color:var(--noon-purple-strong)] hover:underline">
              hello@noonoman.com
            </a>

            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.followUs}</h4>
              <div className="flex gap-3">
                <a
                  href="https://wa.me/96898199508"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500 text-white transition hover:bg-green-600"
                  aria-label="WhatsApp"
                >
                  <FaWhatsapp className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com/noon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white transition hover:opacity-90"
                  aria-label="Instagram"
                >
                  <FaInstagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.name} <span className="text-[color:var(--noon-coral)]">*</span>
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.email} <span className="text-[color:var(--noon-coral)]">*</span>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.phone}</span>
                <input
                  type="tel"
                  name="phone"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.subject} <span className="text-[color:var(--noon-coral)]">*</span>
                </span>
                <input
                  type="text"
                  name="subject"
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.message} <span className="text-[color:var(--noon-coral)]">*</span>
              </span>
              <textarea
                name="message"
                rows={6}
                required
                className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 transition focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="noon-btn-teal inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                t.sending
              ) : (
                <>
                  <MdSend className="h-5 w-5" />
                  {t.send}
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
