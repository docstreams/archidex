# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project: DocBuddy (landing page)

DocBuddy is a Ukrainian B2B SaaS by **Allmatics** (same studio as DocStreams.ai). It lets organisations upload internal documents and query them through an AI chat that always cites the source document. This repository contains **only the marketing landing page** — not the product itself.

The product is currently in **closed beta**. The landing page does not expose a sign-up flow; it collects applications via an **"Apply for beta" / "Подати заявку на бета-доступ"** form.

### Product positioning (what copy must communicate)

1. Organisation members upload documents (PDF, DOCX, etc.).
2. Other members search the corpus through an AI chat. Every answer includes references to the source documents and locations.
3. Enterprise-ready auth: **SAML, OAuth, LDAP**.
4. **GDPR**-compliant.
5. **Data handling promises** (the honest version — the product does use LLM/OCR vendors like Mistral, OpenAI, Google, Anthropic as subprocessors on zero-retention terms):
   - **Ми не використовуємо ваші дані для тренування моделей.**
   - **Ми не продаємо й не передаємо ваші дані третім сторонам** для реклами, аналітики чи будь-яких інших цілей.
   - **Доступ — лише в межах вашої організації.** Ніхто поза вашим tenant, включно з Allmatics, не читає документи без вашого запиту.
   - Subprocessors існують, але **не виносяться на лендінг**. Якщо клієнт питає — розкриваємо їх повністю у DPA / на запит.
6. Full **access logs and role/access management**.
7. "No bullshit" — answers come only from the customer's documents; no hallucinations, no generic web content.

### Target audience

Ukrainian SMB (малий та середній бізнес). Decision-makers are ops/IT leads, compliance officers, and founders who care about data sovereignty, audit trails, and onboarding speed.

## Voice, tone, and language

- **All user-facing copy is in Ukrainian.** No English anywhere on the page except brand names (DocBuddy, Allmatics, SAML, OAuth, LDAP, GDPR) and technical acronyms.
- Tone: confident, pragmatic, slightly warm. "No bullshit" is a product value — keep marketing language honest. Avoid hype phrases ("революція", "змінимо світ"). Prefer concrete verbs and specifics.
- Use the formal "ви" form when addressing the reader.
- Ukrainian typography: use lapki «…» for quotes, em-dash —, non-breaking spaces before units and short particles where it reads naturally.
- Do not invent product features that are not on the list above. If a section needs more copy, deepen existing points rather than inventing new ones.

## Design direction

- **Clean editorial with paper accents.** Off-white / cream background, serif display headings + humanist sans body, soft layered shadows (as if sheets sit on a page), subtle paper-texture accents — but **no heavy grain, no hand-drawn scribbles, no skeuomorphic "notebook" frames.** The page should feel like a calm editorial magazine, not a scrapbook. This softer direction was chosen so it can coexist with the 3D mascot without stylistic collision.
- **Mascot: Декс (Dex)** — a purple 3D baby octopus. Reference sheet at `docbuddy.jpg` in the repo root (hero pose, searching poses, found-answer, working-with-sources, emotions, avatar/icon circles). Must appear with intent in ≥2 places — hero, empty state of the product mock, and near the beta-apply form. Image assets live under `public/mascot/` as `dex-hero.webp`, `dex-working.webp`, `dex-form.webp`. Use existing renders; do not commission variants without asking.
- Mascot is the focal colour contrast against the calm editorial palette. Keep the rest of the page restrained so Декс doesn't compete with decorative elements.
- Accessibility is not optional: ≥4.5:1 contrast on body text despite the cream palette, visible focus states on the beta form, semantic HTML, Ukrainian `alt` text.

## Tech stack

- **Astro 6** (`astro@^6.1.8`), TypeScript, `pnpm`, Node `>=24.15.0`.
- Static-first. Avoid client JS unless a section genuinely needs it (e.g. the beta form's client-side validation). Prefer Astro components over framework islands.
- No CSS framework installed yet. If one is added, prefer Tailwind and match the paper aesthetic through custom theme tokens, not stock components.

### Commands

| Command        | Action                                      |
| :------------- | :------------------------------------------ |
| `pnpm install` | Install dependencies                        |
| `pnpm dev`     | Dev server at `localhost:4321`              |
| `pnpm build`   | Production build to `./dist/`               |
| `pnpm preview` | Preview the production build locally        |
| `pnpm astro …` | Astro CLI (e.g. `astro add`, `astro check`) |

### Project layout

```
public/            static assets (favicon, og images, mascot SVGs)
src/
  assets/          imported assets (processed by Astro)
  components/      Astro components (sections, form, mascot)
  layouts/         page layouts
  pages/           routes — currently index.astro
astro.config.mjs
```

Keep page sections as discrete components under `src/components/` (e.g. `Hero.astro`, `Features.astro`, `Security.astro`, `BetaApply.astro`, `Footer.astro`). The root page composes them.

## Working rules for Claude

- **Never add a direct sign-up / "Почати зараз" / pricing CTA.** The only conversion action is "Подати заявку на бета-доступ".
- **Do not add third-party analytics, trackers, chat widgets, or fonts from external CDNs without asking.** Self-host fonts. The product's promise is data-minimalism; the landing page should model that.
- **Never claim "no data shared with third parties" or any equivalent absolute.** The product uses Mistral (OCR), OpenAI (embeddings), and Gemini / OpenAI / Claude (chat) as subprocessors. Stick to the three promises in point 5 above. Do not list vendors on the landing page — disclose only on request / in DPA.
- When writing copy, prefer 1–2 concrete sentences over a paragraph of adjectives. Lead with the benefit, follow with the mechanism.
- When adding a new section, first check whether an existing component can be extended. Avoid creating parallel components that drift in style.
- Do not add features, abstractions, or configuration beyond what the current task requires.
- UI work is not done until it has been checked in a browser at mobile and desktop widths. If you cannot verify visually, say so explicitly.
- Images and SVGs: compress before committing. Provide Ukrainian `alt` text.
- Do not commit `.env` files or anything resembling secrets. The landing page should not need secrets beyond, at most, a form endpoint URL.

## Out of scope for this repo

- The actual DocBuddy product (upload, indexing, RAG chat, auth integrations).
- Customer portal, dashboards, billing.
- Blog/CMS (unless explicitly requested later).
