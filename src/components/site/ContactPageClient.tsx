"use client";

import { useState, useTransition } from "react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { FiMail, FiMapPin, FiPhone, FiSend } from "react-icons/fi";
import { MdCheckCircle } from "react-icons/md";

import BookingFormError from "@/components/site/BookingFormError";
import type { SitePageSettings } from "@/lib/admin/sitePages";
import { isValidEmail, isValidPhone } from "@/lib/forms/eventBooking";
import type { Locale } from "@/lib/locale";

function resolvePhoneHref(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.toLowerCase().startsWith("tel:")) return normalized;
  const compact = normalized.replace(/[^\d+]/g, "");
  return compact ? `tel:${compact}` : "";
}

function resolveEmailHref(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.toLowerCase().startsWith("mailto:")) return normalized;
  return normalized.includes("@") ? `mailto:${normalized}` : "";
}

export default function ContactPageClient({
  locale,
  settings,
}: {
  locale: Locale;
  settings: SitePageSettings;
}) {
  const isArabic = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = (isArabic ? settings.headingAr : settings.headingEn).trim() || (isArabic ? "تواصل معنا" : "Contact Us");
  const subtitle =
    (isArabic ? settings.contactPage.subtitleAr : settings.contactPage.subtitleEn).trim() ||
    (isArabic ? settings.subheadingAr : settings.subheadingEn).trim();
  const helper = (isArabic ? settings.contactPage.helperAr : settings.contactPage.helperEn).trim();

  const phone = settings.contactPage.phonePrimary.trim();
  const phoneHref = resolvePhoneHref(phone);
  const email = settings.contactPage.emailPrimary.trim();
  const emailHref = resolveEmailHref(email);

  const successTitle =
    (isArabic ? settings.contactPage.successTitleAr : settings.contactPage.successTitleEn).trim() ||
    (isArabic ? "تم إرسال رسالتك" : "Message Sent");
  const successMessage =
    (isArabic ? settings.contactPage.successMessageAr : settings.contactPage.successMessageEn).trim() ||
    (isArabic
      ? "شكرًا لتواصلك. سيقوم فريقنا بالرد عليك قريبًا."
      : "Thank you for contacting us. Our team will reply shortly.");

  const t = {
    title,
    subtitle,
    helper,
    name: isArabic ? "الاسم الكامل" : "Full Name",
    email: isArabic ? "البريد الإلكتروني" : "Email",
    phone: isArabic ? "رقم الهاتف" : "Phone Number",
    subject: isArabic ? "الموضوع" : "Subject",
    message: isArabic ? "الرسالة" : "Message",
    send: isArabic ? "إرسال الرسالة" : "Send Message",
    sending: isArabic ? "جاري الإرسال..." : "Sending...",
    successTitle,
    successMessage,
    sendAnother: isArabic ? "إرسال رسالة أخرى" : "Send Another Message",
    invalidEmail: isArabic ? "يرجى إدخال بريد إلكتروني صحيح." : "Please enter a valid email address.",
    invalidPhone: isArabic ? "يرجى إدخال رقم هاتف صحيح." : "Please enter a valid phone number.",
    errorMessage: isArabic ? "تعذر إرسال الرسالة. حاول مرة أخرى." : "Could not send your message. Please try again.",
    visitUs: isArabic ? "الموقع" : "Location",
    callUs: isArabic ? "الهاتف" : "Phone",
    emailUs: isArabic ? "البريد" : "Email",
    followUs: isArabic ? "تابعنا" : "Follow us",
    openMap: isArabic ? "فتح الخريطة" : "Open Map",
    mapFrameTitle: isArabic ? "خريطة الموقع" : "Location map",
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    if (!isValidEmail(data.email)) {
      setError(t.invalidEmail);
      return;
    }

    if (data.phone.length > 0 && !isValidPhone(data.phone)) {
      setError(t.invalidPhone);
      return;
    }

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
      <div className="mx-auto flex min-h-[65dvh] w-full max-w-6xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--muted)]">
            <MdCheckCircle className="h-10 w-10 text-[color:var(--primary)]" />
          </div>
          <h2 className="mb-3 text-2xl font-semibold text-[color:var(--text)]">{t.successTitle}</h2>
          <p className="mb-7 text-sm text-[color:var(--text-muted)]">{t.successMessage}</p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="inline-flex rounded-xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
          >
            {t.sendAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-10" dir={isArabic ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-6 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-coral/16 blur-3xl dark:bg-coral/10" />
      </div>

      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">{t.title}</h1>
        {t.subtitle ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">{t.subtitle}</p> : null}
        {t.helper ? <p className="mt-2 text-xs text-[color:var(--text-subtle)] sm:text-sm">{t.helper}</p> : null}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.55fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
              <FiMapPin className="size-4 text-coral" />
              {t.visitUs}
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              {(isArabic ? settings.contactPage.addressAr : settings.contactPage.addressEn).trim()}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-subtle)]">
              {(isArabic ? settings.contactPage.officeHoursAr : settings.contactPage.officeHoursEn).trim()}
            </p>

            {settings.contactPage.mapEmbedUrl.trim() ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--border)]">
                <iframe
                  src={settings.contactPage.mapEmbedUrl}
                  title={t.mapFrameTitle}
                  className="h-44 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}

            {settings.contactPage.mapLink.trim() ? (
              <a
                href={settings.contactPage.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-xs font-semibold text-[color:var(--text)] transition hover:opacity-90"
              >
                {t.openMap}
              </a>
            ) : null}
          </div>

          {phone ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                <FiPhone className="size-4 text-teal" />
                {t.callUs}
              </p>
              {phoneHref ? (
                <a href={phoneHref} className="mt-2 block text-sm font-medium text-[color:var(--primary)] hover:underline">
                  {phone}
                </a>
              ) : (
                <p className="mt-2 text-sm font-medium text-[color:var(--text-muted)]">{phone}</p>
              )}
            </div>
          ) : null}

          {email ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                <FiMail className="size-4 text-teal" />
                {t.emailUs}
              </p>
              {emailHref ? (
                <a href={emailHref} className="mt-2 block text-sm font-medium text-[color:var(--primary)] hover:underline">
                  {email}
                </a>
              ) : (
                <p className="mt-2 text-sm font-medium text-[color:var(--text-muted)]">{email}</p>
              )}

              {(settings.contactPage.whatsappUrl.trim() || settings.contactPage.instagramUrl.trim()) ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-subtle)]">
                    {t.followUs}
                  </p>
                  <div className="flex gap-2">
                    {settings.contactPage.whatsappUrl.trim() ? (
                      <a
                        href={settings.contactPage.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--text-muted)] transition hover:text-[color:var(--text)]"
                        aria-label="WhatsApp"
                      >
                        <FaWhatsapp className="h-5 w-5" />
                      </a>
                    ) : null}
                    {settings.contactPage.instagramUrl.trim() ? (
                      <a
                        href={settings.contactPage.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--text-muted)] transition hover:text-[color:var(--text)]"
                        aria-label="Instagram"
                      >
                        <FaInstagram className="h-5 w-5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[color:var(--text)]">{t.name}</span>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[color:var(--text)]">{t.email}</span>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus)]"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[color:var(--text)]">{t.phone}</span>
                <input
                  type="tel"
                  name="phone"
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[color:var(--text)]">{t.subject}</span>
                <input
                  type="text"
                  name="subject"
                  required
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus)]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[color:var(--text)]">{t.message}</span>
              <textarea
                name="message"
                rows={6}
                required
                className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus)]"
              />
            </label>

            <BookingFormError message={error} />

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3.5 text-base font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                t.sending
              ) : (
                <>
                  <FiSend className="h-5 w-5" />
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
