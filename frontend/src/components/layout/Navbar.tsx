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
                  {item.id === "github" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 640 640"
                      className="h-5 w-5 fill-current transition-colors hover:text-[var(--color-primary)]"
                    >
                      <path d="M237.9 461.4C237.9 463.4 235.6 465 232.7 465C229.4 465.3 227.1 463.7 227.1 461.4C227.1 459.4 229.4 457.8 232.3 457.8C235.3 457.5 237.9 459.1 237.9 461.4zM206.8 456.9C206.1 458.9 208.1 461.2 211.1 461.8C213.7 462.8 216.7 461.8 217.3 459.8C217.9 457.8 216 455.5 213 454.6C210.4 453.9 207.5 454.9 206.8 456.9zM251 455.2C248.1 455.9 246.1 457.8 246.4 460.1C246.7 462.1 249.3 463.4 252.3 462.7C255.2 462 257.2 460.1 256.9 458.1C256.6 456.2 253.9 454.9 251 455.2zM316.8 72C178.1 72 72 177.3 72 316C72 426.9 141.8 521.8 241.5 555.2C254.3 557.5 258.8 549.6 258.8 543.1C258.8 536.9 258.5 502.7 258.5 481.7C258.5 481.7 188.5 496.7 173.8 451.9C173.8 451.9 162.4 422.8 146 415.3C146 415.3 123.1 399.6 147.6 399.9C147.6 399.9 172.5 401.9 186.2 425.7C208.1 464.3 244.8 453.2 259.1 446.6C261.4 430.6 267.9 419.5 275.1 412.9C219.2 406.7 162.8 398.6 162.8 302.4C162.8 274.9 170.4 261.1 186.4 243.5C183.8 237 175.3 210.2 189 175.6C209.9 169.1 258 202.6 258 202.6C278 197 299.5 194.1 320.8 194.1C342.1 194.1 363.6 197 383.6 202.6C383.6 202.6 431.7 169 452.6 175.6C466.3 210.3 457.8 237 455.2 243.5C471.2 261.2 481 275 481 302.4C481 398.9 422.1 406.6 366.2 412.9C375.4 420.8 383.2 435.8 383.2 459.3C383.2 493 382.9 534.7 382.9 542.9C382.9 549.4 387.5 557.3 400.2 555C500.2 521.8 568 426.9 568 316C568 177.3 455.5 72 316.8 72zM169.2 416.9C167.9 417.9 168.2 420.2 169.9 422.1C171.5 423.7 173.8 424.4 175.1 423.1C176.4 422.1 176.1 419.8 174.4 417.9C172.8 416.3 170.5 415.6 169.2 416.9zM158.4 408.8C157.7 410.1 158.7 411.7 160.7 412.7C162.3 413.7 164.3 413.4 165 412C165.7 410.7 164.7 409.1 162.7 408.1C160.7 407.5 159.1 407.8 158.4 408.8zM190.8 444.4C189.2 445.7 189.8 448.7 192.1 450.6C194.4 452.9 197.3 453.2 198.6 451.6C199.9 450.3 199.3 447.3 197.3 445.4C195.1 443.1 192.1 442.8 190.8 444.4zM179.4 429.7C177.8 430.7 177.8 433.3 179.4 435.6C181 437.9 183.7 438.9 185 437.9C186.6 436.6 186.6 434 185 431.7C183.6 429.4 181 428.4 179.4 429.7z" />
                    </svg>
                  ) : (
                    content.nav.items[item.labelKey]
                  )}
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
