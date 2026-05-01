import type { Locale } from "../../content/landing/landing.types";

export type LanguageOption = {
  code: Locale;
  label: string;
  nativeLabel: string;
};

export const languages: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
];
