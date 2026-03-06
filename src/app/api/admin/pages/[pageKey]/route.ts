import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getUserById } from "@/lib/db/users";
import { getAdminSettingsByKey, upsertAdminSettings } from "@/lib/db/adminSettings";
import {
  getSitePageByKey,
  makeSitePageSettingsKey,
  sanitizeSitePageSettings,
  type SitePageSettings,
} from "@/lib/admin/sitePages";

type Params = {
  params: Promise<{ pageKey: string }>;
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== "ADMIN") return null;

  return user;
}

export async function GET(request: Request, props: Params) {
  void request;
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageKey } = await props.params;
    const page = getSitePageByKey(pageKey);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const settingsKey = makeSitePageSettingsKey(page.key);
    const saved = await getAdminSettingsByKey<Partial<SitePageSettings>>(settingsKey);
    const settings = sanitizeSitePageSettings(page, saved);

    return NextResponse.json({ page, settings });
  } catch (error) {
    console.error("Failed to load page settings:", error);
    return NextResponse.json({ error: "Failed to load page settings" }, { status: 500 });
  }
}

export async function PUT(request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageKey } = await props.params;
    const page = getSitePageByKey(pageKey);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { settings?: Partial<SitePageSettings> }
      | Partial<SitePageSettings>
      | null;

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const partialSettings =
      "settings" in payload && payload.settings && typeof payload.settings === "object"
        ? payload.settings
        : payload;

    const settingsKey = makeSitePageSettingsKey(page.key);
    const current = await getAdminSettingsByKey<Partial<SitePageSettings>>(settingsKey);
    const merged = {
      ...(current ?? {}),
      ...(partialSettings as Partial<SitePageSettings>),
    };
    const settings = sanitizeSitePageSettings(page, merged);

    await upsertAdminSettings({
      key: settingsKey,
      value: settings,
      updatedByUserId: admin.id,
    });

    return NextResponse.json({ success: true, page, settings });
  } catch (error) {
    console.error("Failed to update page settings:", error);
    return NextResponse.json({ error: "Failed to update page settings" }, { status: 500 });
  }
}
