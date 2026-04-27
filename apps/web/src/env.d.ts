// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../worker-configuration.d.ts" />

import type { PostHog } from "posthog-js";

declare namespace Cloudflare {
  interface Env {
    NOTION_TOKEN: string;
    NOTION_BETA_DB_ID: string;
    SLACK_WEBHOOK_URL: string;
  }
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}

declare global {
  interface Window {
    posthog?: PostHog;
  }
}

export {};
