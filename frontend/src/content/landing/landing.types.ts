export type Locale = "en" | "hi" | "ta" | "mr";

export type ThemeMode = "system" | "light" | "dark";

export type NavLabelKey = "features" | "process" | "trust" | "contact" | "docs" | "github" | "demo";

type TextBlock = {
  title: string;
  description: string;
};

export type LandingContent = {
  nav: {
    label: string;
    mobileLabel: string;
    menuLabel: string;
    items: Record<NavLabelKey, string>;
  };
  theme: Record<ThemeMode, string> & {
    label: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryAction: string;
    secondaryAction: string;
  };
  trust: TextBlock & {
    eyebrow: string;
    metrics: Array<{
      value: string;
      label: string;
    }>;
  };
  features: TextBlock & {
    eyebrow: string;
    items: TextBlock[];
  };
  process: TextBlock & {
    eyebrow: string;
    steps: TextBlock[];
  };
  cta: TextBlock & {
    action: string;
  };
};
