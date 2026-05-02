import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Navbar } from "../../components/layout/Navbar";
import { landingContent } from "../../content/landing";
import type { UseLanguageResult } from "../../hooks/useLanguage";
import type { UseThemeResult } from "../../hooks/useTheme";

type DocsPageProps = {
  language: UseLanguageResult;
  theme: UseThemeResult;
};

const DOCS_LIST = [
  { id: "installations", title: "Installation & Setup" },
  { id: "knowledge-base", title: "The Knowledge Base" },
  { id: "rules-schema", title: "Rules & Logic Schema" },
  { id: "vector-db", title: "Vector Database (Qdrant)" },
  { id: "architecture", title: "System Architecture" },
  { id: "pipeline", title: "AI Pipeline Flow" },
  { id: "technical-implementation", title: "Technical Implementation" },
  { id: "testing", title: "Testing Suite" },
  { id: "api-docs", title: "API Documentation" },
  { id: "prompts", title: "Prompts Used" },
  { id: "diagrams", title: "System Diagrams" },
];

export function DocsPage({ language, theme }: DocsPageProps) {
  const content = landingContent[language.locale];

  const getInitialDocId = () => {
    const pathParts = window.location.pathname.split("/");
    return pathParts.length > 2 && pathParts[2] ? pathParts[2] : "installations";
  };

  const [activeDoc, setActiveDoc] = useState(getInitialDocId());
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/docs/${activeDoc}.md`)
      .then((res) => {
        if (!res.ok) throw new Error("Doc not found");
        return res.text();
      })
      .then((text) => setMarkdown(text))
      .catch(() => setMarkdown("# Error loading document"))
      .finally(() => setLoading(false));

    window.history.pushState({}, "", `/docs/${activeDoc}`);
  }, [activeDoc]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Navbar content={content} language={language} theme={theme} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[var(--color-border)] p-4 overflow-y-auto hidden md:block">
          <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Documentation</h2>
          <nav className="space-y-1">
            {DOCS_LIST.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeDoc === doc.id
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]"
                }`}
              >
                {doc.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 md:p-12 lg:pl-16">
          <div className="max-w-4xl text-[var(--color-text)]">
            {loading ? (
              <div className="animate-pulse text-[var(--color-muted)]">Loading content...</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // ── Headings ────────────────────────────────────────────────
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mb-6 mt-2 text-[var(--color-text)]" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold mb-4 mt-8 border-b border-[var(--color-border)] pb-2 text-[var(--color-text)]" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-bold mb-3 mt-6 text-[var(--color-text)]" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-lg font-semibold mb-2 mt-4 text-[var(--color-text)]" {...props} />
                  ),

                  // ── Body text ────────────────────────────────────────────────
                  p: ({ node, ...props }) => (
                    <p className="mb-4 text-base leading-relaxed text-[var(--color-muted)]" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside mb-4 space-y-1 text-[var(--color-muted)]" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-1 text-[var(--color-muted)]" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="mb-1 text-[var(--color-muted)]" {...props} />
                  ),

                  // ── Code ────────────────────────────────────────────────────
                  pre: ({ node, ...props }) => (
                    <pre className="bg-[var(--color-border)] p-4 rounded-lg mb-4 overflow-x-auto text-sm" {...props} />
                  ),
                  code: ({ node, className, children, ...props }) => {
                    const isInline = !className;
                    return (
                      <code
                        className={
                          isInline
                            ? "bg-[var(--color-border)] px-1.5 py-0.5 rounded text-sm text-[var(--color-primary)] font-mono"
                            : "text-sm font-mono text-[var(--color-text)]"
                        }
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },

                  // ── Misc ────────────────────────────────────────────────────
                  a: ({ node, ...props }) => (
                    <a className="text-[var(--color-primary)] hover:underline" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="border-[var(--color-border)] my-6" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-[var(--color-primary)] pl-4 py-1 mb-4 text-[var(--color-muted)] italic bg-[var(--color-primary)]/5 rounded-r-md"
                      {...props}
                    />
                  ),

                  // ── Tables (requires remark-gfm) ────────────────────────────
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto mb-6 rounded-lg border border-[var(--color-border)]">
                      <table className="w-full text-sm text-left border-collapse" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead
                      className="bg-[var(--color-primary)]/10 text-[var(--color-text)] text-xs uppercase tracking-wide"
                      {...props}
                    />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody className="divide-y divide-[var(--color-border)]" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="hover:bg-[var(--color-border)]/40 transition-colors" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="px-4 py-3 font-semibold text-[var(--color-text)] whitespace-nowrap"
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-4 py-3 text-[var(--color-muted)]" {...props} />
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
