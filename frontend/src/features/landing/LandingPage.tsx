import { Navbar } from "../../components/layout/Navbar";
import { landingContent } from "../../content/landing";
import type { UseLanguageResult } from "../../hooks/useLanguage";
import type { UseThemeResult } from "../../hooks/useTheme";
import { CtaSection } from "./components/CtaSection";
import { FeatureGrid } from "./components/FeatureGrid";
import { HeroSection } from "./components/HeroSection";
import { HowItWorks } from "./components/HowItWorks";
import { TrustBar } from "./components/TrustBar";

type LandingPageProps = {
  language: UseLanguageResult;
  theme: UseThemeResult;
};

export function LandingPage({ language, theme }: LandingPageProps) {
  const content = landingContent[language.locale];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar content={content} language={language} theme={theme} />
      <main id="top">
        <HeroSection content={content.hero} />
        <TrustBar content={content.trust} />
        <FeatureGrid content={content.features} />
        <HowItWorks content={content.process} />
        <CtaSection content={content.cta} />
      </main>
    </div>
  );
}
