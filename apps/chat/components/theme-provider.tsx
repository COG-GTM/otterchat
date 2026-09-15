"use client";

import { useEffect, useReducer, type ReactNode } from "react";
import { applyTheme, readStoredTheme, THEME_CHANGE_EVENT } from "@/lib/theme";

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [themeChangeCount, notifyThemeChange] = useReducer(
    (count: number) => count + 1,
    0,
  );

  useEffect(() => {
    window.addEventListener(THEME_CHANGE_EVENT, notifyThemeChange);
    window.addEventListener("storage", notifyThemeChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, notifyThemeChange);
      window.removeEventListener("storage", notifyThemeChange);
    };
  }, []);

  useEffect(() => {
    const storedTheme = readStoredTheme();

    if (storedTheme) {
      applyTheme(storedTheme);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => applyTheme(media.matches ? "dark" : "light");

    syncTheme();
    media.addEventListener("change", syncTheme);

    return () => media.removeEventListener("change", syncTheme);
  }, [themeChangeCount]);

  return children;
}
