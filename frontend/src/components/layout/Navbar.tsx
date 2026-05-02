import { useState } from "react";
import { LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { navItems } from "../../app/config/nav.config";
import type { LandingContent } from "../../content/landing/landing.types";
import type { UseLanguageResult } from "../../hooks/useLanguage";
import type { UseThemeResult } from "../../hooks/useTheme";
import { navigate } from "../../hooks/usePath";
import { Container } from "../ui/Container";
import { LanguageSelector } from "./LanguageSelector";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

type NavbarProps = {
  content: LandingContent;
  language: UseLanguageResult;
  theme: UseThemeResult;
  user?: { email: string; role: string };
  onLogout?: () => void;
};

export function Navbar({ content, language, theme, user, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-md"
    >
      <Container>
        <div className="flex min-h-16 items-center justify-between gap-4">
          <a className="text-lg font-bold text-[var(--color-text)]" href={window.location.pathname === "/" ? "#top" : "/"}>
            ClaimGuard.ai
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label={content.nav.label}>
            {navItems.map((item) => {
              const resolvedHref = item.href.startsWith("#") && window.location.pathname !== "/" 
                ? "/" + item.href 
                : item.href;
              return (
                <a
                  className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
                  href={resolvedHref}
                  key={item.id}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {content.nav.items[item.labelKey]}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                className="flex min-h-10 items-center gap-2 rounded-md border border-[var(--color-border)] px-4 text-sm font-bold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                onClick={onLogout}
                type="button"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <>
                <button
                  className="hidden min-h-10 rounded-md px-3 text-sm font-bold text-[var(--color-muted)] transition hover:text-[var(--color-text)] sm:inline-flex sm:items-center"
                  onClick={() => navigate("/login")}
                  type="button"
                >
                  Login
                </button>
                <button
                  className="hidden min-h-10 rounded-md bg-[var(--color-primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)] sm:inline-flex sm:items-center"
                  onClick={() => navigate("/register")}
                  type="button"
                >
                  Register
                </button>
              </>
            )}
            <LanguageSelector language={language} />
            <ThemeToggle labels={content.theme} theme={theme} />
            <button
              aria-expanded={isOpen}
              aria-label={content.nav.menuLabel}
              className="grid h-10 w-10 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text)] md:hidden"
              onClick={() => setIsOpen((value) => !value)}
              type="button"
            >
              <span className="text-lg leading-none">{isOpen ? "x" : "="}</span>
            </button>
          </div>
        </div>
      </Container>
      <MobileNav content={content} isOpen={isOpen} onClose={() => setIsOpen(false)} onLogout={onLogout} user={user} />
    </motion.header>
  );
}
