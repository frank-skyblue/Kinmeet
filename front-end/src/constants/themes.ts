export const THEME_STORAGE_KEY = "kinmeet-theme";

/* Add a theme name here after creating src/styles/themes/<name>.css. See THEME_IMPLEMENTATION.md. */
export const THEME_PREFERENCES = ["light"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type ResolvedTheme = ThemePreference;

export const isThemePreference = (value: string | null): value is ThemePreference =>
  THEME_PREFERENCES.some((theme) => theme === value);

export const resolveTheme = (preference: ThemePreference): ResolvedTheme => preference;

export const readStoredThemePreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "light";
  } catch {
    return "light";
  }
};
