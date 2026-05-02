import type { FormEvent, PropsWithChildren } from "react";

type AuthCardProps = PropsWithChildren<{
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>;

export function AuthCard({ children, title, description, submitLabel, isSubmitting, onSubmit }: AuthCardProps) {
  return (
    <form
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md p-6 shadow-xl shadow-black/5"
      onSubmit={onSubmit}
    >
      <h1 className="text-2xl font-bold text-[var(--color-text)]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
      <div className="mt-6 grid gap-4">{children}</div>
      <button
        className="mt-6 min-h-11 w-full rounded-md bg-[var(--color-primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Please wait" : submitLabel}
      </button>
    </form>
  );
}
