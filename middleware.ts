import { NextResponse, type NextRequest } from "next/server";

const LOCALES = new Set(["en", "ar"]);
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

function getLocaleFromPath(pathname: string): "en" | "ar" | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && LOCALES.has(seg)) return seg as "en" | "ar";
  return null;
}

function getDefaultLocale(): "en" | "ar" {
  const defaultFromEnv = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  return defaultFromEnv === "ar" ? "ar" : "en";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If already locale-scoped, continue but attach helpful headers and save cookie
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-noon-locale", locale);
    requestHeaders.set("x-noon-pathname", pathname);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Save the locale in a cookie for future visits
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return response;
  }

  // Check for saved locale preference
  const savedLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const preferredLocale = 
    savedLocale && LOCALES.has(savedLocale) 
      ? savedLocale 
      : getDefaultLocale();

  // Redirect to preferred locale
  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Ignore Next internals and static files
    "/((?!_next|api|.*\\..*).*)",
  ],
};
