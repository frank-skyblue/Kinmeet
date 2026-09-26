import React, { useLayoutEffect, useState } from "react";
import {
  THEME_STORAGE_KEY,
  readStoredThemePreference,
  resolveTheme,
  type ThemePreference,
} from "../constants/themes";
import { ThemeContext } from "./theme-context";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredThemePreference);
  const resolved = resolveTheme(preference);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Preference still applies for this session when storage is blocked.
    }
  };

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
};
