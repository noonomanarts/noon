"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiGlobe } from "react-icons/fi";

type Props = {
  currentLocale: "en" | "ar";
  labelEn?: string;
  labelAr?: string;
};

export default function LocaleSwitcher({
  currentLocale,
  labelEn = "English",
  labelAr = "العربية",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

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

  function switchLocale(newLocale: "en" | "ar") {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    // Replace locale in pathname
    const newPath = pathname.replace(/^\/(ar|en)/, `/${newLocale}`);
    router.push(newPath);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Switch language"
        title="Switch language"
      >
        <FiGlobe className="size-5" />
      </button>

      {isOpen && (
        <div className="absolute end-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => switchLocale("en")}
              className={
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition " +
                (currentLocale === "en"
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100")
              }
            >
              <span>{labelEn}</span>
              {currentLocale === "en" ? (
                <svg
                  viewBox="0 0 20 20"
                  className="size-4 text-zinc-900 dark:text-zinc-100"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 011.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.415-.006z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => switchLocale("ar")}
              className={
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition " +
                (currentLocale === "ar"
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100")
              }
            >
              <span>{labelAr}</span>
              {currentLocale === "ar" ? (
                <svg
                  viewBox="0 0 20 20"
                  className="size-4 text-zinc-900 dark:text-zinc-100"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 011.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.415-.006z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : null}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
