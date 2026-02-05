import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

const THEME_CLASSES = [
  "dark",
  "light",
  "theme-tomorrow-night-blue",
  "theme-dracula",
  "theme-monokai",
  "theme-github-dark",
  "theme-one-dark",
  "theme-solarized-dark",
] as const;

export type Theme =
  | "dark"
  | "light"
  | "tomorrowNightBlue"
  | "dracula"
  | "monokai"
  | "githubDark"
  | "oneDark"
  | "solarizedDark";

const VALID_THEMES: Theme[] = [
  "dark",
  "light",
  "tomorrowNightBlue",
  "dracula",
  "monokai",
  "githubDark",
  "oneDark",
  "solarizedDark",
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";

function themeToClass(theme: Theme): string {
  const map: Record<Theme, string> = {
    dark: "dark",
    light: "light",
    tomorrowNightBlue: "theme-tomorrow-night-blue",
    dracula: "theme-dracula",
    monokai: "theme-monokai",
    githubDark: "theme-github-dark",
    oneDark: "theme-one-dark",
    solarizedDark: "theme-solarized-dark",
  };
  return map[theme] ?? "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (VALID_THEMES.includes(stored)) return stored;
    }
    return "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(...THEME_CLASSES);
    root.classList.add(themeToClass(theme));
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
