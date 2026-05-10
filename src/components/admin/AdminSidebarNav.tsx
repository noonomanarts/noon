"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiAward,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiMail,
  FiMessageSquare,
  FiPackage,
  FiRefreshCw,
  FiSettings,
  FiShoppingBag,
  FiShoppingCart,
  FiTag,
  FiThumbsUp,
  FiTrendingUp,
  FiTruck,
  FiUserCheck,
  FiUsers,
  FiPrinter,
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
  FiMessageSquare,
  FiMail,
  FiTag,
  FiRefreshCw,
  FiShoppingCart,
  FiTruck,
  FiPrinter,
} as const;

export type AdminSidebarIconName = keyof typeof iconMap;

export type AdminSidebarMenuItem = {
  iconName: AdminSidebarIconName;
  iconColor: string;
  label: string;
  href: string;
  badgeCount?: number;
};

export type AdminSidebarMenuSection = {
  section: string;
  items: AdminSidebarMenuItem[];
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href.endsWith("/admin")) return false;
  return pathname.startsWith(`${href}/`);
}

export default function AdminSidebarNav({
  menuItems,
  onNavigate,
  variant = "desktop",
}: {
  menuItems: AdminSidebarMenuSection[];
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  return (
    <div className={isMobile ? "space-y-5" : "space-y-4"}>
      {menuItems.map((section) => (
        <div key={section.section}>
          <h3
            className={isMobile
              ? "mb-1.5 px-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"
              : "mb-1.5 px-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"}
          >
            {section.section}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const IconComponent = iconMap[item.iconName];
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={active
                    ? isMobile
                      ? "group flex items-center gap-3 rounded-lg bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-white shadow-sm dark:bg-white dark:text-zinc-950"
                      : "group flex items-center gap-3 rounded-lg bg-zinc-950 px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm dark:bg-white dark:text-zinc-950"
                    : isMobile
                      ? "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                      : "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"}
                >
                  <span className={active
                    ? `flex size-8 items-center justify-center rounded-md bg-white/15 text-white dark:bg-zinc-950/10 dark:text-zinc-950`
                    : isMobile
                      ? `flex size-8 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 ${item.iconColor}`
                      : `flex size-8 items-center justify-center rounded-md bg-white ring-1 ring-zinc-200/80 dark:bg-zinc-950 dark:ring-zinc-800 ${item.iconColor}`}
                  >
                    <IconComponent className="size-4" />
                  </span>
                  <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
                  {typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
                    <span className={`size-2 rounded-full ${active ? "bg-white dark:bg-zinc-950" : "bg-[color:var(--noon-coral)]"}`} aria-label={`${item.badgeCount}`} />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
