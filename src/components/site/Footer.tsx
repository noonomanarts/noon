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

function isUrlLike(value: string): boolean {
  return /^(https?:\/\/)/i.test(value.trim());
}

function migrateLegacySocialHref(platform: FooterAdminSocialPlatform, href: string): string {
  const normalized = href.trim().toLowerCase();
  if (platform === "instagram" && normalized.includes("instagram.com/noonomanarts")) {
    return "https://www.instagram.com/noon.omanarts";
  }
  if (platform === "facebook" && normalized.includes("facebook.com/noonomanarts")) {
    return "https://www.facebook.com/noon.omanarts/";
  }
  return href;
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
    legal:
      isArabic
        ? footer.legalTitleAr
        : (footer.legalTitleEn.trim().toLowerCase() === "legal" ? "Quick links" : footer.legalTitleEn),
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
      href: normalizeExternalHref(migrateLegacySocialHref(item.platform, item.href)),
      label: isArabic ? item.labelAr : item.labelEn,
      platform: item.platform,
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
  const contactRowClass = isArabic
    ? "grid w-full grid-cols-[minmax(0,1fr)_max-content] items-center gap-3"
    : "grid w-fit min-w-[19rem] grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 text-left";
  const contactLabelClass = `inline-flex items-center gap-2 whitespace-nowrap text-[color:var(--footer-soft)] ${
    isArabic ? "col-start-2 justify-self-end" : ""
  }`;
  const contactValueClass = `font-semibold text-[color:var(--footer-text)] ${
    isArabic ? "col-start-1 justify-self-start text-left" : "text-left"
  }`;

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

            <div
              className={`border border-[color:var(--footer-border)] bg-[color:var(--footer-panel)] p-4 text-sm ${
                isArabic ? "space-y-3" : "flex flex-col items-end gap-3"
              }`}
            >
              <div className={contactRowClass}>
                <p className={contactLabelClass}>
                  <FiMapPin className="size-4" />
                  {t.location}:
                </p>
                {locationHref ? (
                  <a
                    className={`${contactValueClass} transition hover:opacity-80`}
                    href={locationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={locationHref}
                  >
                    {locationLinkLabel}
                  </a>
                ) : (
                  <p className={contactValueClass}>
                    {locationValue || "-"}
                  </p>
                )}
              </div>
              <div className={contactRowClass}>
                <p className={contactLabelClass}>
                  <FiPhone className="size-4" />
                  {t.phone}:
                </p>
                {phoneHref ? (
                  <a
                    className={`${contactValueClass} min-w-[10rem] transition hover:opacity-80`}
                    href={phoneHref}
                    dir="ltr"
                  >
                    {phoneValue}
                  </a>
                ) : (
                  <span className={`${contactValueClass} min-w-[10rem]`} dir="ltr">
                    -
                  </span>
                )}
              </div>
              <div className={contactRowClass}>
                <p className={contactLabelClass}>
                  <FiMail className="size-4" />
                  {t.email}:
                </p>
                {emailHref ? (
                  <a
                    className={`${contactValueClass} break-all transition hover:opacity-80`}
                    href={emailHref}
                  >
                    {emailValue}
                  </a>
                ) : (
                  <span className={contactValueClass}>-</span>
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
