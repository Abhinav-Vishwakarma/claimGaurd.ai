import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { Container } from "../../../components/ui/Container";
import type { LandingContent } from "../../../content/landing";
import { navigate } from "../../../hooks/usePath";

type HeroSectionProps = {
  content: LandingContent["hero"];
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)] min-h-[calc(100vh-4rem)] flex items-center py-12 lg:py-0">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--color-primary)]">{content.eyebrow}</p>
            <h1 className="max-w-3xl text-3xl font-black leading-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl">{content.title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">{content.subtitle}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button href="/register" onClick={(event) => { event.preventDefault(); navigate("/register"); }}>
                {content.primaryAction}
              </Button>
              <Button href="#process" variant="secondary">
                {content.secondaryAction}
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="relative mt-16 lg:mt-0"
            style={{ perspective: "1200px" }}
          >
            <div className="relative aspect-[4/3] w-full max-w-2xl mx-auto">
              {/* Secondary GIF (Background) */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotateY: [-15, -10, -15],
                  rotateX: [5, 8, 5],
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -top-6 -right-6 lg:-top-12 lg:-right-8 w-[85%] aspect-[4/3] rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden z-0 opacity-80 lg:opacity-90 transition-opacity bg-[var(--color-surface)]"
              >
                <img src="/ui/ai orchestran.gif" className="w-full h-full object-cover" alt="AI Orchestration" />
              </motion.div>

              {/* Primary GIF (Foreground) */}
              <motion.div
                animate={{ 
                  y: [0, 10, 0],
                  rotateY: [-10, -5, -10],
                  rotateX: [2, -2, 2],
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="absolute top-6 -left-6 lg:top-16 lg:-left-8 w-[95%] aspect-[4/3] rounded-2xl border border-[var(--color-border)] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_50px_100px_rgba(0,0,0,0.4)] overflow-hidden z-10 bg-[var(--color-surface)]"
              >
                <img src="/ui/claim .gif" className="w-full h-full object-cover" alt="Claim Analysis" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
