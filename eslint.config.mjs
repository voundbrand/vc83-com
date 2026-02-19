import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".kiro/**",
      "tests/**",
      "convex/_generated/**",
    ],
  },
  {
    rules: {
      // Temporarily downgrade 'any' type from error to warning for build
      // TODO: Fix all 'any' types to proper types
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow broad function types in legacy code paths
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Prefer-const to warning to avoid blocking builds on legacy vars
      "prefer-const": "warn",
      // Allow require-style imports where needed (e.g., Convex runtime helpers)
      "@typescript-eslint/no-require-imports": "off",
      "import/no-commonjs": "off",
      // Soften ts-comment enforcement while legacy code remains
      "@typescript-eslint/ban-ts-comment": "warn",
      // Disable unescaped entities error - these are cosmetic
      "react/no-unescaped-entities": "off",
    },
  },
  {
    files: ["scripts/i18n/i18n-audit-allowlist.ts"],
    rules: {
      // Keep exceptions reviewable; no placeholder warning comments in allowlist policy.
      "no-warning-comments": [
        "error",
        { terms: ["todo", "fixme", "hack", "xxx"], location: "anywhere" },
      ],
    },
  },
];

export default eslintConfig;
