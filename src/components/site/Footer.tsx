import Image from "next/image";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { FaTiktok, FaYoutube } from "react-icons/fa6";
import { IoLogoFacebook, IoLogoInstagram } from "react-icons/io5";
import type { CSSProperties } from "react";

import type { Locale } from "@/lib/locale";
import { getReadableTextColor, resolveHeaderColor } from "@/lib/headerBranding";
import {
  defaultFooterAdminSettings,
  getAdminSettingsByKey,
  sanitizeFooterAdminSettings,
  type FooterAdminSettings,
  type FooterAdminSocialIcon,
} from "@/lib/db/adminSettings";

function resolveFooterHref(locale: Locale, href: string): string {
  const normalized = href.trim();
  if (!normalized) return `/${locale}`;
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(normalized)) return normalized;
  if (/^\/(en|ar)(?=\/|$)/.test(normalized)) return normalized;
  if (normalized === "/") return `/${locale}`;
  if (normalized.startsWith("/")) return `/${locale}${normalized}`;
  return `/${locale}/${normalized.replace(/^\/+/, "")}`;
}

function resolveTelHref(phone: string): string {
  const normalized = phone.trim();
  if (!normalized) return "";
  if (/^tel:/i.test(normalized)) return normalized;
  return `tel:${normalized.replace(/\s+/g, "")}`;
}

function resolveMailHref(email: string): string {
  const normalized = email.trim();
  if (!normalized) return "";
  if (/^mailto:/i.test(normalized)) return normalized;
  return `mailto:${normalized}`;
}

function normalizeExternalHref(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "#";
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(normalized)) return normalized;
  return `https://${normalized.replace(/^\/+/, "")}`;
}

function isUrlLike(value: string): boolean {
  return /^(https?:\/\/)/i.test(value.trim());
}

function resolveImagePath(value: string, fallback: string): string {
  const normalized = value.trim();
  if (!normalized) return fallback;
  if (!normalized.startsWith("/")) return fallback;
  if (normalized.includes("..")) return fallback;
  return normalized;
}

function formatCopyrightText(template: string, year: number, brandName: string): string {
  const safeBrandName = brandName.trim() || defaultFooterAdminSettings.brandName;
  const source = template.trim() || defaultFooterAdminSettings.copyrightText;
  return source.replaceAll("{year}", String(year)).replaceAll("{brand}", safeBrandName);
}

function migrateLegacySocialHref(icon: FooterAdminSocialIcon, href: string): string {
  const normalized = href.trim().toLowerCase();
  if (icon === "instagram" && normalized.includes("instagram.com/noonomanarts")) {
    return "https://www.instagram.com/noon.omanarts";
  }
  if (icon === "facebook" && normalized.includes("facebook.com/noonomanarts")) {
    return "https://www.facebook.com/noon.omanarts/";
  }
  return href;
}

function FooterSocialIcon({ icon }: { icon: FooterAdminSocialIcon }) {
  if (icon === "facebook") return <IoLogoFacebook className="size-6" />;
  if (icon === "tiktok") return <FaTiktok className="size-5.5" />;
  if (icon === "youtube") return <FaYoutube className="size-6" />;
  return <IoLogoInstagram className="size-6" />;
}

export default async function Footer({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const currentYear = new Date().getFullYear();
  const headerColor = await resolveHeaderColor();
  const savedFooter = await getAdminSettingsByKey<Partial<FooterAdminSettings>>("footer").catch(() => null);
  const footer = sanitizeFooterAdminSettings(savedFooter ?? defaultFooterAdminSettings);
  const isLightTone = getReadableTextColor(footer.footerColor) === "#23150f";
  const footerStyle = {
    backgroundColor: footer.footerColor,
    "--footer-text": isLightTone ? "#23150f" : "#ffffff",
    "--footer-muted": isLightTone ? "rgba(35,21,15,0.90)" : "rgba(255,255,255,0.94)",
    "--footer-soft": isLightTone ? "rgba(35,21,15,0.80)" : "rgba(255,255,255,0.86)",
    "--footer-border": isLightTone ? "rgba(35,21,15,0.26)" : "rgba(255,255,255,0.24)",
    "--footer-panel": isLightTone ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.08)",
    "--footer-panel-hover": isLightTone ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.14)",
  } as CSSProperties;

  const t = {
    navigate: isArabic ? footer.navigateTitleAr : footer.navigateTitleEn,
    legal:
      isArabic
        ? footer.legalTitleAr
        : (footer.legalTitleEn.trim().toLowerCase() === "legal" ? "Quick links" : footer.legalTitleEn),
    follow: isArabic ? footer.followTitleAr : footer.followTitleEn,
    location: isArabic ? footer.locationLabelAr : footer.locationLabelEn,
    phone: isArabic ? footer.phoneLabelAr : footer.phoneLabelEn,
    email: isArabic ? footer.emailLabelAr : footer.emailLabelEn,
  };

  const navLinks = footer.navLinks
    .filter((item) => item.enabled)
    .map((item) => ({
      href: resolveFooterHref(locale, item.href),
      label: isArabic ? item.labelAr : item.labelEn,
    }));
  const legalLinks = footer.legalLinks
    .filter((item) => item.enabled)
    .map((item) => ({
      href: resolveFooterHref(locale, item.href),
      label: isArabic ? item.labelAr : item.labelEn,
    }));
  const socialLinks = footer.socialLinks
    .filter((item) => item.enabled)
    .map((item) => ({
      href: normalizeExternalHref(migrateLegacySocialHref(item.icon, item.href)),
      label: isArabic ? item.labelAr : item.labelEn,
      icon: item.icon,
    }));
  const locationValueRaw = footer.locationValue.trim();
  const locationValue = locationValueRaw.toLowerCase() === "muscat, oman"
    ? "https://maps.app.goo.gl/9KykbqJSMsxVrkdZA"
    : locationValueRaw;
  const locationHref = isUrlLike(locationValue) ? locationValue : "";
  const locationLinkLabel = isArabic ? "عرض الموقع على الخريطة" : "View on map";
  const phoneValue = footer.phoneValue.trim();
  const emailValue = footer.emailValue.trim();
  const phoneHref = resolveTelHref(phoneValue);
  const emailHref = resolveMailHref(emailValue);
  const homeHref = resolveFooterHref(locale, "/");
  const footerLogoUrl = resolveImagePath(footer.footerLogoUrl, defaultFooterAdminSettings.footerLogoUrl);
  const copyrightLabel = formatCopyrightText(footer.copyrightText, currentYear, footer.brandName);
  const contactItems = [
    locationHref
      ? { href: locationHref, label: locationLinkLabel, icon: FiMapPin, external: true }
      : { href: "", label: locationValue || "-", icon: FiMapPin, external: false },
    phoneHref
      ? { href: phoneHref, label: phoneValue, icon: FiPhone, external: false }
      : { href: "", label: "-", icon: FiPhone, external: false },
    emailHref
      ? { href: emailHref, label: emailValue, icon: FiMail, external: false }
      : { href: "", label: "-", icon: FiMail, external: false },
  ];
  const RowChevron = isArabic ? FiChevronLeft : FiChevronRight;
  const footerTextColor = getReadableTextColor(headerColor);

  return (
    <footer className="w-full bg-[color:var(--background)]">
      <div
        className="w-full overflow-hidden text-[color:var(--footer-text)] shadow-[0_24px_70px_-45px_rgba(0,0,0,0.55)]"
        style={footerStyle}
      >
        <div
          dir="ltr"
          className="site-footer-desktop mx-auto w-full max-w-7xl px-6 py-10 lg:px-10 xl:px-12"
        >
          <div dir={isArabic ? "rtl" : "ltr"} className="space-y-7 self-start text-center md:text-start">
            <div className="space-y-4">
              <h3 className="text-lg font-black text-[color:var(--footer-text)]">{t.follow}</h3>
              <div className="flex justify-center gap-4 md:justify-start">
                {socialLinks.map((item) => (
                  <a
                    key={`${item.icon}-${item.href}-${item.label}`}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="footer-soft-row inline-flex size-12 items-center justify-center border border-[color:var(--footer-border)] text-[color:var(--footer-muted)] transition hover:bg-[color:var(--footer-panel-hover)] hover:text-[color:var(--footer-text)]"
                  >
                    <FooterSocialIcon icon={item.icon} />
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-black text-[color:var(--footer-text)]">{t.legal}</h3>
              <nav className="space-y-4" aria-label={t.legal}>
                {legalLinks.map((item) => (
                  /^(https?:\/\/|mailto:|tel:|#)/i.test(item.href) ? (
                    <a
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className="block text-sm font-black text-[color:var(--footer-muted)] transition hover:text-[color:var(--footer-text)]"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className="block text-sm font-black text-[color:var(--footer-muted)] transition hover:text-[color:var(--footer-text)]"
                    >
                      {item.label}
                    </Link>
                  )
                ))}
              </nav>
            </div>
          </div>

          <div dir={isArabic ? "rtl" : "ltr"} className="space-y-4 self-start text-center md:text-start">
            <h3 className="text-lg font-black text-[color:var(--footer-text)]">{t.navigate}</h3>
            <nav className="space-y-4" aria-label={t.navigate}>
              {navLinks.map((item, index) => {
                const className = [
                  "block text-sm font-black transition hover:text-[color:var(--footer-text)]",
                  index === 0 ? "text-coral" : "text-[color:var(--footer-muted)]",
                ].join(" ");

                return /^(https?:\/\/|mailto:|tel:|#)/i.test(item.href) ? (
                  <a
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={className}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={className}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div dir="ltr" className="footer-soft-panel self-start bg-[color:var(--footer-panel)] p-3">
            <div className="space-y-2">
              {contactItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <span className="min-w-0 flex-1 font-black">{item.label}</span>
                    <span className="whitespace-nowrap font-black text-[color:var(--footer-text)]">
                      {item.icon === FiMapPin ? t.location : item.icon === FiPhone ? t.phone : t.email}
                    </span>
                    <span className="footer-soft-row inline-flex size-10 shrink-0 items-center justify-center border border-[color:var(--footer-border)]">
                      <Icon className="size-5" />
                    </span>
                  </>
                );

                return item.href ? (
                  <a
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="footer-soft-row flex min-h-12 items-center gap-3 bg-[color:var(--footer-panel-hover)] px-3 text-sm font-bold text-[color:var(--footer-muted)] transition hover:text-[color:var(--footer-text)]"
                    dir={item.href === phoneHref ? "ltr" : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <p
                    key={item.label}
                    className="footer-soft-row flex min-h-12 items-center gap-3 bg-[color:var(--footer-panel-hover)] px-3 text-sm font-bold text-[color:var(--footer-muted)]"
                  >
                    {content}
                  </p>
                );
              })}
            </div>
          </div>

          <div className="site-footer-logo flex self-center justify-center md:self-start md:justify-end">
            <Link href={homeHref} className="inline-flex items-center">
              <Image src={footerLogoUrl} alt={footer.brandName} width={176} height={176} className="h-28 w-auto lg:h-32" />
            </Link>
          </div>
        </div>

          <div className="site-footer-mobile mx-auto w-full max-w-[30rem] px-4 py-5">
          <div className="mb-6 flex justify-center">
            <Link href={homeHref} className="inline-flex items-center">
              <Image src={footerLogoUrl} alt={footer.brandName} width={220} height={220} className="h-32 w-auto sm:h-36" />
            </Link>
          </div>

          <nav className="divide-y divide-white/12" aria-label={t.navigate}>
            {[...navLinks, ...legalLinks].map((item) => (
              /^(https?:\/\/|mailto:|tel:|#)/i.test(item.href) ? (
                <a
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className="flex min-h-11 items-center justify-between gap-4 text-sm font-black text-[color:var(--footer-muted)]"
                >
                  <span>{item.label}</span>
                  <RowChevron className="size-4" />
                </a>
              ) : (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className="flex min-h-11 items-center justify-between gap-4 text-sm font-black text-[color:var(--footer-muted)]"
                >
                  <span>{item.label}</span>
                  <RowChevron className="size-4" />
                </Link>
              )
            ))}
          </nav>

          <div className="mt-4 space-y-2">
            {contactItems.map((item) => {
              const Icon = item.icon;
              const className = "footer-soft-row flex min-h-11 items-center gap-3 bg-[color:var(--footer-panel-hover)] px-3 text-sm font-black text-[color:var(--footer-muted)]";
              const content = (
                <>
                  <Icon className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1 text-center">{item.label}</span>
                </>
              );

              return item.href ? (
                <a
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={className}
                  dir={item.href === phoneHref ? "ltr" : undefined}
                >
                  {content}
                </a>
              ) : (
                <p key={item.label} className={className}>
                  {content}
                </p>
              );
            })}
          </div>

          {socialLinks.length > 0 ? (
            <div className="mt-4 flex justify-center gap-6">
              {socialLinks.map((item) => (
                <a
                  key={`${item.icon}-${item.href}-${item.label}`}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  title={item.label}
                  className="text-[color:var(--footer-muted)] transition hover:text-[color:var(--footer-text)]"
                >
                  <FooterSocialIcon icon={item.icon} />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ backgroundColor: headerColor, color: footerTextColor }}>
          <div className="mx-auto flex w-full max-w-7xl flex-col-reverse gap-2 px-6 py-4 text-center text-xs font-black sm:flex-row sm:items-center sm:justify-between sm:text-start lg:px-10 xl:px-12">
            <p>{copyrightLabel}</p>
            <a
              href="https://sbc.om"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:opacity-80"
            >
              Developed by SBC.OM
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
