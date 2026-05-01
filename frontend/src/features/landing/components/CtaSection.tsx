import { Button } from "../../../components/ui/Button";
import { Container } from "../../../components/ui/Container";
import type { LandingContent } from "../../../content/landing";

type CtaSectionProps = {
  content: LandingContent["cta"];
};

export function CtaSection({ content }: CtaSectionProps) {
  return (
    <section className="border-t border-[var(--color-border)] py-16" id="contact">
      <Container>
        <div className="grid gap-6 rounded-lg bg-[var(--color-text)] p-8 text-[var(--color-bg)] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{content.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80">{content.description}</p>
          </div>
          <Button className="bg-[var(--color-bg)] text-[var(--color-text)] hover:opacity-90" href="mailto:hello@claimguard.ai">
            {content.action}
          </Button>
        </div>
      </Container>
    </section>
  );
}
