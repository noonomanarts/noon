import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import ThemeInitScript from "@/components/site/ThemeInitScript";
import LocaleSync from "@/components/site/LocaleSync";
import OverlayScrollbarsProvider from "@/components/site/OverlayScrollbarsProvider";
import PWARegister from "@/components/pwa/PWARegister";
import { AppFeedbackProvider } from "@/components/ui/AppFeedbackProvider";
import appleSplash from "../../public/icons/apple-splash.json";
import "./globals.css";

// Apple splash screens — read from the JSON emitted by
// `scripts/generate-pwa-icons.js` so additions stay in sync automatically.
type AppleSplashEntry = {
  href: string;
  deviceWidth: number;
  deviceHeight: number;
  ratio: number;
  orientation: "portrait" | "landscape";
};
const APPLE_SPLASH_SCREENS = appleSplash as AppleSplashEntry[];

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://noonomanarts.com'),
  title: "Noon - نون",
  description: "Noon Arts & Design Studio",
  applicationName: "Noon",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
    statusBarStyle: "black-translucent",
    title: "Noon",
    startupImage: APPLE_SPLASH_SCREENS.map((s) => ({
      url: s.href,
      media: `(device-width: ${s.deviceWidth}px) and (device-height: ${s.deviceHeight}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: ${s.orientation})`,
    })),
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5b2f6b" },
    { media: "(prefers-color-scheme: dark)", color: "#5b2f6b" },
  ],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
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
      >
        <AppFeedbackProvider>
          <LocaleSync />
          <OverlayScrollbarsProvider />
          <div className="min-h-dvh">{children}</div>
          <PWARegister />
        </AppFeedbackProvider>
      </body>
    </html>
  );
}
