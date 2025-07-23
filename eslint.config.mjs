import { FlatCompat } from "@eslint/eslintrc";
import prettierPlugin from "eslint-plugin-prettier";
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
      "no-console": "off",

      /* TypeScript Rules */
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "off",

      /* Next.js Rules */
      "@next/next/no-img-element": "off",
    },
  }),
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "off",
    },
  },
  {
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
];
