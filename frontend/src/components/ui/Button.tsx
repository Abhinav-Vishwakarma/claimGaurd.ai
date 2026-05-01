import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: "primary" | "secondary";
  }
>;

const variants = {
  primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-soft)]",
};

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <a
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-5 text-sm font-bold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
