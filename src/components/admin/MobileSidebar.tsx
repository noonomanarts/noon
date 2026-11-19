"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
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
  storageKey?: string;
};

const subscribeNever = () => () => {};

export default function MobileSidebar({
  menuItems,
  user,
  locale,
  translations,
  onLogoutAction,
  storageKey = "noon_nav",
}: Props) {
  const pathname = usePathname();
  // The drawer remembers which route it was opened on, so navigating (including
  // browser back) closes it without an effect.
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null);
  const isOpen = openedOnPath !== null && openedOnPath === pathname;
  const setIsOpen = (next: boolean) => setOpenedOnPath(next ? pathname : null);
  // True only in the browser, so the portal is skipped during server render.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    const trigger = triggerRef.current;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      // Hand focus back to the button that opened the drawer.
      trigger?.focus();
    };
  }, [isOpen]);

  const navigationId = "dashboard-mobile-navigation";
  const closeMenuLabel = isArabic ? "إغلاق القائمة" : "Close menu";
  const openMenuLabel = isArabic ? "فتح القائمة" : "Open menu";
  const offscreen = isArabic ? "100%" : "-100%";

  const drawer = mounted
    ? createPortal(
        <AnimatePresence>
          {isOpen ? (
            <div className="admin-panel lg:hidden" key="drawer">
              <motion.div
                className="fixed inset-0 z-[190] bg-zinc-950/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />

              <motion.aside
                id={navigationId}
                role="dialog"
                aria-modal="true"
                aria-label={translations.adminPanel}
                dir={dir}
                initial={{ x: offscreen }}
                animate={{ x: 0 }}
                exit={{ x: offscreen }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
                className="fixed inset-y-0 start-0 z-[200] flex h-dvh w-[min(20rem,calc(100vw-2.5rem))] flex-col border-e border-zinc-200 bg-white pt-[env(safe-area-inset-top)] shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <Image
                      src={translations.logoUrl || "/images/logo-noon.png"}
                      alt=""
                      width={44}
                      height={44}
                      priority
                      className="h-9 w-auto shrink-0"
                    />
                    <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                      {translations.adminPanel}
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-600 outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:text-zinc-400 dark:hover:bg-zinc-800"
                    aria-label={closeMenuLabel}
                  >
                    <FiX className="size-5" />
                  </button>
                </div>

                <OverlayScrollArea className="min-h-0 flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
                  <nav className="p-3" aria-label={translations.adminPanel}>
                    <AdminSidebarNav
                      menuItems={menuItems}
                      onNavigate={() => setIsOpen(false)}
                      variant="mobile"
                      locale={locale}
                      storageKey={`${storageKey}_sections`}
                    />
                  </nav>
                </OverlayScrollArea>

                <div className="shrink-0 border-t border-zinc-200 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800">
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
              </motion.aside>
            </div>
          ) : null}
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-700 outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
        aria-label={openMenuLabel}
        aria-expanded={isOpen}
        aria-controls={navigationId}
      >
        <FiMenu className="size-5" />
      </button>
      {drawer}
    </>
  );
}
