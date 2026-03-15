import type { Metadata } from "next";

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
    <div className="admin-panel min-h-dvh">
      {children}
    </div>
  );
}
