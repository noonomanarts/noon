import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { headers } from "next/headers";
import ThemeInitScript from "@/components/site/ThemeInitScript";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const localeHeader = h.get("x-noon-locale");
  const locale = localeHeader === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body
        className={`${inter.variable} ${cairo.variable} antialiased`}
        style={{
          fontFamily: locale === "ar" 
            ? "var(--font-arabic), system-ui, sans-serif"
            : "var(--font-english), system-ui, sans-serif"
        }}
      >
        <div className="min-h-dvh">{children}</div>
      </body>
    </html>
  );
}

