import { languages } from "../../app/config/languages.config";
import type { UseLanguageResult } from "../../hooks/useLanguage";

type LanguageSelectorProps = {
  language: UseLanguageResult;
};

export function LanguageSelector({ language }: LanguageSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
        value={language.locale}
        onChange={(event) => language.setLocale(event.target.value)}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
