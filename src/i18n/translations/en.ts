import type { TranslationSchema } from "./uk";

export const en: TranslationSchema = {
  meta: {
    siteTitle: "DocBuddy — answers from your own documents",
    defaultDescription:
      "Enterprise AI search for Ukrainian teams. Upload your documents, ask questions — get answers with a citation and link to the source.",
    ogImageAlt:
      "DocBuddy — Dex the mascot helping to find an answer inside corporate documents",
  },
  header: {
    brand: "DocBuddy",
    apply: "Apply",
    switchToUk: "UA",
    switchToEn: "EN",
  },
  hero: {
    kicker: "For teams working with large document volumes",
    headline: "Smart search across corporate documents",
    subhead:
      "Find the right information across archives, folders, and documents accumulated over years of company work. DocBuddy answers from your own files and shows the source.",
    cta: "Apply for beta access",
    proofLabel: "Key benefits",
    proofPoints: [
      "Thousands of documents",
      "Answers with sources",
      "Access limited to your organisation",
    ],
    panelEyebrow: "Company knowledge archive",
    archiveLabel: "Example archive sections",
    archiveItems: [
      {
        title: "Contracts and addenda",
        meta: "2019-2026 · PDF, DOCX",
        badge: "486 files",
      },
      {
        title: "Policies, procedures, compliance",
        meta: "Internal rules and templates",
        badge: "214 files",
      },
      {
        title: "Onboarding, HR, knowledge base",
        meta: "Instructions, FAQs, processes",
        badge: "548 files",
      },
    ],
    answerLabel: "Dex found this for you",
    answerTitle: "Early termination terms in the contract",
    answerText:
      "The contract can be terminated with 30 days' notice without penalty.",
    sourceLabel: "Source",
    sourceText: "Contract No. 2026-014 with Viter LLC · p. 3",
    mascotAlt:
      "Dex, DocBuddy's purple octopus mascot, next to a company document archive",
  },
  problem: {
    heading: "Sound familiar?",
    pains: [
      "The policy is written down — but nobody remembers where.",
      "A new hire spends two weeks asking the same questions.",
      "A client contract is buried in someone's email from three years ago.",
    ],
  },
  howItWorks: {
    heading: "How it works",
    steps: [
      {
        title: "Upload your documents",
        body: "PDF, Word, spreadsheets, text files. DocBuddy indexes them within your organisation only.",
      },
      {
        title: "Ask in chat",
        body: "Use natural language — as you would with a colleague. No special commands, no clunky UI.",
      },
      {
        title: "Get an answer with a source",
        body: "Every answer includes a link to the exact document and the exact place in it. Verify in one click.",
      },
    ],
  },
  productMock: {
    heading: "What an answer looks like",
    subhead:
      "Every answer comes with a quote and a link to the page. No generalities from the internet — only your data.",
    question:
      "What are the conditions for early termination of the contract with «Viter»?",
    answer:
      "The contract can be terminated with 30 days' notice without penalty. If we initiate termination, the remaining prepayment is refunded within 14 days.",
    citationLabel: "Source",
    citationDoc: "Contract No. 2026-014 with Viter LLC",
    citationPage: "p. 3",
    emptyStateAlt: "Dex working on a laptop, surrounded by documents",
  },
  security: {
    heading: "Your data stays under your control",
    subhead: "We build DocBuddy without compromising on trust.",
    promises: [
      {
        title: "We do not train models on your data",
        body: "Your documents never enter any training set — ours or anyone else's.",
      },
      {
        title: "We do not sell or share your data",
        body: "No transfers for advertising, analytics, or third-party products. Full stop.",
      },
      {
        title: "Access stays within your organisation",
        body: "No one outside your tenant — Allmatics included — reads your documents without your request.",
      },
    ],
    technicalLine:
      "SAML · OAuth · LDAP · GDPR · full access logs · role-based permissions",
  },
  forWhom: {
    heading: "Who this is for",
    audiences: [
      {
        title: "Legal and finance teams",
        body: "Instant search across contracts, policies, and reports. Less scrolling — more analysis.",
      },
      {
        title: "Operations and HR",
        body: "Onboarding without tribal knowledge. Answers to recurring questions in seconds.",
      },
      {
        title: "Founders and executives",
        body: "Company knowledge lives in a system, not in a few people's heads. With audit and access control.",
      },
    ],
  },
  allmatics: {
    heading: "Built by the team behind DocStreams.ai",
    body: "DocBuddy is built by Allmatics — a Ukrainian studio specialising in documents and AI. DocStreams.ai is our product for automating document flows in HR, Oil & Gas, and other industries.",
    linkLabel: "allmatics.com",
    linkHref: "https://allmatics.com",
  },
  faq: {
    heading: "Frequently asked questions",
    items: [
      {
        q: "Which document formats do you support?",
        a: "PDF, DOCX, TXT, and most common office formats. The full list is clarified during onboarding.",
      },
      {
        q: "How much does DocBuddy cost?",
        a: "The beta is free for participants. Commercial plans will be announced after general availability.",
      },
      {
        q: "Can we self-host it on our own infrastructure?",
        a: "We discuss this case-by-case for Enterprise scenarios. Mention it in your application if it matters.",
      },
      {
        q: "When will general availability open?",
        a: "We plan to widen access in 2026. Beta participants get it first.",
      },
      {
        q: "How do we export or delete our data?",
        a: "At any time. On request, we deliver a full export and deletion within 30 days, in line with GDPR.",
      },
    ],
  },
  betaApply: {
    heading: "Apply for beta access",
    subhead:
      "Tell us briefly about your company and the problem you want to solve. We get back within a few working days.",
    labels: {
      name: "Your name",
      email: "Work email",
      company: "Company",
      role: "Role",
      size: "Team size",
      useCase: "What problem are you trying to solve?",
    },
    placeholders: {
      name: "Taras Shevchenko",
      email: "taras@company.com",
      company: "Kobzar LLC",
      role: "Head of Operations",
      useCase: "Describe it in two sentences.",
    },
    sizeOptions: ["1–10", "11–50", "51–200", "200+"],
    submit: "Send application",
    sending: "Sending…",
    success: {
      heading: "Thanks — application received",
      body: "We'll get in touch soon.",
    },
    error:
      "We couldn't submit your application. Try again, or email us at hello@allmatics.com.",
    fieldErrors: {
      name: "Please enter your name.",
      email: "Please enter a valid work email.",
      company: "Please enter your company name.",
      size: "Please select a team size.",
    },
    mascotAlt: "Dex holding up a card with a checkmark — application received",
    privacy:
      "By applying you agree to Allmatics processing your data in line with our privacy policy.",
  },
  footer: {
    tagline: "Enterprise AI search for Ukrainian teams.",
    copyright: "DocBuddy by",
    allmatics: "Allmatics",
    privacy: "Privacy policy",
    terms: "Terms of use",
    contact: "hello@allmatics.com",
  },
};
