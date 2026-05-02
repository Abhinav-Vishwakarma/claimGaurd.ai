import type { NavLabelKey } from "../../content/landing/landing.types";

export type NavItem = {
  id: string;
  href: string;
  labelKey: NavLabelKey;
};

export const navItems: NavItem[] = [
  { id: "features", href: "#features", labelKey: "features" },
  { id: "process", href: "#process", labelKey: "process" },
  { id: "trust", href: "#trust", labelKey: "trust" },
  { id: "contact", href: "#contact", labelKey: "contact" },
  { id: "docs", href: "/docs", labelKey: "docs" },
  { id: "github", href: "https://github.com/Abhinav-Vishwakarma/claimGaurd.ai", labelKey: "github" },
  { id: "demo", href: "https://drive.google.com/drive/folders/1U4MPWTt2XwG_GVt-ged9X79N3NHw85C_?usp=sharing", labelKey: "demo" },
];
