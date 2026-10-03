"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ColorTheme {
  presetName: string;
  sidebarBg: string;
  sidebarActive: string;
  sidebarHover: string;
  sidebarBorder: string;
  sidebarText: string;
  primaryColor: string;
  primaryHover: string;
  primaryText: string;
  headerAccent: string;
  badgeBg: string;
  badgeText: string;
}

export const THEME_PRESETS: Record<string, ColorTheme> = {
  emerald: {
    presetName: "Emerald Forest (Pharmacy Default)",
    sidebarBg: "#1b2d19",
    sidebarActive: "#2e472a",
    sidebarHover: "#243a22",
    sidebarBorder: "#243a22",
    sidebarText: "#e2e8f0",
    primaryColor: "#16a34a",
    primaryHover: "#15803d",
    primaryText: "#ffffff",
    headerAccent: "#1b2d19",
    badgeBg: "#f0fdf4",
    badgeText: "#166534",
  },
  navy: {
    presetName: "Midnight Navy (Corporate Tech)",
    sidebarBg: "#0f172a",
    sidebarActive: "#1e293b",
    sidebarHover: "#1e293b",
    sidebarBorder: "#1e293b",
    sidebarText: "#e2e8f0",
    primaryColor: "#2563eb",
    primaryHover: "#1d4ed8",
    primaryText: "#ffffff",
    headerAccent: "#0f172a",
    badgeBg: "#eff6ff",
    badgeText: "#1d4ed8",
  },
  indigo: {
    presetName: "Royal Indigo (Modern Luxury)",
    sidebarBg: "#1e1b4b",
    sidebarActive: "#312e81",
    sidebarHover: "#2e1065",
    sidebarBorder: "#2e1065",
    sidebarText: "#ede9fe",
    primaryColor: "#6366f1",
    primaryHover: "#4f46e5",
    primaryText: "#ffffff",
    headerAccent: "#1e1b4b",
    badgeBg: "#eef2ff",
    badgeText: "#4338ca",
  },
  teal: {
    presetName: "Ocean Teal (Clean Clinic)",
    sidebarBg: "#0f292f",
    sidebarActive: "#134e4a",
    sidebarHover: "#115e59",
    sidebarBorder: "#134e4a",
    sidebarText: "#ccfbf1",
    primaryColor: "#0d9488",
    primaryHover: "#0f766e",
    primaryText: "#ffffff",
    headerAccent: "#0f292f",
    badgeBg: "#f0fdfa",
    badgeText: "#115e59",
  },
  crimson: {
    presetName: "Crimson Rose (Bold & Dynamic)",
    sidebarBg: "#2d0c14",
    sidebarActive: "#4c1220",
    sidebarHover: "#3b111e",
    sidebarBorder: "#3b111e",
    sidebarText: "#ffe4e6",
    primaryColor: "#e11d48",
    primaryHover: "#be123c",
    primaryText: "#ffffff",
    headerAccent: "#2d0c14",
    badgeBg: "#fff1f2",
    badgeText: "#9f1239",
  },
  amber: {
    presetName: "Warm Amber / Espresso (Earthy Retail)",
    sidebarBg: "#1c1917",
    sidebarActive: "#292524",
    sidebarHover: "#292524",
    sidebarBorder: "#292524",
    sidebarText: "#fef3c7",
    primaryColor: "#d97706",
    primaryHover: "#b45309",
    primaryText: "#ffffff",
    headerAccent: "#1c1917",
    badgeBg: "#fffbeb",
    badgeText: "#92400e",
  },
  obsidian: {
    presetName: "Obsidian Black (Sleek Dark)",
    sidebarBg: "#09090b",
    sidebarActive: "#18181b",
    sidebarHover: "#18181b",
    sidebarBorder: "#27272a",
    sidebarText: "#f4f4f5",
    primaryColor: "#3b82f6",
    primaryHover: "#2563eb",
    primaryText: "#ffffff",
    headerAccent: "#09090b",
    badgeBg: "#f4f4f5",
    badgeText: "#18181b",
  },
};

export const DEFAULT_THEME = THEME_PRESETS.emerald;

type ThemeContextType = {
  theme: ColorTheme;
  presetKey: string;
  updateTheme: (partial: Partial<ColorTheme>) => void;
  applyPreset: (key: string) => void;
  resetDefault: () => void;
  saveThemeToDb: () => Promise<boolean>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "argroup_custom_theme";

function applyThemeToDom(theme: ColorTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // App-specific variables
  root.style.setProperty("--app-sidebar-bg", theme.sidebarBg);
  root.style.setProperty("--app-sidebar-active", theme.sidebarActive);
  root.style.setProperty("--app-sidebar-hover", theme.sidebarHover);
  root.style.setProperty("--app-sidebar-border", theme.sidebarBorder);
  root.style.setProperty("--app-sidebar-text", theme.sidebarText);
  root.style.setProperty("--app-primary", theme.primaryColor);
  root.style.setProperty("--app-primary-hover", theme.primaryHover);
  root.style.setProperty("--app-primary-text", theme.primaryText || "#ffffff");
  root.style.setProperty("--app-header-accent", theme.headerAccent);
  root.style.setProperty("--app-badge-bg", theme.badgeBg);
  root.style.setProperty("--app-badge-text", theme.badgeText);

  // Standard Tailwind / UI variables
  root.style.setProperty("--primary", theme.primaryColor);
  root.style.setProperty("--primary-foreground", theme.primaryText || "#ffffff");
  root.style.setProperty("--primary-hover", theme.primaryHover);
  root.style.setProperty("--ring", theme.primaryColor);

  // Sidebar tokens
  root.style.setProperty("--sidebar", theme.sidebarBg);
  root.style.setProperty("--sidebar-foreground", theme.sidebarText);
  root.style.setProperty("--sidebar-primary", theme.primaryColor);
  root.style.setProperty("--sidebar-primary-foreground", theme.primaryText || "#ffffff");
  root.style.setProperty("--sidebar-accent", theme.sidebarActive);
  root.style.setProperty("--sidebar-accent-foreground", "#ffffff");
  root.style.setProperty("--sidebar-border", theme.sidebarBorder);
  root.style.setProperty("--sidebar-ring", theme.primaryColor);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ColorTheme>(DEFAULT_THEME);
  const [presetKey, setPresetKey] = useState<string>("emerald");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let initialTheme = DEFAULT_THEME;
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.sidebarBg && parsed.primaryColor) {
          initialTheme = { ...DEFAULT_THEME, ...parsed };
          setTheme(initialTheme);
          const matchedPreset = Object.entries(THEME_PRESETS).find(
            ([, p]) => p.primaryColor.toLowerCase() === initialTheme.primaryColor.toLowerCase() && p.sidebarBg.toLowerCase() === initialTheme.sidebarBg.toLowerCase()
          );
          setPresetKey(matchedPreset ? matchedPreset[0] : "custom");
          applyThemeToDom(initialTheme);
        }
      } else {
        applyThemeToDom(DEFAULT_THEME);
      }
    } catch {
      applyThemeToDom(DEFAULT_THEME);
    }
    setMounted(true);

    // Also load from DB if available for cross-browser sync
    const fetchDbTheme = async () => {
      try {
        const res = await fetch("/api/sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "select",
            table: "shops",
            limit: 1,
          }),
        });
        const json = await res.json();
        const dbShop = json.data?.[0];
        if (dbShop && dbShop.theme_settings) {
          const dbTheme = typeof dbShop.theme_settings === "string" ? JSON.parse(dbShop.theme_settings) : dbShop.theme_settings;
          if (dbTheme && dbTheme.sidebarBg && dbTheme.primaryColor) {
            const merged = { ...DEFAULT_THEME, ...dbTheme };
            setTheme(merged);
            const matched = Object.entries(THEME_PRESETS).find(
              ([, p]) => p.primaryColor.toLowerCase() === merged.primaryColor.toLowerCase() && p.sidebarBg.toLowerCase() === merged.sidebarBg.toLowerCase()
            );
            setPresetKey(matched ? matched[0] : "custom");
            try {
              localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            applyThemeToDom(merged);
          }
        }
      } catch {
        // silent fallback
      }
    };

    fetchDbTheme();
  }, []);

  const updateTheme = (partial: Partial<ColorTheme>) => {
    setTheme((prev) => {
      const next = { ...prev, ...partial, presetName: "Custom Palette" };
      setPresetKey("custom");
      applyThemeToDom(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error("Failed to save theme in localStorage:", err);
      }
      return next;
    });
  };

  const applyPreset = (key: string) => {
    const selected = THEME_PRESETS[key];
    if (!selected) return;
    setTheme(selected);
    setPresetKey(key);
    applyThemeToDom(selected);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(selected));
    } catch (err) {
      console.error("Failed to save theme preset:", err);
    }
  };

  const resetDefault = () => {
    applyPreset("emerald");
  };

  const saveThemeToDb = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "shops",
          data: {
            theme_settings: JSON.stringify(theme),
          },
          filters: [{ col: "id", op: "eq", val: "ar-group-shop-001" }],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const contextValue = React.useMemo(() => ({
    theme,
    presetKey,
    updateTheme,
    applyPreset,
    resetDefault,
    saveThemeToDb,
  }), [theme, presetKey]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
