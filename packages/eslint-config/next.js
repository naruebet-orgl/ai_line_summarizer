/**
 * Next.js ESLint configuration for LINE Chat Summarizer
 */
module.exports = {
  extends: [
    './index.js',
    'next/core-web-vitals',
  ],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/no-unescaped-entities': 'off',
  },
};
