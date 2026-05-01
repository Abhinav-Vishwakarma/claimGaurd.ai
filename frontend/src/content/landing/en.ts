import type { LandingContent } from "./landing.types";

export const en: LandingContent = {
  nav: {
    label: "Primary navigation",
    mobileLabel: "Mobile navigation",
    menuLabel: "Toggle menu",
    items: {
      features: "Features",
      process: "Process",
      trust: "Trust",
      contact: "Contact",
    },
  },
  theme: {
    label: "Theme",
    system: "System",
    light: "Light",
    dark: "Dark",
  },
  hero: {
    eyebrow: "AI claim intelligence",
    title: "Detect risky claims before they become costly.",
    subtitle:
      "ClaimGuard.ai helps insurance teams review documents, spot inconsistencies, and move genuine claims faster.",
    primaryAction: "Start review",
    secondaryAction: "See process",
  },
  trust: {
    eyebrow: "Built for careful teams",
    title: "Clear signals for every claim decision.",
    description: "Give adjusters a focused workspace that explains risk, evidence gaps, and next best actions.",
    metrics: [
      { value: "4x", label: "Faster document triage" },
      { value: "24/7", label: "Automated intake checks" },
      { value: "98%", label: "Evidence traceability" },
    ],
  },
  features: {
    eyebrow: "Platform",
    title: "Everything needed for first-pass claim review.",
    description: "Small, explainable modules work together without hiding the reasoning from your team.",
    items: [
      {
        title: "Document checks",
        description: "Extract facts from PDFs, images, and notes while flagging missing or conflicting details.",
      },
      {
        title: "Risk scoring",
        description: "Surface claim anomalies with transparent reasons that reviewers can accept or challenge.",
      },
      {
        title: "Workflow handoff",
        description: "Send clean summaries to investigation, approval, or customer follow-up queues.",
      },
    ],
  },
  process: {
    eyebrow: "Workflow",
    title: "From intake to decision support in three steps.",
    description: "A simple flow keeps the landing experience readable while matching the product story.",
    steps: [
      { title: "Upload", description: "Collect claim files and normalize the evidence." },
      { title: "Analyze", description: "Compare facts, policy rules, timelines, and risk markers." },
      { title: "Resolve", description: "Give teams a clear summary with the next recommended action." },
    ],
  },
  cta: {
    title: "Ready to make claim review calmer?",
    description: "Use ClaimGuard.ai to keep high-risk files visible and genuine customers moving.",
    action: "Talk to us",
  },
};
