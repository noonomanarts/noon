"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { FiMenu, FiX } from "react-icons/fi";
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

  const drawer = isOpen
    ? createPortal(
        <>
          <div
            className="fixed inset-0 z-[190] bg-zinc-950/45 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          <aside
            className={`fixed inset-y-0 z-[200] h-dvh w-[min(20rem,calc(100vw-1rem))] transform border-zinc-200 bg-white shadow-2xl transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden ${
              locale === "ar" ? "right-0 border-l" : "left-0 border-r"
            } ${isOpen ? "translate-x-0" : locale === "ar" ? "translate-x-full" : "-translate-x-full"}`}
          >
            <div className="flex h-full min-h-0 flex-col bg-white pt-[env(safe-area-inset-top)] dark:bg-zinc-950">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] dark:border-zinc-800 sm:h-16 sm:px-6" dir={dir}>
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src={translations.logoUrl || "/images/logo-noon.png"}
                    alt="Noon"
                    width={44}
                    height={44}
                    priority
                    className="h-9 w-auto shrink-0"
                  />
                  <div className={locale === "ar" ? "min-w-0 text-right" : "min-w-0 text-left"}>
                    <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                      {translations.adminPanel}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Close menu"
                >
                  <FiX className="size-5" />
                </button>
              </div>

              <OverlayScrollArea className="min-h-0 flex-1 bg-white dark:bg-zinc-950" options={{ overflow: { x: "hidden", y: "scroll" } }}>
                <nav className="p-3 sm:p-4" dir={dir}>
                  <AdminSidebarNav menuItems={menuItems} onNavigate={() => setIsOpen(false)} variant="mobile" />
                </nav>
              </OverlayScrollArea>

              <div className="shrink-0 border-t border-zinc-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950 sm:px-4 sm:pt-4">
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
        </>,
        document.body
      )
    : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-2 text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
        aria-label="Open menu"
      >
        <FiMenu className="size-5" />
      </button>
      {drawer}
    </>
  );
}
