import { NextResponse, type NextRequest } from "next/server";

const LOCALES = new Set(["en", "ar"]);

function getLocaleFromPath(pathname: string): "en" | "ar" | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && LOCALES.has(seg)) return seg as "en" | "ar";
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If already locale-scoped, continue but attach helpful headers.
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-noon-locale", locale);
    requestHeaders.set("x-noon-pathname", pathname);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Otherwise redirect to default locale.
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Ignore Next internals and static files
    "/((?!_next|api|.*\\..*).*)",
  ],
};
