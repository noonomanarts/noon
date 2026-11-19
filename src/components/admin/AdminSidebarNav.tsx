"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheckSquare,
  FiChevronDown,
  FiClipboard,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiFileText,
  FiGift,
  FiGrid,
  FiInbox,
  FiLayers,
  FiLayout,
  FiLink,
  FiMail,
  FiMessageCircle,
  FiMessageSquare,
  FiPackage,
  FiPocket,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShoppingBag,
  FiShoppingCart,
  FiSmartphone,
  FiTag,
  FiThumbsUp,
  FiTrendingUp,
  FiTruck,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";

const iconMap = {
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheckSquare,
  FiClipboard,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiFileText,
  FiGift,
  FiGrid,
  FiInbox,
  FiLayers,
  FiLayout,
  FiLink,
  FiMail,
  FiMessageCircle,
  FiMessageSquare,
  FiPackage,
  FiPocket,
  FiPrinter,
  FiRefreshCw,
  FiSettings,
  FiShoppingBag,
  FiShoppingCart,
  FiSmartphone,
  FiTag,
  FiThumbsUp,
  FiTrendingUp,
  FiTruck,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} as const;

export type AdminSidebarIconName = keyof typeof iconMap;

export type AdminSidebarMenuItem = {
  iconName: AdminSidebarIconName;
  /** Kept for backwards compatibility; the navigation now uses one neutral icon colour. */
  iconColor?: string;
  label: string;
  href: string;
  badgeCount?: number;
};

export type AdminSidebarMenuSection = {
  section: string;
  items: AdminSidebarMenuItem[];
};

type Props = {
  menuItems: AdminSidebarMenuSection[];
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
  /** Icon-only rail (desktop). */
  collapsed?: boolean;
  locale?: "en" | "ar";
  /** Namespaces the remembered open/closed state of the sections. */
  storageKey?: string;
};

const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

function readClosedSections(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function formatBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** The href that should be highlighted for a pathname: the most specific match. */
function resolveActiveHref(items: AdminSidebarMenuItem[], pathname: string): string | null {
  if (items.length === 0) return null;
  // The panel's root ("/en/admin") is a prefix of every other page, so it only
  // ever matches exactly.
  const rootHref = items.reduce(
    (shortest, item) => (item.href.length < shortest.length ? item.href : shortest),
    items[0].href
  );

  return (
    items
      .filter((item) => pathname === item.href || (item.href !== rootHref && pathname.startsWith(`${item.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
  );
}

export default function AdminSidebarNav({
  menuItems,
  onNavigate,
  variant = "desktop",
  collapsed = false,
  locale = "en",
  storageKey = "noon_nav_sections",
}: Props) {
  const pathname = usePathname();
  const isArabic = locale === "ar";
  const isMobile = variant === "mobile";
  const isRail = collapsed && !isMobile;
  const layoutScope = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<{ label: string; top: number; x: number } | null>(null);

  const allItems = useMemo(() => menuItems.flatMap((section) => section.items), [menuItems]);
  const activeHref = useMemo(() => resolveActiveHref(allItems, pathname), [allItems, pathname]);

  useEffect(() => {
    setClosedSections(readClosedSections(storageKey));
  }, [storageKey]);

  // Keep the current page's entry visible in a long menu.
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const item = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!item) return;

      // Scroll only the menu's own scroll container. scrollIntoView() would also
      // scroll every clipped ancestor (the panel shell), pushing the menu under
      // the brand header.
      let scroller: HTMLElement | null = item.parentElement;
      while (scroller) {
        const overflowY = window.getComputedStyle(scroller).overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && scroller.scrollHeight > scroller.clientHeight) break;
        scroller = scroller.parentElement;
      }
      if (!scroller) return;

      const itemRect = item.getBoundingClientRect();
      const viewRect = scroller.getBoundingClientRect();
      const margin = 12;
      if (itemRect.top < viewRect.top + margin) {
        scroller.scrollTop -= viewRect.top + margin - itemRect.top;
      } else if (itemRect.bottom > viewRect.bottom - margin) {
        scroller.scrollTop += itemRect.bottom - (viewRect.bottom - margin);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeHref, isRail]);

  // "/" or Ctrl/Cmd+K jumps to the menu search (desktop only, never while typing).
  useEffect(() => {
    if (isMobile) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)));
      const isShortcut = (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);

      if (isShortcut || (event.key === "/" && !typing)) {
        if (!searchRef.current) return;
        event.preventDefault();
        searchRef.current.focus();
        searchRef.current.select();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobile]);

  const toggleSection = useCallback(
    (section: string) => {
      setClosedSections((current) => {
        const next = current.includes(section) ? current.filter((name) => name !== section) : [...current, section];
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // storage unavailable: the choice simply is not remembered
        }
        return next;
      });
    },
    [storageKey]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSections = useMemo(() => {
    if (!normalizedQuery) return menuItems;
    return menuItems
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(normalizedQuery) || section.section.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuItems, normalizedQuery]);

  const showTooltip = (label: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      x: isArabic ? window.innerWidth - rect.left + 10 : rect.right + 10,
    });
  };

  const renderItem = (item: AdminSidebarMenuItem) => {
    const IconComponent = iconMap[item.iconName] ?? FiGrid;
    const active = item.href === activeHref;
    const hasBadge = typeof item.badgeCount === "number" && item.badgeCount > 0;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={() => {
            setTooltip(null);
            onNavigate?.();
          }}
          aria-current={active ? "page" : undefined}
          aria-label={isRail ? item.label : undefined}
          onMouseEnter={isRail ? (event) => showTooltip(item.label, event.currentTarget) : undefined}
          onMouseLeave={isRail ? () => setTooltip(null) : undefined}
          onFocus={isRail ? (event) => showTooltip(item.label, event.currentTarget) : undefined}
          onBlur={isRail ? () => setTooltip(null) : undefined}
          className={[
            "group relative flex items-center rounded-xl outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)]",
            isRail ? "h-11 w-11 justify-center" : "gap-3 px-3",
            isRail ? "" : isMobile ? "min-h-11 text-sm" : "min-h-10 text-[13px]",
            active
              ? "font-semibold text-[color:var(--noon-teal-strong)] dark:text-[color:var(--noon-teal)]"
              : "font-medium text-zinc-600 hover:bg-zinc-900/[0.04] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
          ].join(" ")}
        >
          {active ? (
            <motion.span
              layoutId={`${layoutScope}-active`}
              transition={SPRING}
              aria-hidden="true"
              className="absolute inset-0 rounded-xl bg-[color:var(--noon-teal-soft)] dark:bg-[color:var(--noon-teal)]/15"
            />
          ) : null}

          <span className="relative inline-flex shrink-0">
            <IconComponent
              className={[
                "size-[18px] transition-colors",
                active
                  ? "text-[color:var(--noon-teal-strong)] dark:text-[color:var(--noon-teal)]"
                  : "text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-zinc-100",
              ].join(" ")}
              aria-hidden="true"
            />
            {isRail && hasBadge ? (
              <span className="absolute -end-1.5 -top-1.5 size-2.5 rounded-full bg-[color:var(--noon-coral)] ring-2 ring-white dark:ring-zinc-950" />
            ) : null}
          </span>

          {!isRail ? <span className="relative min-w-0 flex-1 truncate">{item.label}</span> : null}

          {!isRail && hasBadge ? (
            <span
              className="relative inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--noon-coral)] px-1.5 text-[10px] font-bold leading-none text-white"
              aria-label={`${item.badgeCount}`}
            >
              {formatBadge(item.badgeCount ?? 0)}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  const searchLabel = isArabic ? "بحث في القائمة" : "Search menu";

  return (
    <div ref={navRef} className={isRail ? "flex flex-col items-center gap-1" : "space-y-1"}>
      {!isRail && allItems.length > 6 ? (
        <div className="relative mb-3">
          <FiSearch
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
                event.currentTarget.blur();
              }
            }}
            aria-label={searchLabel}
            placeholder={searchLabel}
            className="nav-search h-10 w-full rounded-xl border border-zinc-200 bg-white/80 ps-9 pe-9 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label={isArabic ? "مسح البحث" : "Clear search"}
              className="absolute end-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <FiX className="size-3.5" />
            </button>
          ) : !isMobile ? (
            <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              /
            </kbd>
          ) : null}
        </div>
      ) : null}

      {visibleSections.length === 0 ? (
        <p className="px-3 py-6 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
          {isArabic ? "لا توجد نتائج مطابقة." : "No matching pages."}
        </p>
      ) : null}

      {visibleSections.map((section, index) => {
        const sectionId = `${layoutScope}-section-${index}`;
        const containsActive = section.items.some((item) => item.href === activeHref);
        // A search always shows every match.
        const open = isRail || Boolean(normalizedQuery) || !closedSections.includes(section.section);
        const pendingCount = section.items.reduce((total, item) => total + (item.badgeCount ?? 0), 0);

        if (isRail) {
          return (
            <div key={section.section} className="flex flex-col items-center gap-1">
              {index > 0 ? <div className="my-1.5 h-px w-7 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" /> : null}
              <ul className="flex flex-col items-center gap-1" aria-label={section.section}>
                {section.items.map(renderItem)}
              </ul>
            </div>
          );
        }

        return (
          <div key={section.section} className="pb-2">
            <button
              type="button"
              onClick={() => toggleSection(section.section)}
              aria-expanded={open}
              aria-controls={sectionId}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 outline-none transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:text-zinc-500 dark:hover:text-zinc-200"
            >
              <span className="min-w-0 flex-1 truncate text-start">{section.section}</span>
              {!open && (pendingCount > 0 || containsActive) ? (
                <span
                  className={`size-1.5 rounded-full ${pendingCount > 0 ? "bg-[color:var(--noon-coral)]" : "bg-[color:var(--noon-teal)]"}`}
                  aria-hidden="true"
                />
              ) : null}
              <FiChevronDown
                className={`size-3.5 shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90 rtl:rotate-90"}`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={sectionId}
                  key="items"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <ul className="space-y-0.5 pt-1">{section.items.map(renderItem)}</ul>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}

      {isRail && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {tooltip ? (
                <motion.div
                  key={tooltip.label}
                  role="tooltip"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    top: tooltip.top,
                    ...(isArabic ? { right: tooltip.x } : { left: tooltip.x }),
                  }}
                  className="pointer-events-none fixed z-[300] -translate-y-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {tooltip.label}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
