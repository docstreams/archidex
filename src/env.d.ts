/// <reference path="../.astro/types.d.ts" />
/// <reference path="../worker-configuration.d.ts" />

declare namespace Cloudflare {
  interface Env {
    NOTION_TOKEN: string;
    NOTION_BETA_DB_ID: string;
  }
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
