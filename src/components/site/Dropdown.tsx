"use client";

import { useEffect, useRef, useState } from "react";

export function Dropdown({
  label,
  children,
  align = "start",
}: {
  label: string;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const alignClass = align === "end" ? "end-0" : "start-0";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        detailsRef.current &&
        !detailsRef.current.contains(event.target as Node)
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

  return (
    <div ref={detailsRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer list-none select-none rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100/50"
      >
        <span className="inline-flex items-center gap-2">
          {label}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`size-4 transition ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div
          className={`absolute ${alignClass} top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900`}
          onClick={() => setIsOpen(false)}
        >
          <div className="max-h-[70vh] overflow-auto">{children}</div>
        </div>
      )}
    </div>
  );
}
