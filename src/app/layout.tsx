import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import ThemeInitScript from "@/components/site/ThemeInitScript";
import LocaleSync from "@/components/site/LocaleSync";
import OverlayScrollbarsProvider from "@/components/site/OverlayScrollbarsProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://noonomanarts.com'),
  title: "Noon - نون",
  description: "Noon Arts & Design Studio",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Noon - نون",
    description: "Noon Arts & Design Studio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Noon",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Noon",
  },
};

const tsSafaa = localFont({
  src: [
    {
      path: "../../public/fonts/TSSafaa/TSSafaa-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/TSSafaa/TSSafaa-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/TSSafaa/TSSafaa-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/TSSafaa/TSSafaa-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ts-safaa",
  display: "block",
  preload: true,
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

// Make layout dynamic so we can access headers
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Try to get locale from middleware header
  const headersList = await headers();
  const localeFromHeader = headersList.get("x-noon-locale");
  const pathHeader = headersList.get("x-noon-pathname") || "";
  
  // If header fails, try to extract from path
  const pathMatch = pathHeader.match(/^\/(ar|en)(?:\/|$)/);
  const locale = localeFromHeader || (pathMatch ? pathMatch[1] : "ar");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${tsSafaa.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
      data-overlayscrollbars-initialize
    >
      <head>
        <ThemeInitScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var path = window.location.pathname;
                var isEnglish = path.startsWith('/en');
                var html = document.documentElement;
                if (isEnglish) {
                  html.setAttribute('lang', 'en');
                  html.setAttribute('dir', 'ltr');
                } else {
                  html.setAttribute('lang', 'ar');
                  html.setAttribute('dir', 'rtl');
                }
              })();
            `
          }}
        />
      </head>
      <body
        data-overlayscrollbars-initialize
        className="bg-[color:var(--background)] text-[color:var(--text)] antialiased transition-colors"
        style={{
          fontFamily: locale === "ar" 
            ? "var(--font-arabic), system-ui, sans-serif"
            : "var(--font-english), system-ui, sans-serif"
        }}
      >
        <LocaleSync />
        <OverlayScrollbarsProvider />
        <div className="min-h-dvh">{children}</div>
      </body>
    </html>
  );
}
