import { redirect } from "next/navigation";

type LoginSearchParams = Record<string, string | string[] | undefined>;

// Keep old /login links working, but render the form only inside [locale].
export default async function LegacyLoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "";
  const locale = nextPath.startsWith("/en/") ? "en" : "ar";
  const query = new URLSearchParams();

  for (const key of ["next", "method", "error", "logout"] as const) {
    const value = params[key];
    if (typeof value === "string") query.set(key, value);
  }

  const suffix = query.toString();
  redirect(`/${locale}/login${suffix ? `?${suffix}` : ""}`);
}
