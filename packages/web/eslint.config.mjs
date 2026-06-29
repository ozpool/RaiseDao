import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Web-local flat config: the browser/JSX surface the root Node config doesn't
 *  cover. Next's own lint is disabled in next.config; this is the single gate. */
export default tseslint.config(
  // Never lint build output. `.next.broken` is a stale renamed build dir that can
  // linger locally; ignore any `.next*` variant so generated code never gates us.
  { ignores: ['**/.next*/**', '**/out/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  prettier,
);
