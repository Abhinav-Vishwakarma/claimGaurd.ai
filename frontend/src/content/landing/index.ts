import { en } from "./en";
import { hi } from "./hi";
import type { LandingContent, Locale } from "./landing.types";
import { mr } from "./mr";
import { ta } from "./ta";

export const landingContent: Record<Locale, LandingContent> = {
  en,
  hi,
  ta,
  mr,
};

export type { LandingContent, Locale };
