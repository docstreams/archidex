import { config as baseConfig } from "./base.js";
import eslintPluginAstro from "eslint-plugin-astro";

/**
 * A custom ESLint configuration for libraries that use Astro.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const astroConfig = [
  ...baseConfig,
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      // override/add rules settings here, such as:
      // "astro/no-set-html-directive": "error"
    },
  },
  {
    ignores: [".astro", "public"],
  },
];
