"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { FiChevronDown, FiLogOut, FiSettings, FiUser } from "react-icons/fi";

type Props = {
  userName: string;
  userEmail: string;
  userInitial: string;
  profileImage?: string;
  logoutLabel: string;
  profileLabel: string;
  settingsLabel: string;
  onLogout: () => void;
  locale: "en" | "ar";
  /**
   * "card": full-width row with name and email (sidebar footer); the menu opens upwards.
   * "avatar": compact avatar button (top bar); the menu opens downwards.
   */
  variant?: "card" | "avatar";
};

export default function AdminProfileMenu({
  userName,
  userEmail,
  userInitial,
  profileImage,
  logoutLabel,
  profileLabel,
  settingsLabel,
  onLogout,
  locale,
  variant = "card",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const isCard = variant === "card";
  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const avatar = (
    <span className="relative inline-flex size-9 shrink-0 overflow-hidden rounded-full bg-[color:var(--noon-teal)] text-sm font-semibold text-white">
      {profileImage ? (
        <Image src={profileImage} alt="" fill sizes="36px" className="object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center">{userInitial.toUpperCase()}</span>
      )}
    </span>
  );

  const itemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800";

  return (
    <div ref={containerRef} className="relative" dir={dir}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={isCard ? undefined : userName}
        className={
          isCard
            ? "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start outline-none transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:hover:bg-zinc-900"
            : "inline-flex items-center gap-1.5 rounded-full p-0.5 pe-2 outline-none transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:hover:bg-zinc-800"
        }
      >
        {avatar}
        {isCard ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{userName}</span>
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">{userEmail}</span>
          </span>
        ) : null}
        <FiChevronDown
          className={`size-4 shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: isCard ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isCard ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
            className={`absolute z-50 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 ${
              isCard ? "bottom-full start-0 mb-2" : "end-0 top-full mt-2"
            }`}
          >
            {!isCard ? (
              <div className="mb-1 border-b border-zinc-200 px-3 pb-2.5 pt-1.5 dark:border-zinc-800">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{userName}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">{userEmail}</p>
              </div>
            ) : null}

            <Link role="menuitem" href={`/${locale}/account`} onClick={() => setIsOpen(false)} className={itemClass}>
              <FiUser className="size-4 text-zinc-500" aria-hidden="true" />
              <span className="flex-1 text-start">{profileLabel}</span>
            </Link>

            <Link
              role="menuitem"
              href={`/${locale}/account/settings`}
              onClick={() => setIsOpen(false)}
              className={itemClass}
            >
              <FiSettings className="size-4 text-zinc-500" aria-hidden="true" />
              <span className="flex-1 text-start">{settingsLabel}</span>
            </Link>

            <div className="my-1.5 h-px bg-zinc-200 dark:bg-zinc-800" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <FiLogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              <span className="flex-1 text-start">{logoutLabel}</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
