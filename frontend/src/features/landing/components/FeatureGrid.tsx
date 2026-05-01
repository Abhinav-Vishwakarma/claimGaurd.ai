import { Container } from "../../../components/ui/Container";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import type { LandingContent } from "../../../content/landing";

type FeatureGridProps = {
  content: LandingContent["features"];
};

export function FeatureGrid({ content }: FeatureGridProps) {
  return (
    <section className="py-16" id="features">
      <Container>
        <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
        <div className="grid gap-4 md:grid-cols-3">
          {content.items.map((item) => (
            <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6" key={item.title}>
              <h3 className="text-lg font-bold text-[var(--color-text)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{item.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
