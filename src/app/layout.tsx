import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { headers } from "next/headers";
import ThemeInitScript from "@/components/site/ThemeInitScript";
import LocaleSync from "@/components/site/LocaleSync";
import OverlayScrollbarsProvider from "@/components/site/OverlayScrollbarsProvider";
import "./globals.css";

// Using Inter as a professional geometric sans-serif (similar to Orkney)
// Replace with Orkney local font files when available
const inter = Inter({
  variable: "--font-english",
  subsets: ["latin"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

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
  const locale = localeFromHeader || (pathMatch ? pathMatch[1] : "en");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className="scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <ThemeInitScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var path = window.location.pathname;
                var isArabic = path.startsWith('/ar');
                var html = document.documentElement;
                if (isArabic) {
                  html.setAttribute('lang', 'ar');
                  html.setAttribute('dir', 'rtl');
                } else {
                  html.setAttribute('lang', 'en');
                  html.setAttribute('dir', 'ltr');
                }
              })();
            `
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${cairo.variable} bg-white text-zinc-900 antialiased transition-colors dark:bg-zinc-950 dark:text-zinc-100`}
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

