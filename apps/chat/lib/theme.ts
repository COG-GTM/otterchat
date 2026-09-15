export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "eve-theme";
export const THEME_CHANGE_EVENT = "eve-theme-change";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for this page load when storage is unavailable.
  }

  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

export function resolveCurrentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
