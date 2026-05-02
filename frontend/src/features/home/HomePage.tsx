import { Activity, FileCheck2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Navbar } from "../../components/layout/Navbar";
import type { UseLanguageResult } from "../../hooks/useLanguage";
import { Container } from "../../components/ui/Container";
import type { LandingContent } from "../../content/landing";
import type { UseThemeResult } from "../../hooks/useTheme";
import { navigate } from "../../hooks/usePath";
import { useLogout, useMe } from "../auth/auth.hooks";

type HomePageProps = {
  content: LandingContent;
  language: UseLanguageResult;
  theme: UseThemeResult;
};

export function HomePage({ content, language, theme }: HomePageProps) {
  const me = useMe();
  const logout = useLogout();
  const user = me.data?.user;

  useEffect(() => {
    if (!me.isLoading && !user) navigate("/login");
  }, [me.isLoading, user]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar
        content={content}
        language={language}
        onLogout={() => logout.mutate()}
        theme={theme}
        user={user ? { email: user.email, role: user.role } : undefined}
      />

      <main className="py-10">
        <Container>
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">{user?.role || "Workspace"}</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">Claim review homepage</h1>
            <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
              Welcome {user?.email || "back"}. Track intake quality, risk checks, and review readiness from one calm workspace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: FileCheck2, label: "Open claims", value: "12" },
              { icon: Activity, label: "Risk reviews", value: "4" },
              { icon: ShieldCheck, label: "Ready to approve", value: "8" },
            ].map((item) => (
              <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" key={item.label}>
                <item.icon className="text-[var(--color-primary)]" aria-hidden="true" size={24} />
                <p className="mt-5 text-3xl font-bold">{item.value}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{item.label}</p>
              </section>
            ))}
          </div>
        </Container>
      </main>
    </div>
  );
}
