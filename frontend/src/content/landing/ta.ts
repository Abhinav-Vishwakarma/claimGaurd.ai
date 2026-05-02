import type { LandingContent } from "./landing.types";

export const ta: LandingContent = {
  nav: {
    label: "முதன்மை வழிசெலுத்தல்",
    mobileLabel: "மொபைல் வழிசெலுத்தல்",
    menuLabel: "மெனுவை மாற்று",
    items: {
      features: "அம்சங்கள்",
      process: "செயல்முறை",
      trust: "நம்பிக்கை",
      contact: "தொடர்பு",
      docs: "ஆவணங்கள்",
      github: "கிட்ஹப்",
      demo: "டெமோ",
    },
  },
  theme: {
    label: "தீம்",
    system: "System",
    light: "Light",
    dark: "Dark",
  },
  hero: {
    eyebrow: "AI claim intelligence",
    title: "செலவாகும் முன் ஆபத்தான claims ஐ கண்டறியுங்கள்.",
    subtitle:
      "ClaimGuard.ai insurance teams documents review செய்ய, inconsistencies கண்டுபிடிக்க, genuine claims வேகமாக நகர்த்த உதவுகிறது.",
    primaryAction: "Review தொடங்கு",
    secondaryAction: "செயல்முறை பார்க்க",
  },
  trust: {
    eyebrow: "கவனமான teams க்காக",
    title: "ஒவ்வொரு claim decision க்கும் தெளிவான signals.",
    description: "Risk, evidence gaps மற்றும் next actions தெளிவாக காட்டும் focused workspace ஐ adjusters க்கு கொடுக்கவும்.",
    metrics: [
      { value: "4x", label: "வேகமான document triage" },
      { value: "24/7", label: "Automated intake checks" },
      { value: "98%", label: "Evidence traceability" },
    ],
  },
  features: {
    eyebrow: "Platform",
    title: "First-pass claim review க்கு தேவையான அனைத்தும்.",
    description: "சிறிய explainable modules reasoning ஐ மறைக்காமல் ஒன்றாக வேலை செய்கின்றன.",
    items: [
      {
        title: "Document checks",
        description: "PDFs, images மற்றும் notes லிருந்து facts extract செய்து missing அல்லது conflicting details ஐ flag செய்யவும்.",
      },
      {
        title: "Risk scoring",
        description: "Reviewers accept அல்லது challenge செய்யக்கூடிய transparent reasons உடன் claim anomalies காட்டவும்.",
      },
      {
        title: "Workflow handoff",
        description: "Investigation, approval அல்லது customer follow-up queues க்கு clean summaries அனுப்பவும்.",
      },
    ],
  },
  process: {
    eyebrow: "Workflow",
    title: "Intake முதல் decision support வரை மூன்று steps.",
    description: "Simple flow landing page ஐ readable ஆக வைத்து product story உடன் பொருந்துகிறது.",
    steps: [
      { title: "Upload", description: "Claim files collect செய்து evidence normalize செய்யவும்." },
      { title: "Analyze", description: "Facts, policy rules, timelines மற்றும் risk markers compare செய்யவும்." },
      { title: "Resolve", description: "Team க்கு clear summary மற்றும் next recommended action கொடுக்கவும்." },
    ],
  },
  cta: {
    title: "Claim review ஐ அமைதியாகவும் தெளிவாகவும் மாற்றலாமா?",
    description: "ClaimGuard.ai மூலம் high-risk files visible ஆகவும் genuine customers வேகமாகவும் நகரட்டும்.",
    action: "எங்களை தொடர்பு கொள்ளுங்கள்",
  },
};
