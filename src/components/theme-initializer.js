"use client";

import { useEffect } from "react";

const THEME_ATTRIBUTE = "data-theme";
const DARK = "dark";
const LIGHT = "light";

export default function ThemeInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.body;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (isDark) => {
      root.setAttribute(THEME_ATTRIBUTE, isDark ? DARK : LIGHT);
    };

    applyTheme(mediaQuery.matches);

    const listener = (event) => applyTheme(event.matches);
    mediaQuery.addEventListener("change", listener);

    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return null;
}
