import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

export default [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      /* Base Rules */
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-console": "off",

      /* TypeScript Rules */
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "warn",

      /* Next.js Rules */
      "@next/next/no-img-element": "off",

      /* React Rules */
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Files and directories to ignore during linting
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "dist/**",
      "build/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.cjs",
    ],
  },

  prettierConfig,
];
