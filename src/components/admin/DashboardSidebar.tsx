"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiChevronsLeft, FiExternalLink } from "react-icons/fi";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import AdminSidebarNav, { type AdminSidebarMenuSection } from "@/components/admin/AdminSidebarNav";

type Props = {
  locale: "en" | "ar";
  menuItems: AdminSidebarMenuSection[];
  title: string;
  subtitle?: string;
  logoUrl?: string;
  /** Where the logo links to. */
  homeHref: string;
  viewSiteLabel?: string;
  /** Rendered at the bottom while expanded (usually the profile menu). */
  footer?: ReactNode;
  /** Distinguishes the remembered state of each panel (admin / worker / photographer). */
  storageKey: string;
};

/**
 * Desktop sidebar shared by the admin, worker and photographer panels.
 * It can be collapsed to an icon rail; the choice is remembered per panel.
 * Renders its own in-flow spacer so the page content never sits underneath it.
 */
const COLLAPSE_EVENT = "noon:sidebar-collapse";

export default function DashboardSidebar({
  locale,
  menuItems,
  title,
  subtitle,
  logoUrl = "/images/logo-noon.png",
  homeHref,
  viewSiteLabel,
  footer,
  storageKey,
}: Props) {
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const collapseKey = `${storageKey}_collapsed`;
  const [ready, setReady] = useState(false);
  // Used when storage is unavailable (private mode): the toggle still works for
  // the current page, it is just not remembered.
  const [fallbackCollapsed, setFallbackCollapsed] = useState<boolean | null>(null);

  // The collapsed flag lives in localStorage; reading it through an external
  // store keeps server and first client render in agreement (expanded).
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(COLLAPSE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(COLLAPSE_EVENT, onChange);
    };
  }, []);
  const storedCollapsed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(collapseKey) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const collapsed = fallbackCollapsed ?? storedCollapsed;

  useEffect(() => {
    // Enable the width transition only after the stored state is applied, so a
    // collapsed sidebar does not animate shut on every page load.
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    try {
      window.localStorage.setItem(collapseKey, next ? "1" : "0");
      window.dispatchEvent(new Event(COLLAPSE_EVENT));
    } catch {
      setFallbackCollapsed(next);
    }
  };

  const width = collapsed ? "w-[4.75rem]" : "w-64";
  const transition = ready ? "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" : "";
  const toggleLabel = collapsed
    ? (isArabic ? "توسيع القائمة" : "Expand sidebar")
    : (isArabic ? "طيّ القائمة" : "Collapse sidebar");

  return (
    <>
      <div className={`hidden shrink-0 lg:block ${width} ${transition}`} aria-hidden="true" />
      <aside
        dir={dir}
        className={`fixed inset-y-0 start-0 z-20 hidden flex-col border-e border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex ${width} ${transition}`}
      >
        {/* Brand */}
        <div className={`flex h-16 shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800 ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`}>
          <Link href={homeHref} className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)]" aria-label={title}>
            <Image src={logoUrl} alt="" width={56} height={56} priority className="h-9 w-auto" />
          </Link>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-zinc-950 dark:text-white">{title}</p>
              {subtitle ? (
                <p className="truncate text-xs leading-tight text-zinc-500 dark:text-zinc-400">{subtitle}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Navigation */}
        <OverlayScrollArea className="min-h-0 flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
          <nav className={collapsed ? "px-2 py-3" : "px-3 py-4"} aria-label={title}>
            <AdminSidebarNav
              menuItems={menuItems}
              collapsed={collapsed}
              locale={locale}
              storageKey={`${storageKey}_sections`}
            />
          </nav>
        </OverlayScrollArea>

        {/* Footer */}
        <div className={`shrink-0 space-y-2 border-t border-zinc-200 dark:border-zinc-800 ${collapsed ? "px-2 py-3" : "p-3"}`}>
          {!collapsed && footer ? <div>{footer}</div> : null}

          <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "justify-between gap-2"}`}>
            {viewSiteLabel ? (
              <Link
                href={`/${locale}`}
                aria-label={collapsed ? viewSiteLabel : undefined}
                title={collapsed ? viewSiteLabel : undefined}
                className={`inline-flex items-center gap-2 rounded-lg text-xs font-medium text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white ${collapsed ? "size-10 justify-center" : "min-h-9 px-2.5"}`}
              >
                <FiExternalLink className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                {!collapsed ? <span>{viewSiteLabel}</span> : null}
              </Link>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={toggle}
              aria-label={toggleLabel}
              aria-pressed={collapsed}
              title={toggleLabel}
              className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <FiChevronsLeft
                className={`size-4 transition-transform duration-300 ${collapsed ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180"}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
