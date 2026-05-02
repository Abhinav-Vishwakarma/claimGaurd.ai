import { motion } from "framer-motion";
import { Container } from "../../../components/ui/Container";

const screenshots = [
  { 
    src: "/ui/1.png", 
    title: "Insightful Dashboard", 
    description: "Get a bird's-eye view of your claim pipeline with real-time analytics and risk distribution." 
  },
  { 
    src: "/ui/5.png", 
    title: "AI Agent Orchestration", 
    description: "Monitor the multi-agent pipeline as it executes clinical and financial validations." 
  },
  { 
    src: "/ui/4.png", 
    title: "Detailed Claim Audit", 
    description: "Drill down into specific claims with transparent AI reasoning and evidence traceability." 
  },
  { 
    src: "/ui/2.png", 
    title: "Smart Evidence Vault", 
    description: "Securely manage and categorize medical documentation with automated OCR extraction." 
  },
];

export function ProductShowcase() {
  return (
    <section id="showcase" className="py-16 sm:py-20 bg-[var(--color-bg)] overflow-hidden">
      <Container>
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-black tracking-tight text-[var(--color-text)] sm:text-4xl mb-4 sm:mb-6">
              A Platform Built for <span className="text-[var(--color-primary)]">Precision</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--color-muted)] max-w-3xl mx-auto leading-relaxed">
              Experience a sophisticated workspace designed to give insurance adjusters 
              the clarity they need to make faster, more accurate decisions.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          {screenshots.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div className="relative mb-6 sm:mb-8">
                {/* Decorative background glow */}
                <div className="absolute -inset-4 bg-[var(--color-primary)]/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                {/* Browser Frame */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] group-hover:-translate-y-1">
                  <div className="flex items-center gap-1.5 px-4 py-2 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-soft)]/50 backdrop-blur-sm">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/20 dark:bg-red-500/30" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500/20 dark:bg-amber-500/30" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30" />
                  </div>
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-auto transition-transform duration-1000 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
              
              <div className="px-1 sm:px-2">
                <h3 className="text-xl font-bold text-[var(--color-text)] mb-2 flex items-center gap-3">
                  <span className="w-6 h-[2px] bg-[var(--color-primary)] rounded-full" />
                  {item.title}
                </h3>
                <p className="text-base text-[var(--color-muted)] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
