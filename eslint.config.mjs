import jest from "eslint-plugin-jest";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import { importX } from "eslint-plugin-import-x";
import * as eslintImportResolverTypescript from "eslint-import-resolver-typescript";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import react from "eslint-plugin-react";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import json from "eslint-plugin-json";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import html from "eslint-plugin-html";
import tseslint from "typescript-eslint";
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys";
import {
  configs as airbnbConfigs,
  plugins as airbnbPlugins,
} from "eslint-config-airbnb-extended";
import { rules as prettierConfigRules } from "eslint-config-prettier";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default defineConfig([
  globalIgnores([
    "**/*/coverage/*",
    "**/.build",
    "**/node_modules",
    "**/dist",
    "**/test-results",
    "**/playwright-report*",
    "eslint.config.mjs",
    "containers/frontend/build/**",
  ]),

  //imports
  importX.flatConfigs.recommended,
  { rules: { ...airbnbPlugins.importX.rules } },

  // js
  js.configs.recommended,
  airbnbPlugins.stylistic,
  airbnbConfigs.base.recommended,

  // ts
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  airbnbConfigs.base.typescript,
  airbnbPlugins.typescriptEslint,

  {
    ignores: ["**/*.json"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ["**/*.json"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // JS/JSX files do not have TypeScript type information — disable type-checked rules
  {
    files: ["**/*.{js,jsx,cjs,mjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    settings: {
      "import-x/resolver-next": [
        eslintImportResolverTypescript.createTypeScriptImportResolver({
          project: [
            "containers/*/tsconfig.json",
            "lambdas/*/tsconfig.json",
            "tests/playwright/tsconfig.json",
            "tests/test-team/tsconfig.json",
            "utils/*/tsconfig.json",
          ],
        }),
      ],
    },
  },

  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        2,
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-definitions": 0,
    },
  },

  // unicorn
  unicorn.configs["recommended"],
  {
    rules: {
      "unicorn/prevent-abbreviations": 0,
      "unicorn/filename-case": [
        2,
        {
          case: "kebabCase",
          ignore: [".tsx"],
        },
      ],
      "unicorn/no-null": 0,
      "unicorn/prefer-module": 0,
      "unicorn/import-style": [
        2,
        {
          styles: {
            path: {
              named: true,
            },
          },
        },
      ],
    },
  },

  // react
  react.configs.flat.recommended,
  airbnbConfigs.react.recommended,
  airbnbConfigs.react.typescript,
  airbnbPlugins.react,
  airbnbPlugins.reactHooks,
  airbnbPlugins.reactA11y,

  // jest
  jest.configs["flat/recommended"],

  // prettier
  prettierRecommended,
  { rules: { ...prettierConfigRules, "prettier/prettier": 2 } },

  // jsxA11y
  {
    files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // security
  security.configs.recommended,

  // sonar
  sonarjs.configs.recommended,

  // html
  {
    files: ["**/*.html"],
    plugins: { html },
  },

  // Next.js
  // ...compat.config({
  //   extends: ['next', 'next/core-web-vitals', 'next/typescript'],
  //   settings: {
  //     next: {
  //       rootDir: 'frontend',
  //     },
  //   },
  //   rules: {
  //     // needed because next lint rules look for a pages directory
  //     '@next/next/no-html-link-for-pages': 0,
  //   },
  // }),

  // json
  {
    files: ["**/*.json"],
    ...json.configs["recommended"],
  },

  // destructure sorting
  {
    name: "eslint-plugin-sort-destructure-keys",
    plugins: {
      "sort-destructure-keys": sortDestructureKeys,
    },
    rules: {
      "sort-destructure-keys/sort-destructure-keys": 2,
    },
  },

  // imports
  {
    rules: {
      "sort-imports": [
        2,
        {
          ignoreDeclarationSort: true,
        },
      ],
      "import-x/extensions": 0,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "import-x/no-unresolved": 0, // trust the typescript compiler to catch unresolved imports
    },
  },
  {
    files: ["tests/test-team/**"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        2,
        {
          devDependencies: true,
        },
      ],
    },
  },
  {
    files: ["**/utils/**", "tests/test-team/**"],
    rules: {
      "import-x/prefer-default-export": 0,
    },
  },

  {
    // AWS Lambda runtime requires a named `handler` export — default export is not valid here.
    files: ["lambdas/*/src/index.ts"],
    rules: {
      "import-x/prefer-default-export": 0,
    },
  },
  {
    plugins: {
      "no-relative-import-paths": noRelativeImportPaths,
    },
    rules: {
      "no-relative-import-paths/no-relative-import-paths": 2,
    },
  },
  {
    files: ["scripts/**"],
    rules: {
      "import-x/no-extraneous-dependencies": [
        "error",
        { devDependencies: true },
      ],
    },
  },

  // misc rule overrides
  {
    rules: {
      "no-restricted-syntax": 0,
      "no-underscore-dangle": 0,
      "no-await-in-loop": 0,
      "no-plusplus": [2, { allowForLoopAfterthoughts: true }],
      "unicorn/prefer-top-level-await": 0, // top level await is not available in commonjs
    },
  },

  // TODO: CCM-12345 — CCM-12345 — Remove these overrides as the frontend is brought into alignment with repo standards.
  // The frontend is a ported CRA (create-react-app) codebase using plain JS with React conventions
  // (PascalCase component filenames, relative imports, window globals) that pre-date this repo's
  // lint rules. Each disabled rule is a candidate for a dedicated follow-up alignment ticket.
  {
    files: ["containers/frontend/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        // CRA/webpack injects process.env at build time
        process: "readonly",
      },
    },
    rules: {
      // --- React / JSX ---
      // React 17+ automatic JSX transform — no need to import React
      "react/react-in-jsx-scope": 0,
      // CRA projects use .js extension for React components (not .jsx)
      "react/jsx-filename-extension": 0,
      // Plain JS has no TypeScript prop types; add PropTypes definitions as part of alignment
      "react/prop-types": 0,
      // Accessibility — add explicit type attributes to buttons as part of alignment
      "react/button-has-type": 0,
      // Array index keys — use stable identifiers as part of alignment
      "react/no-array-index-key": 0,

      // --- Unicorn ---
      // CRA uses PascalCase for component filenames — rename as part of alignment
      "unicorn/filename-case": 0,
      // CRA code references window directly — migrate to globalThis as part of alignment
      "unicorn/prefer-global-this": 0,
      // Numeric separators in test fixture literals — add as part of alignment
      "unicorn/numeric-separators-style": 0,
      // Helper functions scoped inside components — hoist to module scope as part of alignment
      "unicorn/consistent-function-scoping": 0,

      // --- Import style ---
      // CRA uses relative imports throughout — migrate to absolute paths as part of alignment
      "no-relative-import-paths/no-relative-import-paths": 0,
      // Import ordering — align with repo conventions as part of alignment
      "sort-imports": 0,
      "import-x/order": 0,

      // --- Sonar / general ---
      // Nested ternaries are common in JSX render logic — refactor as part of alignment
      "sonarjs/no-nested-conditional": 0,
      // console usage is intentional in this frontend (dev feedback, error boundaries)
      "no-console": 0,

      // --- Imports ---
      // Small utility modules may intentionally have a single named export
      "import-x/prefer-default-export": 0,
      "import-x/no-cycle": 2,

      // --- Code style / patterns ---
      // axios interceptors must mutate config — no clean alternative
      "no-param-reassign": 0,
      // Mixed return patterns in JSX render functions are common in legacy code
      "consistent-return": 0,
      // Legacy forEach patterns — migrate to for…of as part of alignment
      "unicorn/no-array-for-each": 0,
      // TODO: CCM-12345 — replace Promise.reject() patterns with throw in async context
      "unicorn/no-useless-promise-resolve-reject": 0,
      // Catch parameter named 'err' is the historic convention in this codebase
      "unicorn/catch-error-name": 0,
      // switch-case braces will be enforced once the code is migrated to TS
      "unicorn/switch-case-braces": 0,
      // Known-safe object property access patterns throughout the codebase
      "security/detect-object-injection": 0,
      // Commented-out code will be cleaned up as part of alignment
      "sonarjs/no-commented-code": 0,

      // --- Accessibility (a11y) ---
      // TODO: CCM-12345 — fix label associations (htmlFor / aria-labelledby) as part of alignment
      "jsx-a11y/label-has-associated-control": 0,

      // --- React hooks ---
      // TODO: CCM-12345 — fix synchronous setState inside useEffect as part of alignment
      "react-hooks/set-state-in-effect": 0,
      // TODO: CCM-12345 — wrap context value objects in useMemo as part of alignment
      "react/jsx-no-constructed-context-values": 0,

      // --- Dependencies ---
      // TODO: CCM-12345 — audit package.json deps (nhsuk-frontend, @testing-library) as part of alignment
      "import-x/no-extraneous-dependencies": 0,
    },
  },
]);
