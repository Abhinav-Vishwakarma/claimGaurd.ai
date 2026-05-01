import type { PropsWithChildren } from "react";
import { ShieldCheck } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { ThemeToggle } from "../../../components/layout/ThemeToggle";
import type { LandingContent } from "../../../content/landing";
import type { UseThemeResult } from "../../../hooks/useTheme";
import { navigate } from "../../../hooks/usePath";

type AuthShellProps = PropsWithChildren<{
  content: LandingContent;
  theme: UseThemeResult;
}>;

export function AuthShell({ children, content, theme }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-header)] text-white">
        <Container>
          <div className="flex min-h-16 items-center justify-between">
            <button className="flex items-center gap-2 text-lg font-bold" onClick={() => navigate("/")} type="button">
              <ShieldCheck aria-hidden="true" size={22} />
              ClaimGuard.ai
            </button>
            <ThemeToggle labels={content.theme} theme={theme} />
          </div>
        </Container>
      </header>

      <main className="py-10 sm:py-16">
        <Container className="max-w-md">{children}</Container>
      </main>
    </div>
  );
}
