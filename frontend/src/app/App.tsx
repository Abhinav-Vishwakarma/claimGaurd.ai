import { LandingPage } from "../features/landing/LandingPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { HomePage } from "../features/home/HomePage";
import { DashboardDispatcher } from "../features/dashboard/DashboardDispatcher";
import { DocsPage } from "../features/docs/DocsPage";
import { landingContent } from "../content/landing";
import { useLanguage } from "../hooks/useLanguage";
import { usePath } from "../hooks/usePath";
import { useTheme } from "../hooks/useTheme";

export function App() {
  const language = useLanguage();
  const theme = useTheme();
  const path = usePath();
  const content = landingContent[language.locale];

  if (path === "/login") return <LoginPage content={content} theme={theme} />;
  if (path === "/register") return <RegisterPage content={content} theme={theme} />;
  if (path === "/home") return <HomePage content={content} theme={theme} />;
  if (path.startsWith("/dashboard")) return <DashboardDispatcher />;
  if (path.startsWith("/docs")) return <DocsPage theme={theme} language={language} />;

  return <LandingPage language={language} theme={theme} />;
}
