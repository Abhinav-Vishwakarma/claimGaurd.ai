import type { PropsWithChildren } from "react";
import { ShieldCheck } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { ThemeToggle } from "../../../components/layout/ThemeToggle";
import type { LandingContent } from "../../../content/landing";
import type { UseThemeResult } from "../../../hooks/useTheme";
import { navigate } from "../../../hooks/usePath";
import { Navbar } from "../../../components/layout/Navbar";
import type { UseLanguageResult } from "../../../hooks/useLanguage";

type AuthShellProps = PropsWithChildren<{
  content: LandingContent;
  language: UseLanguageResult;
  theme: UseThemeResult;
}>;

export function AuthShell({ children, content, language, theme }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar content={content} language={language} theme={theme} />

      <main className="py-10 sm:py-16">
        <Container className="max-w-md">{children}</Container>
      </main>
    </div>
  );
}
