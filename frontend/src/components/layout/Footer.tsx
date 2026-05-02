import { Container } from "../ui/Container";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-md py-8">
      <Container>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-muted)]">
          <div>&copy; {new Date().getFullYear()} ClaimGuard.ai. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <a href="/" className="hover:text-[var(--color-text)] transition">Home</a>
            <a href="/docs" className="hover:text-[var(--color-text)] transition">Docs</a>
            <a href="https://github.com/Abhinav-Vishwakarma/claimGaurd.ai" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition">GitHub</a>
            <a href="#" className="hover:text-[var(--color-text)] transition">Privacy Policy</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
