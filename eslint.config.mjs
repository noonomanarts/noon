import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-alert": "error",
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "alert",
          message: "Use AppFeedbackProvider toast feedback instead of browser alerts.",
        },
        {
          object: "window",
          property: "confirm",
          message: "Use useAppFeedback().confirm() instead of browser confirm dialogs.",
        },
        {
          object: "window",
          property: "prompt",
          message: "Do not use browser prompt dialogs.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Script files that need CommonJS
    "scripts/**",
  ]),
]);

export default eslintConfig;
