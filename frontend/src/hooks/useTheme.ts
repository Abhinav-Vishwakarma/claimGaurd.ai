import { useEffect, useState } from "react";
import type { ThemeMode } from "../content/landing/landing.types";
import { getSystemTheme, resolveTheme } from "../lib/theme";
import { readStorage, writeStorage } from "../lib/storage";

const THEME_KEY = "claimguard-theme";
const modes: ThemeMode[] = ["system", "light", "dark"];

export type UseThemeResult = {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

function getInitialMode(): ThemeMode {
  const stored = readStorage(THEME_KEY);
  return modes.includes(stored as ThemeMode) ? (stored as ThemeMode) : "system";
}

export function useTheme(): UseThemeResult {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [systemMode, setSystemMode] = useState(getSystemTheme);
  const resolvedMode = resolveTheme(mode, systemMode);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemMode(getSystemTheme());

    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedMode;
    writeStorage(THEME_KEY, mode);
  }, [mode, resolvedMode]);

  return { mode, resolvedMode, setMode };
}
