import { useState, type FormEvent } from "react";
import type { LandingContent } from "../../content/landing";
import type { UseThemeResult } from "../../hooks/useTheme";
import { navigate } from "../../hooks/usePath";
import { useRegister } from "./auth.hooks";
import type { Role } from "./auth.types";
import { AuthCard } from "./components/AuthCard";
import { AuthShell } from "./components/AuthShell";
import { FormField } from "./components/FormField";

type RegisterPageProps = {
  content: LandingContent;
  theme: UseThemeResult;
};

const roles: Array<{ value: Role; label: string }> = [
  { value: "CLIENT", label: "Client" },
  { value: "HOSPITAL", label: "Hospital" },
];

export function RegisterPage({ content, theme }: RegisterPageProps) {
  const register = useRegister();
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "CLIENT" as Role });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    register.mutate(form);
  };

  return (
    <AuthShell content={content} theme={theme}>
      <AuthCard
        description="Create a secure role-based account for claims collaboration."
        isSubmitting={register.isPending}
        onSubmit={submit}
        submitLabel="Create account"
        title="Register"
      >
        <FormField
          autoComplete="name"
          label="Name"
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          type="text"
          value={form.name}
        />
        <FormField
          autoComplete="email"
          label="Email"
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
          type="email"
          value={form.email}
        />
        <FormField
          autoComplete="new-password"
          label="Password"
          minLength={8}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
          type="password"
          value={form.password}
        />
        <label className="grid gap-2 text-sm font-semibold text-[var(--color-text)]">
          Role
          <select
            className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            value={form.role}
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
      </AuthCard>
      <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
        Already registered?{" "}
        <button className="font-bold text-[var(--color-primary)]" onClick={() => navigate("/login")} type="button">
          Sign in
        </button>
      </p>
    </AuthShell>
  );
}
