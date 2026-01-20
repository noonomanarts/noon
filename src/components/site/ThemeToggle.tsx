"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

type Props = {
  label: string;
  lightLabel: string;
  darkLabel: string;
  systemLabel: string;
};

const STORAGE_KEY = "noon-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  return mql?.matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;

  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // ignore
  }
}

export default function ThemeToggle({
  label,
  lightLabel,
  darkLabel,
  systemLabel,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [preference, setPreference] = useState<ThemePreference>("system");
  const resolved = useMemo(() => {
    if (!mounted) return "light"; // Always return light for SSR
    return resolveTheme(preference);
  }, [preference, mounted]);

  useEffect(() => {
    // Initialize from localStorage after mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreference(stored);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    // Sync React state to the outside world (DOM + storage).
    applyTheme(preference);
  }, [preference]);

  useEffect(() => {
    // Keep in sync when system theme changes and we're in "system" mode.
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;

    const onChange = () => {
      if (preference === "system") applyTheme("system");
    };

    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [preference]);

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

  function select(next: ThemePreference) {
    setPreference(next);
    setIsOpen(false);
  }

  const icon = resolved === "dark" ? (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        aria-label={label}
        title={label}
      >
        {icon}
      </button>

      {isOpen && (
        <div className="absolute end-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-0.5">
            <Option
              label={lightLabel}
              isActive={preference === "light"}
              onSelect={() => select("light")}
            />
            <Option
              label={darkLabel}
              isActive={preference === "dark"}
              onSelect={() => select("dark")}
            />
            <Option
              label={systemLabel}
              isActive={preference === "system"}
              onSelect={() => select("system")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Option({
  label,
  isActive,
  onSelect,
}: {
  label: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition " +
        (isActive
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100")
      }
    >
      <span>{label}</span>
      {isActive ? (
        <svg viewBox="0 0 20 20" className="size-4 text-zinc-900 dark:text-zinc-100" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 011.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.415-.006z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
    </button>
  );
}
