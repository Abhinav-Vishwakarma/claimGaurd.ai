import type { LandingContent } from "./landing.types";

export const mr: LandingContent = {
  nav: {
    label: "मुख्य नेव्हिगेशन",
    mobileLabel: "मोबाइल नेव्हिगेशन",
    menuLabel: "मेनू बदला",
    items: {
      features: "सुविधा",
      process: "प्रक्रिया",
      trust: "विश्वास",
      contact: "संपर्क",
      docs: "दस्तऐवज",
      github: "गिटहब",
      demo: "व्हिडिओ डेमो",
    },
  },
  theme: {
    label: "थीम",
    system: "सिस्टम",
    light: "लाईट",
    dark: "डार्क",
  },
  hero: {
    eyebrow: "AI claim intelligence",
    title: "जोखीम असलेले claims खर्चिक होण्याआधी ओळखा.",
    subtitle:
      "ClaimGuard.ai insurance teams ना documents review करायला, inconsistencies शोधायला आणि genuine claims जलद move करायला मदत करते.",
    primaryAction: "Review सुरू करा",
    secondaryAction: "प्रक्रिया पहा",
  },
  trust: {
    eyebrow: "काळजीपूर्वक काम करणाऱ्या teams साठी",
    title: "प्रत्येक claim decision साठी स्पष्ट signals.",
    description: "Adjusters ना risk, evidence gaps आणि next actions स्पष्ट करणारा focused workspace द्या.",
    metrics: [
      { value: "4x", label: "जलद document triage" },
      { value: "24/7", label: "Automated intake checks" },
      { value: "98%", label: "Evidence traceability" },
    ],
  },
  features: {
    eyebrow: "Platform",
    title: "First-pass claim review साठी लागणारे सर्व काही.",
    description: "लहान आणि explainable modules reasoning न लपवता एकत्र काम करतात.",
    items: [
      {
        title: "Document checks",
        description: "PDFs, images आणि notes मधून facts extract करा आणि missing किंवा conflicting details flag करा.",
      },
      {
        title: "Risk scoring",
        description: "Transparent reasons सह claim anomalies दाखवा ज्यावर reviewers decision घेऊ शकतात.",
      },
      {
        title: "Workflow handoff",
        description: "Investigation, approval किंवा customer follow-up queues मध्ये clean summaries पाठवा.",
      },
    ],
  },
  process: {
    eyebrow: "Workflow",
    title: "Intake पासून decision support पर्यंत तीन steps.",
    description: "Simple flow landing readable ठेवतो आणि product story clearly सांगतो.",
    steps: [
      { title: "Upload", description: "Claim files collect करून evidence normalize करा." },
      { title: "Analyze", description: "Facts, policy rules, timelines आणि risk markers compare करा." },
      { title: "Resolve", description: "Team ला clear summary आणि next recommended action द्या." },
    ],
  },
  cta: {
    title: "Claim review अधिक शांत आणि स्पष्ट करायचा आहे?",
    description: "ClaimGuard.ai वापरून high-risk files visible ठेवा आणि genuine customers पुढे न्या.",
    action: "आमच्याशी बोला",
  },
};
