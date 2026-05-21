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

  // Find the single most-specific matching item so only one item is ever active
  const allItems = menuItems.flatMap((s) => s.items);
  const activeHref = allItems
    .filter(
      (item) =>
        pathname === item.href ||
        (!item.href.endsWith("/admin") && pathname.startsWith(`${item.href}/`))
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <div className={isMobile ? "space-y-5" : "space-y-4"}>
      {menuItems.map((section) => (
        <div key={section.section}>
          <h3
            className="mb-1.5 px-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"
          >
            {section.section}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const IconComponent = iconMap[item.iconName];
              const active = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={active
                    ? isMobile
                      ? "group flex items-center gap-3 rounded-lg bg-[color:var(--noon-teal-soft)] px-3 py-2.5 text-sm font-semibold text-[color:var(--noon-teal-strong)] dark:bg-[color:var(--noon-teal)]/15 dark:text-[color:var(--noon-teal)]"
                      : "group flex items-center gap-3 rounded-lg bg-[color:var(--noon-teal-soft)] px-3 py-2.5 text-[13px] font-semibold text-[color:var(--noon-teal-strong)] dark:bg-[color:var(--noon-teal)]/15 dark:text-[color:var(--noon-teal)]"
                    : isMobile
                      ? "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      : "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"}
                >
                  <span className={active
                    ? `flex size-8 items-center justify-center rounded-md bg-[color:var(--noon-teal)] text-white`
                    : isMobile
                      ? `flex size-8 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 ${item.iconColor}`
                      : `flex size-8 items-center justify-center rounded-md bg-white ring-1 ring-zinc-200/80 dark:bg-zinc-950 dark:ring-zinc-800 ${item.iconColor}`}
                  >
                    <IconComponent className="size-4" />
                  </span>
                  <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
                  {typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
                    <span className={`size-2 rounded-full ${active ? "bg-[color:var(--noon-teal-strong)]" : "bg-[color:var(--noon-coral)]"}`} aria-label={`${item.badgeCount}`} />
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
