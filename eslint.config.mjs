import { FlatCompat } from "@eslint/eslintrc";
import prettierConfig from "eslint-config-prettier/flat";
import globals from "globals";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
    rules: {
      /* Base Rules */
      "no-undef": "error",
      "no-unused-vars": "off",
      "no-console": "warn",

      /* TypeScript Rules */
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "warn",

      /* Next.js Rules */
      "@next/next/no-img-element": "off",
    },
  }),
  {
    // Language options for ESLint
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    // Files and directories to ignore during linting
    ignores: [
      "node_modules",
      ".next/",
      "out/",
      "public/",
      "dist",
      "build",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.cjs",
    ],
  },
  // Prettier configuration is now applied
  ...prettierConfig,
];
