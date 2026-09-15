"use client";

import { useEffect, useState, type ReactNode } from "react";
import { applyTheme, readStoredTheme, THEME_CHANGE_EVENT } from "@/lib/theme";

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [storedTheme, setStoredTheme] = useState<string | null>(null);

  useEffect(() => {
    const syncStoredTheme = () => setStoredTheme(readStoredTheme());

    syncStoredTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncStoredTheme);
    window.addEventListener("storage", syncStoredTheme);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncStoredTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, []);

  useEffect(() => {
    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => applyTheme(media.matches ? "dark" : "light");

    syncTheme();
    media.addEventListener("change", syncTheme);

    return () => media.removeEventListener("change", syncTheme);
  }, [storedTheme]);

  return children;
}
