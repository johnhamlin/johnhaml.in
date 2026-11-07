import eslint from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'public/**', '.idea/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,
  {
    files: ['postcss.config.js', 'prettier.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    files: ['tailwind.config.mjs'],
    languageOptions: {
      globals: {
        require: 'readonly',
      },
    },
    rules: {
      // Tailwind 3's typography plugin is CJS. This config file already loads it with require().
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/env.d.ts'],
    rules: {
      // Astro generates this reference; the official env.d.ts template uses a triple-slash path.
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['**/*.astro/*.js', '**/*.astro/*.ts', '*.astro/*.js', '*.astro/*.ts'],
    rules: {
      // Inline scripts keep `var` (theme boot) and `arguments` (gtag snippet) on purpose.
      'no-var': 'off',
      'prefer-rest-params': 'off',
    },
  },
);
