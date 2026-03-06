import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getUserById } from "@/lib/db/users";
import { getAdminSettingsByPrefix } from "@/lib/db/adminSettings";
import {
  makeSitePageSettingsKey,
  sanitizeSitePageSettings,
  sitePageCatalog,
  type SitePageGroup,
  type SitePageSettings,
} from "@/lib/admin/sitePages";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== "ADMIN") return null;

  return user;
}

const allowedGroups = new Set<SitePageGroup>(["core", "classes", "events", "commerce", "account"]);

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const group = request.nextUrl.searchParams.get("group")?.trim() ?? "";

    if (group && !allowedGroups.has(group as SitePageGroup)) {
      return NextResponse.json({ error: "Invalid page group" }, { status: 400 });
    }

    const savedSettingsMap =
      await getAdminSettingsByPrefix<Partial<SitePageSettings>>("page:");

    const pages = sitePageCatalog
      .map((page) => {
        const settingsKey = makeSitePageSettingsKey(page.key);
        const hasCustomSettings = Object.prototype.hasOwnProperty.call(savedSettingsMap, settingsKey);
        const settings = sanitizeSitePageSettings(page, savedSettingsMap[settingsKey]);

        return {
          key: page.key,
          pathTemplate: page.pathTemplate,
          group: page.group,
          nameEn: page.nameEn,
          nameAr: page.nameAr,
          descriptionEn: page.descriptionEn,
          descriptionAr: page.descriptionAr,
          hasCustomSettings,
          visibility: settings.visibility,
          navPlacement: settings.navPlacement,
          footerVisible: settings.footerVisible,
          indexable: settings.indexable,
        };
      })
      .filter((page) => {
        if (group && page.group !== group) return false;
        if (!search) return true;

        const haystack = [
          page.key,
          page.pathTemplate,
          page.group,
          page.nameEn,
          page.nameAr,
          page.descriptionEn,
          page.descriptionAr,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });

    return NextResponse.json({
      pages,
      total: pages.length,
    });
  } catch (error) {
    console.error("Failed to load site pages catalog:", error);
    return NextResponse.json({ error: "Failed to load site pages" }, { status: 500 });
  }
}
