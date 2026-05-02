import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../../components/layout/Navbar";
import { landingContent } from "../../content/landing";
import type { UseLanguageResult } from "../../hooks/useLanguage";
import type { UseThemeResult } from "../../hooks/useTheme";
import { ChevronRight, List, BookOpen, Clock, ArrowRight } from "lucide-react";

type DocsPageProps = {
  language: UseLanguageResult;
  theme: UseThemeResult;
};

const DOCS_LIST = [
  { id: "installations", title: "Installation & Setup", icon: <BookOpen className="w-4 h-4" /> },
  { id: "diagrams", title: "System Diagrams", icon: <List className="w-4 h-4" /> },
  { id: "knowledge-base", title: "The Knowledge Base", icon: <BookOpen className="w-4 h-4" /> },
  { id: "rules-schema", title: "Rules & Logic Schema", icon: <List className="w-4 h-4" /> },
  { id: "vector-db", title: "Vector Database (Qdrant)", icon: <BookOpen className="w-4 h-4" /> },
  { id: "architecture", title: "System Architecture", icon: <List className="w-4 h-4" /> },
  { id: "pipeline", title: "AI Pipeline Flow", icon: <ArrowRight className="w-4 h-4" /> },
  { id: "technical-implementation", title: "Technical Implementation", icon: <BookOpen className="w-4 h-4" /> },
  { id: "testing", title: "Testing Suite", icon: <List className="w-4 h-4" /> },
  { id: "api-docs", title: "API Documentation", icon: <BookOpen className="w-4 h-4" /> },
  { id: "prompts", title: "Prompts Used", icon: <List className="w-4 h-4" /> },
];

export function DocsPage({ language, theme }: DocsPageProps) {
  const content = landingContent[language.locale];
  const [activeDoc, setActiveDoc] = useState(() => {
    const pathParts = window.location.pathname.split("/");
    return pathParts.length > 2 && pathParts[2] ? pathParts[2] : "installations";
  });
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/docs/${activeDoc}.md`)
      .then((res) => {
        if (!res.ok) throw new Error("Doc not found");
        return res.text();
      })
      .then((text) => {
        setMarkdown(text);
        // Basic TOC extraction from headers
        const lines = text.split("\n");
        const headers = lines
          .filter((line) => line.startsWith("## "))
          .map((line) => {
            const text = line.replace(/^##\s+/, "");
            return {
              id: text.toLowerCase().replace(/[^\w]+/g, "-"),
              text,
              level: 2,
            };
          });
        setToc(headers);
      })
      .catch(() => setMarkdown("# Error loading document"))
      .finally(() => {
        setLoading(false);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      });

    window.history.pushState({}, "", `/docs/${activeDoc}`);
  }, [activeDoc]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans selection:bg-[var(--color-primary)]/30">
      <Navbar content={content} language={language} theme={theme} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md p-6 overflow-y-auto hidden lg:block custom-scrollbar">
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text)] tracking-tight">Documentation</h2>
          </div>
          
          <nav className="space-y-1">
            {DOCS_LIST.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-300 relative overflow-hidden ${
                  activeDoc === doc.id
                    ? "text-[var(--color-primary)] font-semibold bg-[var(--color-primary)]/10 shadow-sm"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]/50"
                }`}
              >
                <div className="flex items-center gap-3 z-10">
                  <span className={`transition-colors duration-300 ${activeDoc === doc.id ? "text-[var(--color-primary)]" : "text-[var(--color-muted)] group-hover:text-[var(--color-text)]"}`}>
                    {doc.icon}
                  </span>
                  {doc.title}
                </div>
                {activeDoc === doc.id && (
                  <motion.div
                    layoutId="activeDocIndicator"
                    className="absolute left-0 w-1 h-6 bg-[var(--color-primary)] rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${activeDoc === doc.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"}`} />
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex relative">
          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 md:p-12 xl:p-16 scroll-smooth custom-scrollbar bg-[var(--color-surface)]/20"
          >
            <div className="max-w-4xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeDoc}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="prose prose-slate dark:prose-invert max-w-none"
                >
                  {loading ? (
                    <div className="flex flex-col gap-8 animate-pulse">
                      <div className="h-12 w-3/4 bg-[var(--color-border)] rounded-lg" />
                      <div className="space-y-4">
                        <div className="h-4 w-full bg-[var(--color-border)] rounded shadow-sm" />
                        <div className="h-4 w-full bg-[var(--color-border)] rounded shadow-sm" />
                        <div className="h-4 w-5/6 bg-[var(--color-border)] rounded shadow-sm" />
                      </div>
                      <div className="h-64 w-full bg-[var(--color-border)] rounded-2xl" />
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ ...props }) => (
                          <div className="mb-12">
                            <div className="flex items-center gap-2 text-[var(--color-primary)] mb-4 text-sm font-semibold uppercase tracking-widest">
                              <BookOpen className="w-4 h-4" />
                              <span>Documentation</span>
                            </div>
                            <h1 className="text-5xl font-black mb-4 text-[var(--color-text)] tracking-tight leading-tight" {...props} />
                            <div className="flex items-center gap-4 text-[var(--color-muted)] text-sm">
                              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 5 min read</span>
                              <span className="w-1 h-1 bg-[var(--color-border)] rounded-full" />
                              <span>Updated recently</span>
                            </div>
                          </div>
                        ),
                        h2: ({ node, ...props }) => {
                          const id = props.children?.toString().toLowerCase().replace(/[^\w]+/g, "-");
                          return (
                            <h2 
                              id={id}
                              className="text-3xl font-bold mb-6 mt-16 pb-4 border-b border-[var(--color-border)] text-[var(--color-text)] group flex items-center gap-2" 
                              {...props} 
                            >
                              <span className="text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">#</span>
                              {props.children}
                            </h2>
                          );
                        },
                        h3: ({ ...props }) => (
                          <h3 className="text-2xl font-bold mb-4 mt-10 text-[var(--color-text)]" {...props} />
                        ),
                        p: ({ ...props }) => (
                          <p className="mb-6 text-lg leading-relaxed text-[var(--color-muted)]/90" {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul className="list-none mb-8 space-y-3" {...props} />
                        ),
                        li: ({ children, ...props }) => (
                          <li className="flex items-start gap-3 text-lg text-[var(--color-muted)]" {...props}>
                            <span className="mt-2.5 w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full flex-shrink-0" />
                            <span>{children}</span>
                          </li>
                        ),
                        pre: ({ ...props }) => (
                          <div className="group relative">
                            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="bg-[var(--color-bg)] text-[var(--color-muted)] text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:text-[var(--color-primary)] transition-colors">
                                Copy
                              </button>
                            </div>
                            <pre className="bg-[#0d1117] p-6 rounded-2xl mb-8 overflow-x-auto text-sm font-mono leading-relaxed border border-[var(--color-border)] shadow-2xl" {...props} />
                          </div>
                        ),
                        code: ({ node, className, children, ...props }) => {
                          const isInline = !className;
                          return (
                            <code
                              className={
                                isInline
                                  ? "bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md text-[0.9em] text-[var(--color-primary)] font-mono font-medium"
                                  : "text-[0.95em] font-mono text-gray-300"
                              }
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        a: ({ ...props }) => (
                          <a className="text-[var(--color-primary)] font-semibold decoration-2 underline-offset-4 hover:underline transition-all" {...props} />
                        ),
                        blockquote: ({ ...props }) => (
                          <blockquote
                            className="border-l-4 border-[var(--color-primary)] pl-8 py-4 mb-8 text-xl text-[var(--color-text)] font-medium italic bg-[var(--color-primary)]/5 rounded-r-2xl"
                            {...props}
                          />
                        ),
                        table: ({ ...props }) => (
                          <div className="overflow-x-auto mb-10 rounded-2xl border border-[var(--color-border)] shadow-sm">
                            <table className="w-full text-sm text-left border-collapse" {...props} />
                          </div>
                        ),
                        thead: ({ ...props }) => (
                          <thead className="bg-[var(--color-soft)] text-[var(--color-text)] uppercase text-xs tracking-wider font-bold" {...props} />
                        ),
                        tbody: ({ ...props }) => <tbody className="divide-y divide-[var(--color-border)]" {...props} />,
                        tr: ({ ...props }) => <tr className="hover:bg-[var(--color-border)]/20 transition-colors" {...props} />,
                        th: ({ ...props }) => <th className="px-6 py-4 font-bold" {...props} />,
                        td: ({ ...props }) => <td className="px-6 py-4 text-[var(--color-muted)]" {...props} />,
                        img: ({ src, alt, title }) => (
                          <motion.img 
                            src={src}
                            alt={alt}
                            title={title}
                            whileHover={{ scale: 1.01 }}
                            className="rounded-2xl shadow-2xl border border-[var(--color-border)] my-12" 
                          />
                        ),
                      }}
                    >
                      {markdown}
                    </ReactMarkdown>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Table of Contents (Right Sidebar) */}
          <aside className="w-64 p-8 sticky top-0 h-screen hidden xl:block border-l border-[var(--color-border)]">
            <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-widest mb-6 opacity-50">On this page</h3>
            <nav className="space-y-4">
              {toc.length > 0 ? (
                toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors leading-relaxed"
                  >
                    {item.text}
                  </a>
                ))
              ) : (
                <p className="text-xs text-[var(--color-muted)] italic">No sub-sections</p>
              )}
            </nav>
            <div className="mt-12 pt-8 border-t border-[var(--color-border)]">
              <div className="p-4 bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-primary)]/10">
                <p className="text-xs text-[var(--color-muted)] mb-2 font-medium">Need help?</p>
                <a href="#" className="text-sm font-bold text-[var(--color-primary)] hover:underline flex items-center gap-2">
                  Contact Support <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
