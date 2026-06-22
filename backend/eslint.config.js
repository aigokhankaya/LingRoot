const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        __DEV__: 'readonly',
      },
    },
    rules: {
      'no-console': 'warn',
    },
  },
  {
    // k6 load-test scenarios are ES modules run by the k6 runtime, not Node CommonJS.
    files: ['tests/load/scenarios/**/*.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    ignores: [
      'scripts/**',
      'node_modules/**',
      'logs/**',
      'uploads/**',
      'public/**',
      // One-off migration/test/debug scripts at project root
      'db_check_temp.js',
      'run_*.js',
      'check_*.js',
      'check-*.js',
      'test_*.js',
      'test-*.js',
      'create-admin.js',
      'get_plan_details.js',
      'update_google_product_ids_short.js',
      'debug-*.js',
      // Utility scripts (not production)
      'utils/content/gutendexToDb.js',
    ],
  },
]);
