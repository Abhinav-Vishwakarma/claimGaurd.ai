import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FormField({ label, ...props }: FormFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--color-text)]">
      {label}
      <input
        className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)]"
        {...props}
      />
    </label>
  );
}
