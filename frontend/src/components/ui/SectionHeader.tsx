type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">{eyebrow}</p>
      <h2 className="text-2xl font-bold text-[var(--color-text)] sm:text-3xl">{title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>
    </div>
  );
}
