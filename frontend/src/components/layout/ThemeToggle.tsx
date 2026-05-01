import { Moon, Sun } from "lucide-react";
import type { LandingContent, ThemeMode } from "../../content/landing/landing.types";
import type { UseThemeResult } from "../../hooks/useTheme";

type ThemeToggleProps = {
  labels: LandingContent["theme"];
  theme: UseThemeResult;
};

export function ThemeToggle({ labels, theme }: ThemeToggleProps) {
  const isDark = theme.resolvedMode === "dark";
  const nextMode: ThemeMode = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      aria-label={labels.label}
      className="grid h-10 w-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition hover:bg-[var(--color-soft)]"
      onClick={() => theme.setMode(nextMode)}
      title={isDark ? labels.light : labels.dark}
      type="button"
    >
      <Icon aria-hidden="true" size={18} />
    </button>
  );
}
