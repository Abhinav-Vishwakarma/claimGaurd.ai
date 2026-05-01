import type { ThemeMode } from "../content/landing/landing.types";

export function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode, systemMode: "light" | "dark") {
  return mode === "system" ? systemMode : mode;
}
