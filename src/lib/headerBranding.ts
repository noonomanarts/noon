import {
  defaultGeneralAdminSettings,
  getAdminSettingsByKey,
  type GeneralAdminSettings,
} from "@/lib/db/adminSettings";

export function normalizeHexColor(value: string, fallback: string): string {
  const raw = value.trim().toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(raw)) return fallback;

  if (raw.length === 4) {
    const [r, g, b] = raw.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return raw;
}

export function normalizeImagePath(value: string, fallback: string): string {
  const normalized = value.trim();
  if (!normalized) return fallback;
  if (!normalized.startsWith("/")) return fallback;
  if (normalized.includes("..")) return fallback;
  return normalized;
}

export async function resolveHeaderBranding(): Promise<{ headerColor: string; headerLogoUrl: string }> {
  try {
    const savedGeneral = await getAdminSettingsByKey<Partial<GeneralAdminSettings>>("general");
    const fallbackColor = defaultGeneralAdminSettings.headerColor;
    const fallbackLogo = defaultGeneralAdminSettings.headerLogoUrl;
    return {
      headerColor: normalizeHexColor(savedGeneral?.headerColor ?? fallbackColor, fallbackColor),
      headerLogoUrl: normalizeImagePath(savedGeneral?.headerLogoUrl ?? fallbackLogo, fallbackLogo),
    };
  } catch {
    return {
      headerColor: defaultGeneralAdminSettings.headerColor,
      headerLogoUrl: defaultGeneralAdminSettings.headerLogoUrl,
    };
  }
}

export async function resolveHeaderColor(): Promise<string> {
  const branding = await resolveHeaderBranding();
  return branding.headerColor;
}

export function getReadableTextColor(hex: string): "#ffffff" | "#23150f" {
  const normalized = normalizeHexColor(hex, "#000000");
  const raw = normalized.slice(1);
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#23150f" : "#ffffff";
}
