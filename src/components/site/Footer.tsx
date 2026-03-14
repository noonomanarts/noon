import Image from "next/image";
import Link from "next/link";
import { FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { IoLogoFacebook, IoLogoInstagram } from "react-icons/io5";
import type { CSSProperties } from "react";

import type { Locale } from "@/lib/locale";
import { getReadableTextColor, resolveHeaderColor } from "@/lib/headerBranding";
import {
  defaultFooterAdminSettings,
  getAdminSettingsByKey,
  sanitizeFooterAdminSettings,
  type FooterAdminSettings,
  type FooterAdminSocialPlatform,
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

function FooterSocialIcon({ platform }: { platform: FooterAdminSocialPlatform }) {
  return platform === "facebook" ? <IoLogoFacebook className="size-4" /> : <IoLogoInstagram className="size-4" />;
}

export default async function Footer({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const currentYear = new Date().getFullYear();
  const headerColor = await resolveHeaderColor();
  const savedFooter = await getAdminSettingsByKey<Partial<FooterAdminSettings>>("footer").catch(() => null);
  const footer = sanitizeFooterAdminSettings(savedFooter ?? defaultFooterAdminSettings);
  const isLightTone = getReadableTextColor(headerColor) === "#23150f";
  const footerStyle = {
    backgroundColor: headerColor,
    "--footer-text": isLightTone ? "#23150f" : "#ffffff",
    "--footer-muted": isLightTone ? "rgba(35,21,15,0.90)" : "rgba(255,255,255,0.94)",
    "--footer-soft": isLightTone ? "rgba(35,21,15,0.80)" : "rgba(255,255,255,0.86)",
    "--footer-border": isLightTone ? "rgba(35,21,15,0.26)" : "rgba(255,255,255,0.24)",
    "--footer-panel": isLightTone ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.08)",
    "--footer-panel-hover": isLightTone ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.14)",
  } as CSSProperties;

  const t = {
    tagline: isArabic ? footer.taglineAr : footer.taglineEn,
    navigate: isArabic ? footer.navigateTitleAr : footer.navigateTitleEn,
    legal: isArabic ? footer.legalTitleAr : footer.legalTitleEn,
    follow: isArabic ? footer.followTitleAr : footer.followTitleEn,
    location: isArabic ? footer.locationLabelAr : footer.locationLabelEn,
    phone: isArabic ? footer.phoneLabelAr : footer.phoneLabelEn,
    email: isArabic ? footer.emailLabelAr : footer.emailLabelEn,
    rights: isArabic ? footer.rightsAr : footer.rightsEn,
    copyright: `© ${currentYear} ${isArabic ? footer.copyrightNameAr : footer.copyrightNameEn}`,
    blurb: isArabic ? footer.blurbAr : footer.blurbEn,
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
  const bottomLinks = footer.bottomLinks
    .filter((item) => item.enabled)
    .map((item) => ({
      href: resolveFooterHref(locale, item.href),
      label: isArabic ? item.labelAr : item.labelEn,
    }));
  const socialLinks = footer.socialLinks
    .filter((item) => item.enabled)
    .map((item) => ({
      href: normalizeExternalHref(item.href),
      label: isArabic ? item.labelAr : item.labelEn,
      platform: item.platform,
    }));
  const locationValue = footer.locationValue.trim();
  const phoneValue = footer.phoneValue.trim();
  const emailValue = footer.emailValue.trim();
  const phoneHref = resolveTelHref(phoneValue);
  const emailHref = resolveMailHref(emailValue);
  const homeHref = resolveFooterHref(locale, "/");

  return (
    <footer
      className="relative overflow-hidden border-t border-[color:var(--footer-border)] text-[color:var(--footer-text)]"
      style={footerStyle}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div className="space-y-6">
            <Link href={homeHref} className="inline-flex items-center gap-3">
              <Image src="/images/logo-noon.png" alt={footer.brandName} width={52} height={52} className="h-12 w-auto" />
              <div>
                <p className="text-lg font-black tracking-wide">{footer.brandName}</p>
                <p className="text-xs text-[color:var(--footer-soft)]">{footer.brandSubtitle}</p>
              </div>
            </Link>

            <p className="max-w-[32rem] text-sm font-medium leading-6 text-[color:var(--footer-muted)]">
              {t.tagline}
            </p>

            <div className="space-y-3 border border-[color:var(--footer-border)] bg-[color:var(--footer-panel)] p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[color:var(--footer-soft)]">
                  <FiMapPin className="size-4" />
                  {t.location}:
                </p>
                <p className="text-end font-semibold text-[color:var(--footer-text)]">{locationValue || "-"}</p>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[color:var(--footer-soft)]">
                  <FiPhone className="size-4" />
                  {t.phone}:
                </p>
                {phoneHref ? (
                  <a className="text-end font-semibold text-[color:var(--footer-text)] transition hover:opacity-80" href={phoneHref}>
                    {phoneValue}
                  </a>
                ) : (
                  <span className="text-end font-semibold text-[color:var(--footer-text)]">-</span>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[color:var(--footer-soft)]">
                  <FiMail className="size-4" />
                  {t.email}:
                </p>
                {emailHref ? (
                  <a className="text-end font-semibold text-[color:var(--footer-text)] transition hover:opacity-80" href={emailHref}>
                    {emailValue}
                  </a>
                ) : (
                  <span className="text-end font-semibold text-[color:var(--footer-text)]">-</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-[color:var(--footer-text)]">{t.navigate}</h3>
            <ul className="space-y-2.5 text-sm font-medium text-[color:var(--footer-muted)]">
              {navLinks.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  {/^(https?:\/\/|mailto:|tel:|#)/i.test(item.href) ? (
                    <a href={item.href} className="transition hover:text-[color:var(--footer-text)] hover:opacity-100">
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className="transition hover:text-[color:var(--footer-text)] hover:opacity-100">
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-[color:var(--footer-text)]">{t.legal}</h3>
            <ul className="space-y-2.5 text-sm font-medium text-[color:var(--footer-muted)]">
              {legalLinks.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  {/^(https?:\/\/|mailto:|tel:|#)/i.test(item.href) ? (
                    <a href={item.href} className="transition hover:text-[color:var(--footer-text)] hover:opacity-100">
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className="transition hover:text-[color:var(--footer-text)] hover:opacity-100">
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[color:var(--footer-text)]">{t.follow}</h3>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((item) => (
                  <a
                    key={`${item.platform}-${item.href}-${item.label}`}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-[color:var(--footer-border)] bg-[color:var(--footer-panel)] px-3 py-2 text-sm font-medium text-[color:var(--footer-muted)] transition hover:bg-[color:var(--footer-panel-hover)] hover:text-[color:var(--footer-text)]"
                  >
                    <FooterSocialIcon platform={item.platform} />
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="border border-[color:var(--footer-border)] bg-[color:var(--footer-panel)] p-4 text-sm font-medium leading-6 text-[color:var(--footer-muted)]">
              {footer.brandSubtitle}
              <br />
              {t.blurb}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[color:var(--footer-border)] pt-5 text-sm font-medium text-[color:var(--footer-soft)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {t.copyright} {t.rights}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {bottomLinks.map((item) =>
                /^(https?:\/\/|mailto:|tel:|#)/i.test(item.href) ? (
                  <a key={`${item.href}-${item.label}`} href={item.href} className="transition hover:text-[color:var(--footer-text)]">
                    {item.label}
                  </a>
                ) : (
                  <Link key={`${item.href}-${item.label}`} href={item.href} className="transition hover:text-[color:var(--footer-text)]">
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
