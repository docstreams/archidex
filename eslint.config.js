import eslintPluginAstro from "eslint-plugin-astro";

export default [
  // add more generic rule sets here, such as:
  // js.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      // override/add rules settings here, such as:
      // "astro/no-set-html-directive": "error"
    },
  },
  {
    ignores: [
      ".astro",
      ".claude",
      ".playwright-mcp",
      ".wrangler",
      "dist",
      "node_modules",
      "public",
      "commitlint.config.js",
      "lint-staged.config.js",
      "pnpm-lock.yaml",
      "worker-configuration.d.ts",
    ],
  },
];
