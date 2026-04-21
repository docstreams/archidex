import type { TranslationSchema } from "./uk";

export const en: TranslationSchema = {
  meta: {
    siteTitle: "Archidex — answers from your own documents",
    defaultDescription:
      "Enterprise AI search for Ukrainian teams. Upload your documents, ask questions — get answers with a citation and link to the source.",
    ogImageAlt:
      "Archidex — Dex the mascot helping to find an answer inside corporate documents",
  },
  header: {
    brand: "Archidex",
    apply: "Apply",
    switchToUk: "UA",
    switchToEn: "EN",
  },
  hero: {
    kicker: "For teams working with large document volumes",
    headline: "Smart search across corporate documents",
    subhead:
      "Find the right information across archives, folders, and documents accumulated over years of company work. Archidex answers from your own files and shows the source.",
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
    questionText:
      "What are the terms for early termination of the contract with Viter?",
    answerLabel: "Dex found this for you",
    answerTitle: "Early termination terms in the contract",
    answerText:
      "The contract can be terminated with 30 days' notice without penalty.",
    sourceLabel: "Source",
    sourceText: "Contract No. 2026-014 with Viter LLC · p. 3",
    mascotAlt:
      "Dex, Archidex's purple octopus mascot, next to a company document archive",
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
        title: "Bring your company archive together",
        body: "Contracts, policies, onboarding docs, internal procedures, and working files collected over years — in one searchable place.",
      },
      {
        title: "Search through chat",
        body: "Ask questions in natural language, as you would with a colleague. No special commands, complex filters, or manual digging through folders.",
      },
      {
        title: "Verify every answer",
        body: "Archidex shows the source document, page, and exact passage so the answer can be checked immediately.",
      },
    ],
  },
  productMock: {
    heading: "What a verified answer looks like",
    subhead:
      "Archidex does not just answer. It shows the exact passage, the source document, and additional matches in the archive. No generalities from the internet — only your data.",
    question:
      "What are the conditions for early termination of the contract with «Viter»?",
    resultLabel: "Selected answer",
    answer:
      "The contract can be terminated with 30 days' notice without penalty. If we initiate termination, the remaining prepayment is refunded within 14 days.",
    excerptLabel: "Exact passage",
    excerpt:
      '"Either party may terminate this agreement early by written notice no later than 30 calendar days in advance. If termination is initiated by the Provider, the remaining prepayment is refunded to the Client within 14 calendar days."',
    citationLabel: "Source",
    citationDoc: "Contract No. 2026-014 with Viter LLC",
    citationPage: "p. 3",
    matchesLabel: "Also found in the archive",
    matches: [
      {
        title: "Appendix No. 2 to Contract No. 2026-014",
        body: "Covers the transfer of materials and the completion process after termination notice is submitted.",
        page: "p. 1",
      },
      {
        title: "Client contract operations policy",
        body: "Explains how the team handles early contract termination and client refunds in practice.",
        page: "p. 7",
      },
      {
        title: "SMB client contract template",
        body: "Includes the baseline clause about 30-day notice without penalty fees.",
        page: "p. 4",
      },
    ],
    emptyStateAlt: "Dex working on a laptop, surrounded by documents",
  },
  security: {
    heading: "Access control and clear rules for working with data",
    subhead:
      "Archidex is built for companies that need answer verification, access auditability, and control over internal knowledge.",
    promises: [
      {
        title: "We do not use your data to train models",
        body: "Your documents never enter training datasets — ours or any model vendor's.",
      },
      {
        title: "We do not sell or share your data with third parties",
        body: "Your documents are not used for advertising, analytics, or any unrelated third-party purpose.",
      },
      {
        title: "Access stays within your organisation",
        body: "No one outside your tenant — Allmatics included — reads documents unless you request and approve a support scenario.",
      },
    ],
    capabilitiesLabel: "Enterprise-ready",
    capabilities: [
      "SAML",
      "OAuth",
      "LDAP",
      "GDPR",
      "full access logs",
      "role-based permissions",
    ],
  },
  forWhom: {
    heading: "Who this is primarily for",
    audiences: [
      {
        title: "Operations leaders",
        body: "To help teams spend less time searching through folders, archives, and email threads, and more time acting on answers.",
      },
      {
        title: "HR and frontline teams",
        body: "To help new employees ramp up faster, while giving the team a pocket corporate knowledge base for finding the right instructions, policies, and answers at any moment.",
      },
      {
        title: "Compliance, legal, finance",
        body: "To find the right clause in contracts, policies, and regulations quickly, and verify the source immediately.",
      },
    ],
  },
  allmatics: {
    heading: "Archidex is built by Allmatics",
    body: "We build products at the intersection of documents and AI. DocStreams.ai — our earlier document automation product — means Archidex comes from real work with enterprise documents, not from AI hype alone.",
    linkLabel: "allmatics.com",
    linkHref: "https://allmatics.com",
  },
  faq: {
    heading: "Frequently asked questions",
    items: [
      {
        q: "Who can access the documents?",
        a: "Only users inside your organisation according to their roles and permissions. No one outside your tenant — Allmatics included — reads documents unless you explicitly request it.",
      },
      {
        q: "Do you support SAML, OAuth, and LDAP?",
        a: "Yes. We support enterprise authentication and centralised access scenarios. Integration details are aligned during onboarding.",
      },
      {
        q: "Are you GDPR-compliant?",
        a: "Yes. We operate with GDPR requirements in mind, including data deletion and export on request.",
      },
      {
        q: "How do we export or delete our data?",
        a: "At any time. On request, we deliver a full export and deletion within 30 days, in line with GDPR.",
      },
      {
        q: "Can we self-host it on our own infrastructure?",
        a: "We discuss this case-by-case for Enterprise scenarios. Mention it in your application if it matters.",
      },
      {
        q: "Which document formats do you support?",
        a: "PDF, DOCX, XLSX, PPTX, PNG, JPG, TXT, and most common office formats. The full list is clarified during onboarding.",
      },
      {
        q: "How much does Archidex cost?",
        a: "The beta is free for participants. Commercial plans will be announced after general availability.",
      },
    ],
  },
  betaApply: {
    heading: "Apply for beta access",
    subhead:
      "Apply if you want to join the first wave of teams and influence the product before public launch.",
    fitLabel: "Archidex is opening access for teams that care about",
    fitItems: [
      "answers with source references rather than generic AI output",
      "access control for internal knowledge and clear rules for handling data",
      "faster onboarding and less manual searching through folders, archives, and email threads",
    ],
    responseTime:
      "We review every application and reply within a few working days.",
    labels: {
      name: "Your name",
      email: "Work email",
      company: "Company",
      role: "Role",
      size: "Team size",
      useCase: "Which documents or processes do you need answers from?",
    },
    placeholders: {
      name: "Taras Shevchenko",
      email: "taras@company.com",
      company: "Kobzar LLC",
      role: "Head of Operations",
      useCase:
        "For example: contracts, policies, onboarding, internal procedures.",
    },
    sizeOptions: ["1–10", "11–50", "51–200", "200+"],
    submit: "Send application",
    sending: "Sending…",
    success: {
      heading: "Thanks — application received",
      body: "We'll review your use case and get in touch soon.",
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
    tagline: "Enterprise AI search across internal documents.",
    copyright: "Archidex by",
    allmatics: "Allmatics",
    privacy: "Privacy policy",
    terms: "Terms of use",
    contact: "hello@allmatics.com",
  },
};
