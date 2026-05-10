"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiLogOut, FiSettings, FiUser } from "react-icons/fi";
import Image from "next/image";

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
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div ref={containerRef} className="relative" dir={dir}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="relative size-9 overflow-hidden rounded-lg bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
          {profileImage ? (
            <Image
              src={profileImage}
              alt={userName}
              fill
              sizes="36px"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              {userInitial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-start">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {userName}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {userEmail}
          </p>
        </div>
        <FiChevronDown className={`size-4 text-zinc-500 transition-transform dark:text-zinc-400 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${locale === "ar" ? "left-0" : "right-0"} bottom-full mb-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950`}>
          <div className="p-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                // Handle profile navigation if needed
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <FiUser className="size-4" />
              </span>
              <span className="flex-1 text-start">{profileLabel}</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // Handle settings navigation if needed
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-300">
                <FiSettings className="size-4" />
              </span>
              <span className="flex-1 text-start">{settingsLabel}</span>
            </button>

            <div className="my-1.5 h-px bg-zinc-200 dark:bg-zinc-800" />

            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <FiLogOut className="size-4" />
              </span>
              <span className="flex-1 text-start">{logoutLabel}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
