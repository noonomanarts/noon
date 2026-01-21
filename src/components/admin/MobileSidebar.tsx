"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiGrid,
  FiSettings,
  FiShoppingBag,
  FiThumbsUp,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiFileText,
  FiAward,
  FiCreditCard,
  FiPackage,
} from "react-icons/fi";

const iconMap = {
  FiGrid,
  FiTrendingUp,
  FiBookOpen,
  FiCalendar,
  FiAward,
  FiUsers,
  FiUserCheck,
  FiCreditCard,
  FiThumbsUp,
  FiShoppingBag,
  FiFileText,
  FiSettings,
  FiBell,
  FiPackage,
} as const;

type MenuItem = {
  iconName: keyof typeof iconMap;
  iconColor: string;
  label: string;
  href: string;
};

type MenuSection = {
  section: string;
  items: MenuItem[];
};

type Props = {
  menuItems: MenuSection[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  locale: "en" | "ar";
  translations: {
    adminPanel: string;
    management: string;
    logout: string;
    profile: string;
    accountSettings: string;
  };
  onLogout: () => void;
};

export default function MobileSidebar({
  menuItems,
  user,
  locale,
  translations,
  onLogout,
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
        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
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
        className={`fixed inset-y-0 z-50 w-64 transform border-zinc-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden ${
          locale === "ar" ? "right-0 border-l" : "left-0 border-r"
        } ${isOpen ? "translate-x-0" : locale === "ar" ? "translate-x-full" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo & Close Button */}
          <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800" dir={dir}>
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <span className="text-lg font-bold">N</span>
              </div>
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
              className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Close menu"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <OverlayScrollArea className="flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
            <nav className="p-4" dir={dir}>
              <div className="space-y-6">
                {menuItems.map((section) => (
                  <div key={section.section}>
                    <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {section.section}
                    </h3>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const IconComponent = iconMap[item.iconName];
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                          >
                            <span className={`flex size-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 ${item.iconColor}`}>
                              <IconComponent className="size-4" />
                            </span>
                            <span className="flex-1">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </OverlayScrollArea>

          {/* User Profile Menu */}
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <AdminProfileMenu
              userName={`${user.firstName} ${user.lastName}`}
              userEmail={user.email}
              userInitial={user.firstName.charAt(0)}
              logoutLabel={translations.logout}
              profileLabel={translations.profile}
              settingsLabel={translations.accountSettings}
              onLogout={onLogout}
              locale={locale}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
