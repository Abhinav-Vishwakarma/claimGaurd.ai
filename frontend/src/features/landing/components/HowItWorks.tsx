import { Container } from "../../../components/ui/Container";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import type { LandingContent } from "../../../content/landing";

type HowItWorksProps = {
  content: LandingContent["process"];
};

export function HowItWorks({ content }: HowItWorksProps) {
  return (
    <section className="bg-[var(--color-soft)] py-16" id="process">
      <Container>
        <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
        <div className="grid gap-4 md:grid-cols-3">
          {content.steps.map((step, index) => (
            <article className="rounded-lg bg-[var(--color-surface)] p-6" key={step.title}>
              <span className="grid h-10 w-10 place-items-center rounded-md bg-[var(--color-primary)] text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{step.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
