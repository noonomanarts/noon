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
    <div className={isMobile ? "space-y-6" : "space-y-5"}>
      {menuItems.map((section) => (
        <div key={section.section}>
          <h3
            className={isMobile
              ? "mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              : "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500/90 dark:text-zinc-400"}
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
                      ? "group flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm dark:bg-orange-500/10 dark:text-white"
                      : "group flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-[13px] font-semibold text-zinc-950 shadow-sm shadow-orange-100/80 dark:bg-white/[0.06] dark:text-white"
                    : isMobile
                      ? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                      : "group flex items-center gap-3 rounded-2xl px-3 py-2 text-[13px] font-medium text-zinc-700 transition-all duration-200 hover:bg-white/80 hover:text-zinc-950 hover:shadow-sm dark:text-zinc-300 dark:hover:bg-white/[0.04] dark:hover:text-white"}
                >
                  <span className={active
                    ? `flex size-9 items-center justify-center rounded-xl bg-[color:var(--noon-coral)] text-white shadow-sm ${isMobile ? "" : "ring-0"}`
                    : isMobile
                      ? `flex size-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 ${item.iconColor}`
                      : `flex size-9 items-center justify-center rounded-xl bg-white/80 ring-1 ring-zinc-200/70 transition-transform duration-200 group-hover:scale-[1.04] dark:bg-zinc-900/90 dark:ring-zinc-800 ${item.iconColor}`}
                  >
                    <IconComponent className="size-4" />
                  </span>
                  <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
                  {typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
                    <span className={active
                      ? "inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-950 px-1.5 text-[11px] font-bold leading-none text-white dark:bg-white dark:text-zinc-950"
                      : "inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--noon-coral)] px-1.5 text-[11px] font-bold leading-none text-white shadow-sm shadow-orange-300/50 dark:shadow-orange-950/40"}
                    >
                      {item.badgeCount > 99 ? "99+" : item.badgeCount}
                    </span>
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