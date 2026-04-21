/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
export default {
  printWidth: 80,
  semi: true,
  singleQuote: false,
  bracketSpacing: true,
  bracketSameLine: false,
  jsxSingleQuote: false,
  trailingComma: "all",
  arrowParens: "always",
  tabWidth: 2,
  objectWrap: "preserve",
  plugins: ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  overrides: [
    {
      files: ["*.astro"],
      options: {
        parser: "astro",
      },
    },
  ],
};
