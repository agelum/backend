import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      ...typescript.configs.recommended
        .rules,
      "@typescript-eslint/no-unused-vars":
        [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
      "@typescript-eslint/no-explicit-any":
        "warn",
      "@typescript-eslint/no-var-requires":
        "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "warn",
    },
  },
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "*.js",
      "*.mjs",
    ],
  },
];
