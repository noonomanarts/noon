"use client";

import { isLocale, type Locale } from "@/lib/locale";
import { useState, useTransition } from "react";
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

  // Get locale from params
  useState(() => {
    params.then(({ locale: rawLocale }) => {
      setLocale(isLocale(rawLocale) ? rawLocale : "en");
    });
  });

  const t = {
    title: locale === "ar" ? "تواصل معنا" : "Contact Us",
    subtitle:
      locale === "ar"
        ? "نحن هنا للإجابة على أسئلتك ومساعدتك"
        : "We're here to answer your questions and help you",
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-white p-4 dark:from-zinc-950 dark:to-zinc-900">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <MdCheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
            {t.successTitle}
          </h2>
          <p className="mb-8 text-zinc-600 dark:text-zinc-400">
            {t.successMessage}
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="rounded-xl bg-coral px-6 py-3 font-semibold text-white transition-all hover:bg-coral-dark"
          >
            {t.sendAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal to-teal-dark py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            {t.title}
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-white/90">{t.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Contact Info */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Address */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10">
                  <MdLocationOn className="h-6 w-6 text-coral" />
                </div>
                <h3 className="mb-2 font-bold text-zinc-900 dark:text-white">
                  {t.visitUs}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">{t.address}</p>
              </div>

              {/* Phone */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                  <MdPhone className="h-6 w-6 text-teal" />
                </div>
                <h3 className="mb-2 font-bold text-zinc-900 dark:text-white">
                  {t.callUs}
                </h3>
                <a
                  href="tel:+96812345678"
                  className="text-teal hover:underline"
                >
                  +968 1234 5678
                </a>
              </div>

              {/* Email */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                  <MdEmail className="h-6 w-6 text-purple" />
                </div>
                <h3 className="mb-2 font-bold text-zinc-900 dark:text-white">
                  {t.emailUs}
                </h3>
                <a
                  href="mailto:info@noon.om"
                  className="text-purple hover:underline"
                >
                  info@noon.om
                </a>
              </div>

              {/* Social */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 font-bold text-zinc-900 dark:text-white">
                  {t.followUs}
                </h3>
                <div className="flex gap-4">
                  <a
                    href="https://wa.me/96812345678"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white transition-all hover:bg-green-600"
                  >
                    <FaWhatsapp className="h-6 w-6" />
                  </a>
                  <a
                    href="https://instagram.com/noon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white transition-all hover:opacity-90"
                  >
                    <FaInstagram className="h-6 w-6" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white">
                      {t.name} <span className="text-coral">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white">
                      {t.email} <span className="text-coral">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white">
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white">
                      {t.subject} <span className="text-coral">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      required
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.message} <span className="text-coral">*</span>
                  </label>
                  <textarea
                    name="message"
                    rows={6}
                    required
                    className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-100 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-teal-light px-6 py-4 text-lg font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
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
          </div>
        </div>
      </div>
    </div>
  );
}
