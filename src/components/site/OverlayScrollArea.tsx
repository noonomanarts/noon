"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { PartialOptions } from "overlayscrollbars";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

const BASE_OPTIONS: PartialOptions = {
  scrollbars: {
    autoHide: "leave",
    autoHideDelay: 600,
    autoHideSuspend: true,
    clickScroll: true,
  },
};

function resolveTheme() {
  if (typeof window === "undefined") return "os-theme-light";
  return document.documentElement.classList.contains("dark")
    ? "os-theme-dark"
    : "os-theme-light";
}

export default function OverlayScrollArea({
  children,
  className,
  options,
}: {
  children: ReactNode;
  className?: string;
  options?: PartialOptions;
}) {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return resolveTheme();
    }
    return "os-theme-light";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(resolveTheme());

    const observer = new MutationObserver(() => {
      setTheme(resolveTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const mergedOptions = useMemo<PartialOptions>(() => {
    return {
      ...BASE_OPTIONS,
      ...options,
      scrollbars: {
        ...BASE_OPTIONS.scrollbars,
        ...options?.scrollbars,
        theme,
      },
    };
  }, [options, theme]);

  // Always render OverlayScrollbarsComponent but defer initialization
  return (
    <OverlayScrollbarsComponent
      defer
      options={mergedOptions}
      className={className}
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      } as React.CSSProperties}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}
