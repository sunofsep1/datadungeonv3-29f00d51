import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

/** Classes applied to `document.documentElement` for theme (used by print iframe sync). */
export const THEME_HTML_CLASSES = [
  "dark",
  "light",
  "theme-tomorrow-night-blue",
  "theme-dracula",
  "theme-monokai",
  "theme-github-dark",
  "theme-one-dark",
  "theme-solarized-dark",
  "theme-nord",
  "theme-catppuccin",
  "theme-high-contrast",
  "theme-tokyo-night",
  "theme-gruvbox",
  "theme-rose-pine",
  "theme-synthwave",
  "theme-ayu-mirage",
  "theme-material-palenight",
  "theme-kanagawa",
  "theme-oceanic-next",
  "theme-horizon",
  "theme-everforest",
] as const;

export type Theme =
  | "dark"
  | "light"
  | "tomorrowNightBlue"
  | "dracula"
  | "monokai"
  | "githubDark"
  | "oneDark"
  | "solarizedDark"
  | "nord"
  | "catppuccin"
  | "highContrast"
  | "tokyoNight"
  | "gruvbox"
  | "rosePine"
  | "synthwave"
  | "ayuMirage"
  | "materialPalenight"
  | "kanagawa"
  | "oceanicNext"
  | "horizon"
  | "everforest";

const VALID_THEMES: Theme[] = [
  "dark",
  "light",
  "tomorrowNightBlue",
  "dracula",
  "monokai",
  "githubDark",
  "oneDark",
  "solarizedDark",
  "nord",
  "catppuccin",
  "highContrast",
  "tokyoNight",
  "gruvbox",
  "rosePine",
  "synthwave",
  "ayuMirage",
  "materialPalenight",
  "kanagawa",
  "oceanicNext",
  "horizon",
  "everforest",
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  density: Density;
  setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";
const DENSITY_STORAGE_KEY = "density";

/** Default theme when none is saved (used on first visit / new devices). */
export const DEFAULT_THEME: Theme = "dark";

export type Density = "comfortable" | "compact";

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
    nord: "theme-nord",
    catppuccin: "theme-catppuccin",
    highContrast: "theme-high-contrast",
    tokyoNight: "theme-tokyo-night",
    gruvbox: "theme-gruvbox",
    rosePine: "theme-rose-pine",
    synthwave: "theme-synthwave",
    ayuMirage: "theme-ayu-mirage",
    materialPalenight: "theme-material-palenight",
    kanagawa: "theme-kanagawa",
    oceanicNext: "theme-oceanic-next",
    horizon: "theme-horizon",
    everforest: "theme-everforest",
  };
  return map[theme] ?? DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (VALID_THEMES.includes(stored)) return stored;
    }
    return DEFAULT_THEME;
  });

  const [density, setDensityState] = useState<Density>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(DENSITY_STORAGE_KEY) as Density;
      if (stored === "compact" || stored === "comfortable") return stored;
    }
    return "comfortable";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    root.classList.add(themeToClass(theme));
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("density-compact", "density-comfortable");
    root.classList.add(`density-${density}`);
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setDensity = (d: Density) => {
    setDensityState(d);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, density, setDensity }}>
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
