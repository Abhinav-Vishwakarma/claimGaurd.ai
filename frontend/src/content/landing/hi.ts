import type { LandingContent } from "./landing.types";

export const hi: LandingContent = {
  nav: {
    label: "मुख्य नेविगेशन",
    mobileLabel: "मोबाइल नेविगेशन",
    menuLabel: "मेनू बदलें",
    items: {
      features: "सुविधाएं",
      process: "प्रक्रिया",
      trust: "भरोसा",
      contact: "संपर्क",
      docs: "दस्तावेज़",
      github: "गिटहब",
      demo: "वीडियो डेमो",
    },
  },
  theme: {
    label: "थीम",
    system: "सिस्टम",
    light: "लाइट",
    dark: "डार्क",
  },
  hero: {
    eyebrow: "AI क्लेम इंटेलिजेंस",
    title: "महंगे बनने से पहले जोखिम वाले क्लेम पहचानें।",
    subtitle:
      "ClaimGuard.ai बीमा टीमों को दस्तावेज जांचने, गड़बड़ियां पकड़ने और सही क्लेम तेजी से आगे बढ़ाने में मदद करता है।",
    primaryAction: "रिव्यू शुरू करें",
    secondaryAction: "प्रक्रिया देखें",
  },
  trust: {
    eyebrow: "सावधान टीमों के लिए",
    title: "हर क्लेम निर्णय के लिए साफ संकेत।",
    description: "एडजस्टर को ऐसा वर्कस्पेस दें जो जोखिम, सबूत की कमी और अगले कदम साफ दिखाए।",
    metrics: [
      { value: "4x", label: "तेज दस्तावेज छंटाई" },
      { value: "24/7", label: "ऑटोमेटेड intake checks" },
      { value: "98%", label: "सबूत traceability" },
    ],
  },
  features: {
    eyebrow: "प्लेटफॉर्म",
    title: "पहले क्लेम रिव्यू के लिए जरूरी सब कुछ।",
    description: "छोटे और समझ आने वाले मॉड्यूल टीम से reasoning छिपाए बिना साथ काम करते हैं।",
    items: [
      {
        title: "दस्तावेज जांच",
        description: "PDF, images और notes से facts निकालें और missing या conflicting details flag करें।",
      },
      {
        title: "Risk scoring",
        description: "Transparent reasons के साथ claim anomalies दिखाएं जिन्हें reviewer accept या challenge कर सके।",
      },
      {
        title: "Workflow handoff",
        description: "Investigation, approval या customer follow-up queues को साफ summaries भेजें।",
      },
    ],
  },
  process: {
    eyebrow: "वर्कफ्लो",
    title: "Intake से decision support तक तीन steps।",
    description: "Simple flow landing page को readable रखता है और product story से match करता है।",
    steps: [
      { title: "Upload", description: "Claim files collect करके evidence normalize करें।" },
      { title: "Analyze", description: "Facts, policy rules, timelines और risk markers compare करें।" },
      { title: "Resolve", description: "Team को clear summary और next recommended action दें।" },
    ],
  },
  cta: {
    title: "Claim review को शांत और साफ बनाना है?",
    description: "ClaimGuard.ai से high-risk files visible रखें और genuine customers को तेजी से आगे बढ़ाएं।",
    action: "हमसे बात करें",
  },
};
