import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import ThemeInitScript from "@/components/site/ThemeInitScript";
import "@/app/globals.css";

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
  title: "Admin Panel - Noon",
  description: "Noon Management Panel",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className={`${inter.variable} ${cairo.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
