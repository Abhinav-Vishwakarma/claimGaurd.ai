import { navItems } from "../../app/config/nav.config";
import type { LandingContent } from "../../content/landing/landing.types";
import { navigate } from "../../hooks/usePath";

type MobileNavProps = {
  content: LandingContent;
  isOpen: boolean;
  onClose: () => void;
  user?: { email: string; role: string };
  onLogout?: () => void;
};

export function MobileNav({ content, isOpen, onClose, user, onLogout }: MobileNavProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 md:hidden">
      <nav className="flex flex-col gap-3" aria-label={content.nav.mobileLabel}>
        {navItems.map((item) => (
          <a
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-text)]"
            href={item.href}
            key={item.id}
            onClick={onClose}
          >
            {content.nav.items[item.labelKey]}
          </a>
        ))}
        {user ? (
          <button
            className="rounded-md px-3 py-2 text-left text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-text)]"
            onClick={() => {
              onLogout?.();
              onClose();
            }}
            type="button"
          >
            Logout
          </button>
        ) : (
          <>
            <button
              className="rounded-md px-3 py-2 text-left text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-text)]"
              onClick={() => {
                navigate("/login");
                onClose();
              }}
              type="button"
            >
              Login
            </button>
            <button
              className="rounded-md bg-[var(--color-primary)] px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)]"
              onClick={() => {
                navigate("/register");
                onClose();
              }}
              type="button"
            >
              Register
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
