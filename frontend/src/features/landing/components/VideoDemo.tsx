import { motion } from "framer-motion";
import { Container } from "../../../components/ui/Container";

export function VideoDemo() {
  return (
    <section id="video-demo" className="py-16 sm:py-20 bg-[var(--color-bg)] border-y border-[var(--color-border)]/50">
      <Container>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl font-black tracking-tight text-[var(--color-text)] sm:text-4xl mb-4 sm:mb-6">
              Full Platform <span className="text-[var(--color-primary)]">Walkthrough</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
              Watch a complete demonstration of how ClaimGuard.ai automates the end-to-end 
              claim adjudication process using multi-agent AI.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative group px-2 sm:px-0"
          >
            {/* Decorative background effects */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-primary)]/20 to-blue-600/20 rounded-[1.5rem] sm:rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            
            <div className="relative aspect-video rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.3)] border border-white/10 bg-black">
              <iframe
                src="https://www.youtube.com/embed/NdUPj_UV0hw?autoplay=0&rel=0&modestbranding=1"
                title="ClaimGuard.ai Project Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </motion.div>
          
          <div className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 text-xs sm:text-sm font-medium text-[var(--color-muted)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60" />
              Agentic Pipeline
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60" />
              Automated OCR
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60" />
              Policy Validation
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
