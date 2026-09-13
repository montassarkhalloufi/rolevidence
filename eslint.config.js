import stylistic from "@stylistic/eslint-plugin";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import accessibility from "eslint-plugin-jsx-a11y";

const statementPadding = [
  "error",
  { blankLine: "always", prev: "import", next: "*" },
  { blankLine: "any", prev: "import", next: "import" },
  {
    blankLine: "always",
    prev: "*",
    next: ["function", "class", "export", "interface", "type"],
  },
  {
    blankLine: "always",
    prev: ["function", "class", "export", "interface", "type"],
    next: "*",
  },
  { blankLine: "always", prev: ["const", "let"], next: "*" },
  { blankLine: "always", prev: "*", next: "return" },
  { blankLine: "always", prev: "block-like", next: "*" },
];

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@stylistic": stylistic },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@stylistic/padding-line-between-statements": statementPadding,
      "@typescript-eslint/no-floating-promises": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-object-spread": "error",
      "object-shorthand": "error",
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-nested-ternary": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "max-lines-per-function": [
        "error",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      complexity: ["error", 10],
      "max-depth": ["error", 3],
    },
  },
  {
    files: ["src/client/**/*.tsx", "src/client/**/*.ts"],
    plugins: { "react-hooks": hooks, "jsx-a11y": accessibility },
    rules: {
      ...hooks.configs.recommended.rules,
      ...accessibility.configs.recommended.rules,
    },
  },
  {
    files: [
      "src/server/adapters/http/*-routes.ts",
      "src/server/infrastructure/offers/routes.ts",
      "src/server/infrastructure/http/app.ts",
    ],
    rules: {
      "@stylistic/padding-line-between-statements": [
        ...statementPadding,
        { blankLine: "always", prev: "expression", next: "*" },
      ],
    },
  },
  {
    files: ["tests/**", "scripts/**"],
    rules: {
      "max-lines": "off",
      complexity: "off",
      "max-depth": "off",
      "max-lines-per-function": "off",
    },
  },
);
