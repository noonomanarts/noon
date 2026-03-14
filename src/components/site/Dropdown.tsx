"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

export function Dropdown({
  label,
  children,
  align = "start",
  buttonClassName,
  panelClassName,
  panelStyle,
}: {
  label: string;
  children: React.ReactNode;
  align?: "start" | "end";
  buttonClassName?: string;
  panelClassName?: string;
  panelStyle?: CSSProperties;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const alignClass = align === "end" ? "end-0" : "start-0";
  const hasCustomButtonClass = Boolean(buttonClassName?.trim());
  const baseButtonClass = hasCustomButtonClass
    ? "inline-flex h-11 cursor-pointer list-none items-center select-none px-3 text-base font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2"
    : "inline-flex h-11 cursor-pointer list-none items-center select-none px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70";

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
        className={[
          baseButtonClass,
          buttonClassName ?? "",
        ].join(" ")}
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
          className={[
            `absolute ${alignClass} top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden bg-[color:var(--surface)]/98 p-2 shadow-xl`,
            panelClassName ?? "",
          ].join(" ")}
          style={panelStyle}
          onClick={() => setIsOpen(false)}
        >
          <div className="max-h-[70vh] overflow-auto">{children}</div>
        </div>
      )}
    </div>
  );
}
