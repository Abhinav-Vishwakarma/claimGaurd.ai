import { Container } from "../../../components/ui/Container";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import type { LandingContent } from "../../../content/landing";

type TrustBarProps = {
  content: LandingContent["trust"];
};

export function TrustBar({ content }: TrustBarProps) {
  return (
    <section className="py-14" id="trust">
      <Container>
        <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
        <div className="grid gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-3">
          {content.metrics.map((metric) => (
            <div className="p-5 text-center" key={metric.label}>
              <strong className="block text-3xl font-black text-[var(--color-primary)]">{metric.value}</strong>
              <span className="mt-2 block text-sm font-medium text-[var(--color-muted)]">{metric.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
