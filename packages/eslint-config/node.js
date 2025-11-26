/**
 * Node.js ESLint configuration for LINE Chat Summarizer
 */
module.exports = {
  extends: ['./index.js'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'no-process-exit': 'off',
  },
};
