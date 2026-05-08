'use client';

import { FaWhatsapp } from 'react-icons/fa6';
import { FiMessageCircle, FiPhoneCall } from 'react-icons/fi';
import { usePathname } from 'next/navigation';

import type { Locale } from '@/lib/locale';
import type { WhatsAppFloatingButtonSettings } from '@/lib/adminSettings';

function normalizeHexColor(value: string, fallback: string): string {
  const input = value.trim().toLowerCase();
  const match = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return fallback;

  if (match[1].length === 3) {
    const [r, g, b] = match[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return input;
}

function sanitizeNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizePhoneForWhatsApp(value: string): string {
  return value.replace(/\D/g, '');
}

function isPublicPath(pathname: string | null): boolean {
  const raw = pathname ?? '';
  const normalized = raw.replace(/^\/(en|ar)(?=\/|$)/, '');
  return !normalized.startsWith('/account');
}

function Icon({
  icon,
  size,
}: {
  icon: WhatsAppFloatingButtonSettings['icon'];
  size: number;
}) {
  if (icon === 'message') return <FiMessageCircle style={{ width: size, height: size }} />;
  if (icon === 'phone') return <FiPhoneCall style={{ width: size, height: size }} />;
  return <FaWhatsapp style={{ width: size, height: size }} />;
}

export default function FloatingWhatsAppButton({
  locale,
  settings,
}: {
  locale: Locale;
  settings: WhatsAppFloatingButtonSettings;
}) {
  const pathname = usePathname();

  if (!settings.enabled) return null;
  if (!isPublicPath(pathname)) return null;

  const showMobile = Boolean(settings.showOnMobile);
  const showDesktop = Boolean(settings.showOnDesktop);
  if (!showMobile && !showDesktop) return null;

  const visibilityClass = showMobile && showDesktop
    ? 'inline-flex'
    : showDesktop
      ? 'hidden sm:inline-flex'
      : 'inline-flex sm:hidden';

  const phone = normalizePhoneForWhatsApp(settings.phoneNumber);
  if (!phone) return null;

  const buttonColor = normalizeHexColor(settings.buttonColor, '#25d366');
  const iconColor = normalizeHexColor(settings.iconColor, '#ffffff');
  const buttonSizePx = sanitizeNumber(settings.buttonSizePx, 40, 48, 46);
  const iconSizePx = sanitizeNumber(settings.iconSizePx, 20, 24, 23);
  const sideOffsetPx = sanitizeNumber(settings.sideOffsetPx, 0, 80, 16);
  const baseBottomOffsetPx = sanitizeNumber(settings.bottomOffsetPx, 0, 120, 20);
  const bottomOffsetPx = Math.min(132, baseBottomOffsetPx + 24);
  const position = locale === 'ar' ? 'left' : 'right';
  const text = settings.presetMessage.trim();
  const href = `https://api.whatsapp.com/send?phone=${phone}${text ? `&text=${encodeURIComponent(text)}` : ''}`;

  const t = {
    label: locale === 'ar' ? 'تواصل واتساب' : 'WhatsApp Chat',
  };

  return (
    <div
      className={`fixed bottom-0 z-40 ${position === 'left' ? 'left-0' : 'right-0'}`}
      style={{
        left: position === 'left' ? sideOffsetPx : undefined,
        right: position === 'right' ? sideOffsetPx : undefined,
        bottom: bottomOffsetPx,
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.label}
        title={t.label}
        className={`${visibilityClass} relative items-center justify-center rounded-none border border-white/35 shadow-[0_14px_28px_-16px_rgba(0,0,0,0.75)] transition hover:-translate-y-0.5 hover:brightness-105`}
        style={{
          width: buttonSizePx,
          height: buttonSizePx,
          backgroundColor: buttonColor,
          color: iconColor,
        }}
      >
        {settings.pulseEffect ? (
          <span
            className="pointer-events-none absolute inset-0 animate-ping rounded-none opacity-25"
            style={{ backgroundColor: buttonColor }}
            aria-hidden="true"
          />
        ) : null}
        <span className="relative z-10">
          <Icon icon={settings.icon} size={iconSizePx} />
        </span>
      </a>
    </div>
  );
}
