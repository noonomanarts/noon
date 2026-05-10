"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import AdminSidebarNav, { type AdminSidebarMenuSection } from "@/components/admin/AdminSidebarNav";

type Props = {
  menuItems: AdminSidebarMenuSection[];
  user: {
    fullName: string;
    email: string;
    profileImage?: string;
  };
  locale: "en" | "ar";
  translations: {
    adminPanel: string;
    management: string;
    logout: string;
    profile: string;
    accountSettings: string;
    logoUrl?: string;
  };
  onLogoutAction: () => void;
};

export default function MobileSidebar({
  menuItems,
  user,
  locale,
  translations,
  onLogoutAction,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
        aria-label="Open menu"
      >
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 z-50 w-[min(20rem,calc(100vw-1.25rem))] transform border-zinc-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden ${
          locale === "ar" ? "right-0 border-l" : "left-0 border-r"
        } ${isOpen ? "translate-x-0" : locale === "ar" ? "translate-x-full" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Logo & Close Button */}
          <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] dark:border-zinc-800 sm:h-16 sm:px-6" dir={dir}>
            <div className="flex items-center gap-3">
              <Image
                src={translations.logoUrl || "/images/logo-noon.png"}
                alt="Noon"
                width={44}
                height={44}
                priority
                className="h-9 w-auto shrink-0"
              />
              <div className={locale === "ar" ? "text-right" : "text-left"}>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {translations.adminPanel}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {translations.management}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-1.5 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Close menu"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <OverlayScrollArea className="flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
            <nav className="p-3 sm:p-4" dir={dir}>
              <AdminSidebarNav menuItems={menuItems} onNavigate={() => setIsOpen(false)} variant="mobile" />
            </nav>
          </OverlayScrollArea>

          {/* User Profile Menu */}
          <div className="border-t border-zinc-200 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 sm:px-4 sm:pt-4">
            <AdminProfileMenu
              userName={user.fullName}
              userEmail={user.email}
              userInitial={user.fullName.charAt(0)}
              profileImage={user.profileImage}
              logoutLabel={translations.logout}
              profileLabel={translations.profile}
              settingsLabel={translations.accountSettings}
              onLogout={onLogoutAction}
              locale={locale}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
