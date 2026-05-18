import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import onlyWarnPlugin from 'eslint-plugin-only-warn'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import turboPlugin from 'eslint-plugin-turbo'

const reactFiles = [
  'apps/web/**/*.{js,jsx,ts,tsx}',
  'packages/plot/**/*.{js,jsx,ts,tsx}',
  'packages/ui/**/*.{js,jsx,ts,tsx}',
]

const typescriptFiles = ['**/*.{ts,tsx}']
const webFiles = ['apps/web/**/*.{js,jsx,ts,tsx}']

export default [
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/.*.js',
    ],
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  turboPlugin.configs['flat/recommended'],
  js.configs.recommended,
  {
    plugins: {
      'only-warn': onlyWarnPlugin,
    },
  },
  {
    files: typescriptFiles,
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        JSX: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: reactFiles,
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    files: webFiles,
    plugins: {
      '@next/next': nextPlugin,
    },
    settings: {
      next: {
        rootDir: 'apps/web',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['apps/web/next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
]
