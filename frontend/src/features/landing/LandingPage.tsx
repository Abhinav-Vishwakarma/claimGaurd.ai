import { motion } from "framer-motion";
import { Footer } from "../../components/layout/Footer";
import { Navbar } from "../../components/layout/Navbar";
import { landingContent } from "../../content/landing";
import type { UseLanguageResult } from "../../hooks/useLanguage";
import type { UseThemeResult } from "../../hooks/useTheme";
import { useLogout, useMe } from "../auth/auth.hooks";
import { CtaSection } from "./components/CtaSection";
import { FeatureGrid } from "./components/FeatureGrid";
import { HeroSection } from "./components/HeroSection";
import { HowItWorks } from "./components/HowItWorks";
import { TrustBar } from "./components/TrustBar";
import { ProductShowcase } from "./components/ProductShowcase";
import { VideoDemo } from "./components/VideoDemo";

type LandingPageProps = {
  language: UseLanguageResult;
  theme: UseThemeResult;
};

export function LandingPage({ language, theme }: LandingPageProps) {
  const content = landingContent[language.locale];
  const me = useMe();
  const logout = useLogout();
  const user = me.data?.user;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar
        content={content}
        language={language}
        onLogout={() => logout.mutate()}
        theme={theme}
        user={user ? { email: user.email, role: user.role } : undefined}
      />
      <main id="top" className="flex flex-col">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <HeroSection content={content.hero} />
        </motion.div>
        <VideoDemo />
        <ProductShowcase />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          <TrustBar content={content.trust} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
          <FeatureGrid content={content.features} />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}>
          <HowItWorks content={content.process} />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }}>
          <CtaSection content={content.cta} />
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
