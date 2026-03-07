"use client";

import { useLayoutEffect } from "react";
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
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const instances = new Map<HTMLElement, ReturnType<typeof OverlayScrollbars>>();
    let activeTheme = getThemeClass();

    const buildOptions = (theme: string) => ({
      ...DEFAULT_OPTIONS,
      scrollbars: {
        ...DEFAULT_OPTIONS.scrollbars,
        theme,
      },
    });

    const mountInstance = (element: HTMLElement) => {
      if (instances.has(element)) return;
      const instance = OverlayScrollbars(element, buildOptions(activeTheme));
      if (instance) instances.set(element, instance);
    };

    const unmountInstance = (element: HTMLElement) => {
      const instance = instances.get(element);
      if (!instance) return;
      instance.destroy();
      instances.delete(element);
    };

    const scanAndMount = () => {
      mountInstance(document.body);
      document
        .querySelectorAll<HTMLElement>("[data-overlay-scrollbars]")
        .forEach((element) => mountInstance(element));
    };

    scanAndMount();

    const themeObserver = new MutationObserver(() => {
      const nextTheme = getThemeClass();
      if (nextTheme === activeTheme) return;
      activeTheme = nextTheme;

      instances.forEach((instance) => {
        instance.options(buildOptions(activeTheme));
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const domObserver = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("[data-overlay-scrollbars]")) {
            mountInstance(node);
          }
          node
            .querySelectorAll<HTMLElement>("[data-overlay-scrollbars]")
            .forEach((element) => mountInstance(element));
        });

        record.removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("[data-overlay-scrollbars]")) {
            unmountInstance(node);
          }
          node
            .querySelectorAll<HTMLElement>("[data-overlay-scrollbars]")
            .forEach((element) => unmountInstance(element));
        });
      }
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      themeObserver.disconnect();
      domObserver.disconnect();
      instances.forEach((instance) => {
        instance.destroy();
      });
      instances.clear();
    };
  }, []);

  return null;
}
