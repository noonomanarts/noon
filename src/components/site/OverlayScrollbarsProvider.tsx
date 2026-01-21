"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { OverlayScrollbars } from "overlayscrollbars";

const DEFAULT_OPTIONS = {
  scrollbars: {
    autoHide: "leave",
    autoHideDelay: 600,
    autoHideSuspend: true,
    clickScroll: true,
  },
} as const;

function getThemeClass() {
  return document.documentElement.classList.contains("dark")
    ? "os-theme-dark"
    : "os-theme-light";
}

export default function OverlayScrollbarsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const instances: Array<{ destroy: () => void }> = [];

    const init = () => {
      const themeClass = getThemeClass();

      const bodyInstance = OverlayScrollbars(document.body, {
        ...DEFAULT_OPTIONS,
        scrollbars: {
          ...DEFAULT_OPTIONS.scrollbars,
          theme: themeClass,
        },
      });
      if (bodyInstance) instances.push(bodyInstance);

      const elements = document.querySelectorAll<HTMLElement>("[data-overlay-scrollbars]");
      elements.forEach((el) => {
        const instance = OverlayScrollbars(el, {
          ...DEFAULT_OPTIONS,
          scrollbars: {
            ...DEFAULT_OPTIONS.scrollbars,
            theme: themeClass,
          },
        });
        if (instance) instances.push(instance);
      });
    };

    init();

    const observer = new MutationObserver(() => {
      instances.forEach((instance) => instance.destroy());
      instances.length = 0;
      init();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      instances.forEach((instance) => instance.destroy());
    };
  }, [pathname]);

  return null;
}
