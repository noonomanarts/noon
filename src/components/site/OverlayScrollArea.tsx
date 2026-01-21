"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { OverlayScrollbarsOptions } from "overlayscrollbars";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

const BASE_OPTIONS: OverlayScrollbarsOptions = {
  scrollbars: {
    autoHide: "leave",
    autoHideDelay: 600,
    autoHideSuspend: true,
    clickScroll: true,
  },
};

function resolveTheme() {
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
  options?: OverlayScrollbarsOptions;
}) {
  const [theme, setTheme] = useState("os-theme-light");

  useEffect(() => {
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

  const mergedOptions = useMemo<OverlayScrollbarsOptions>(() => {
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

  return (
    <OverlayScrollbarsComponent
      defer
      options={mergedOptions}
      className={className}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}
