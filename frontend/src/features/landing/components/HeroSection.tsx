import { motion } from "framer-motion";
import heroImage from "../../../assets/hero.png";
import { Button } from "../../../components/ui/Button";
import { Container } from "../../../components/ui/Container";
import type { LandingContent } from "../../../content/landing";
import { navigate } from "../../../hooks/usePath";

type HeroSectionProps = {
  content: LandingContent["hero"];
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className="overflow-hidden border-b border-[var(--color-border)] py-16 sm:py-20">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">{content.eyebrow}</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-[var(--color-text)] sm:text-6xl">{content.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">{content.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" onClick={(event) => { event.preventDefault(); navigate("/register"); }}>
                {content.primaryAction}
              </Button>
              <Button href="#process" variant="secondary">
                {content.secondaryAction}
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.45 }}
          >
            <img
              alt=""
              className="aspect-[4/3] w-full rounded-lg border border-[var(--color-border)] object-cover shadow-2xl shadow-black/10"
              src={heroImage}
            />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
