module.exports = {
  extends: ["@commitlint/config-conventional"],
  formatter: "@commitlint/format",
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "deps", // Changes to dependencies
        "feat", // A new feature
        "fix", // A bug fix
        "docs", // Documentation only changes
        "style", // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
        "refactor", // A code change that neither fixes a bug nor adds a feature
        "perf", // A code change that improves performance
        "test", // Adding missing tests or correcting existing tests
        "build", // Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
        "cicd", // Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
        "chore", // Other changes that don't modify src or test files
        "revert", // Reverts a previous commit
        "wip", // Work in progress
        "release", // Release a new version
        "config", // Changes to configuration files
        "security", // Changes that address security issues,
        "content", // Changes to the content (blog, pages, etc.)
        "workspace", // Changes to the workspace
        "marketing", // Changes to marketing materials
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "setup", // Changes to the project setup
        "deps", // Changes to dependencies
        "config", // Changes to the configuration files
        "scripts", // Changes to the scripts
        "docs", // Changes to the documentation
        "lint", // Changes to the linter
        "workspace", // Changes to the workspace
        "cicd", // Changes to the CI
        "release", // Changes to the release
        "deploy", // Changes to the deployment
        "blog", // Changes to the blog
        "projects", // Changes to the projects
        "web", // Changes to the web app
        "app", // Changes to the dashboard app
        "api", // Changes to the API
        "backend", // Changes to the backend
        "db", // Changes to the database
        "legal", // Changes to the legal documents
        "analytics", // Changes to the analytics
      ],
    ],
  },
};
