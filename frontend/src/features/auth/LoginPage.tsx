import { useState, type FormEvent } from "react";
import type { LandingContent } from "../../content/landing";
import type { UseThemeResult } from "../../hooks/useTheme";
import { navigate } from "../../hooks/usePath";
import { useLogin } from "./auth.hooks";
import { AuthCard } from "./components/AuthCard";
import { FormField } from "./components/FormField";
import { AuthShell } from "./components/AuthShell";

type LoginPageProps = {
  content: LandingContent;
  theme: UseThemeResult;
};

export function LoginPage({ content, theme }: LoginPageProps) {
  const login = useLogin();
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(form);
  };

  return (
    <AuthShell content={content} theme={theme}>
      <AuthCard
        description="Access your claim review workspace with your registered account."
        isSubmitting={login.isPending}
        onSubmit={submit}
        submitLabel="Sign in"
        title="Login"
      >
        <FormField
          autoComplete="email"
          label="Email"
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
          type="email"
          value={form.email}
        />
        <FormField
          autoComplete="current-password"
          label="Password"
          minLength={8}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
          type="password"
          value={form.password}
        />
      </AuthCard>
      <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
        New here?{" "}
        <button className="font-bold text-[var(--color-primary)]" onClick={() => navigate("/register")} type="button">
          Create an account
        </button>
      </p>
    </AuthShell>
  );
}
