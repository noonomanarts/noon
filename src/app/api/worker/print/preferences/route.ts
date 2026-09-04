import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserPreferenceByKey, upsertUserPreference } from "@/lib/db/userPreferences";
import { getUserById } from "@/lib/db/users";
import { getWorkerPermissions } from "@/lib/db/worker";

const PREF_KEY = "worker.print.labels.v1";

type LabelSettings = {
  widthMm: number;
  heightMm: number;
  paddingMm: number;
  gapMm: number;
  fontScale: number;
  fontFamily: "auto" | "arial" | "tahoma" | "naskh" | "mono";
  titleScale: number;
  metaScale: number;
  priceScale: number;
  printProfile: "balanced" | "highContrast" | "thermal";
  pageMode: "single" | "sheet";
  showDates: boolean;
  showSku: boolean;
  showPrice: boolean;
  showSecondaryLanguage: boolean;
};

type LabelPreset = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  isCustom?: boolean;
};

type WorkerPrintPreferences = {
  settings: LabelSettings;
  customPresets: LabelPreset[];
};

const DEFAULT_SETTINGS: LabelSettings = {
  widthMm: 58,
  heightMm: 38,
  paddingMm: 2.5,
  gapMm: 0,
  fontScale: 112,
  fontFamily: "auto",
  titleScale: 135,
  metaScale: 120,
  priceScale: 150,
  printProfile: "highContrast",
  pageMode: "single",
  showDates: true,
  showSku: true,
  showPrice: true,
  showSecondaryLanguage: true,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeSettings(input: unknown): LabelSettings {
  const value = (input && typeof input === "object" ? input : {}) as Partial<LabelSettings>;
  return {
    widthMm: clamp(Number(value.widthMm ?? DEFAULT_SETTINGS.widthMm), 20, 120),
    heightMm: clamp(Number(value.heightMm ?? DEFAULT_SETTINGS.heightMm), 20, 120),
    paddingMm: clamp(Number(value.paddingMm ?? DEFAULT_SETTINGS.paddingMm), 0, 8),
    gapMm: clamp(Number(value.gapMm ?? DEFAULT_SETTINGS.gapMm), 0, 10),
    fontScale: clamp(Number(value.fontScale ?? DEFAULT_SETTINGS.fontScale), 80, 150),
    fontFamily:
      value.fontFamily === "arial" ||
      value.fontFamily === "tahoma" ||
      value.fontFamily === "naskh" ||
      value.fontFamily === "mono"
        ? value.fontFamily
        : "auto",
    titleScale: clamp(Number(value.titleScale ?? DEFAULT_SETTINGS.titleScale), 100, 220),
    metaScale: clamp(Number(value.metaScale ?? DEFAULT_SETTINGS.metaScale), 90, 180),
    priceScale: clamp(Number(value.priceScale ?? DEFAULT_SETTINGS.priceScale), 100, 220),
    printProfile:
      value.printProfile === "balanced" || value.printProfile === "thermal"
        ? value.printProfile
        : "highContrast",
    pageMode: value.pageMode === "sheet" ? "sheet" : "single",
    showDates: value.showDates ?? DEFAULT_SETTINGS.showDates,
    showSku: value.showSku ?? DEFAULT_SETTINGS.showSku,
    showPrice: value.showPrice ?? DEFAULT_SETTINGS.showPrice,
    showSecondaryLanguage: value.showSecondaryLanguage ?? DEFAULT_SETTINGS.showSecondaryLanguage,
  };
}

function sanitizePresets(input: unknown): LabelPreset[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item) => item && typeof item === "object")
    .slice(0, 30)
    .map((item) => {
      const value = item as Partial<LabelPreset>;
      const name = typeof value.name === "string" ? value.name.trim().slice(0, 40) : "";
      if (!name) return null;

      const id = typeof value.id === "string" && value.id.trim() ? value.id.trim().slice(0, 80) : crypto.randomUUID();

      return {
        id,
        name,
        widthMm: clamp(Number(value.widthMm), 20, 120),
        heightMm: clamp(Number(value.heightMm), 20, 120),
        isCustom: true,
      } as LabelPreset;
    })
    .filter((value): value is LabelPreset => Boolean(value));
}

function sanitizePreferences(input: unknown): WorkerPrintPreferences {
  const value = (input && typeof input === "object" ? input : {}) as {
    settings?: unknown;
    customPresets?: unknown;
  };

  return {
    settings: sanitizeSettings(value.settings),
    customPresets: sanitizePresets(value.customPresets),
  };
}

async function requireAuthorizedWorker() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || (user.role !== "WORKER" && user.role !== "ADMIN")) return null;

  const permissions = user.role === "ADMIN" ? { can_print_labels: true } : await getWorkerPermissions(user.id);
  if (!permissions?.can_print_labels) return null;

  return user;
}

export async function GET() {
  try {
    const user = await requireAuthorizedWorker();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stored = await getUserPreferenceByKey<WorkerPrintPreferences>(user.id, PREF_KEY);
    if (!stored) {
      return NextResponse.json({
        settings: DEFAULT_SETTINGS,
        customPresets: [],
      });
    }

    const sanitized = sanitizePreferences(stored);
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Failed to load worker print preferences:", error);
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuthorizedWorker();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as unknown;
    const nextPreferences = sanitizePreferences(body);

    await upsertUserPreference({
      userId: user.id,
      key: PREF_KEY,
      value: nextPreferences,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save worker print preferences:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
