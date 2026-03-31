import Image from "next/image";
import Link from "next/link";
import { FiMail, FiMapPin, FiPhone } from "react-icons/fi";
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

  return (
    <footer
      className="relative overflow-hidden text-[color:var(--footer-text)]"
      style={footerStyle}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.9fr_1.1fr]">
          <div className="space-y-4">
            <Link href={homeHref} className="inline-flex items-center">
              <Image src={footerLogoUrl} alt={footer.brandName} width={88} height={88} className="h-16 w-auto" />
            </Link>

            <div
              dir={isArabic ? "rtl" : "ltr"}
              className="max-w-[25rem] space-y-2 rounded-2xl bg-[linear-gradient(135deg,var(--footer-panel),transparent)] p-3"
            >
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--footer-panel)]/80 px-2.5 py-2">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.09em] text-[color:var(--footer-soft)]">
                  <FiMapPin className="size-4" />
                  {t.location}
                </p>
                {locationHref ? (
                  <a
                    className="rounded-lg bg-[color:var(--footer-panel-hover)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--footer-text)] transition hover:opacity-80"
                    href={locationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={locationHref}
                  >
                    {locationLinkLabel}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-[color:var(--footer-text)]">{locationValue || "-"}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--footer-panel)]/80 px-2.5 py-2">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.09em] text-[color:var(--footer-soft)]">
                  <FiPhone className="size-4" />
                  {t.phone}
                </p>
                {phoneHref ? (
                  <a
                    className="rounded-lg bg-[color:var(--footer-panel-hover)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--footer-text)] transition hover:opacity-80"
                    href={phoneHref}
                    dir="ltr"
                  >
                    {phoneValue}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-[color:var(--footer-text)]" dir="ltr">-</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--footer-panel)]/80 px-2.5 py-2">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.09em] text-[color:var(--footer-soft)]">
                  <FiMail className="size-4" />
                  {t.email}
                </p>
                {emailHref ? (
                  <a
                    className="rounded-lg bg-[color:var(--footer-panel-hover)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--footer-text)] transition hover:opacity-80"
                    href={emailHref}
                  >
                    {emailValue}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-[color:var(--footer-text)]">-</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[color:var(--footer-text)]">{t.navigate}</h3>
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
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[color:var(--footer-text)]">{t.follow}</h3>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((item) => (
                  <a
                    key={`${item.icon}-${item.href}-${item.label}`}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--footer-border)] bg-[color:var(--footer-panel)] text-[color:var(--footer-muted)] transition hover:-translate-y-0.5 hover:bg-[color:var(--footer-panel-hover)] hover:text-[color:var(--footer-text)]"
                  >
                    <FooterSocialIcon icon={item.icon} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[color:var(--footer-text)]">{t.legal}</h3>
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
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: headerColor, color: getReadableTextColor(headerColor) }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between">
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
    </footer>
  );
}
