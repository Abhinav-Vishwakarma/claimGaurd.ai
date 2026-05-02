import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { LandingContent } from "../../content/landing";
import type { UseThemeResult } from "../../hooks/useTheme";
import { navigate } from "../../hooks/usePath";
import { useLogin } from "./auth.hooks";
import { AuthCard } from "./components/AuthCard";
import { FormField } from "./components/FormField";
import { AuthShell } from "./components/AuthShell";
import type { UseLanguageResult } from "../../hooks/useLanguage";

type LoginPageProps = {
  content: LandingContent;
  language: UseLanguageResult;
  theme: UseThemeResult;
};

export function LoginPage({ content, language, theme }: LoginPageProps) {
  const login = useLogin();
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(form);
  };

  return (
    <AuthShell content={content} language={language} theme={theme}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <button 
          onClick={() => navigate("/")} 
          className="mb-6 flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          type="button"
        >
          <ArrowLeft size={16} />
          Go back home
        </button>
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
      </motion.div>
    </AuthShell>
  );
}
