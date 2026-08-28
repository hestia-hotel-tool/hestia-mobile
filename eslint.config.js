// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      'supabase/**', // Deno runtime, not the app TS project
      'scripts/**', // Node CJS seed/util scripts
      '.agents/**', // vendored skill packages
      'data/**',
      'assets/**',
      'credentials/**',
      '*.config.js',
      '*.config.mjs',
      'nativewind-env.d.ts',
      'declarations.d.ts',
    ],
  },
  {
    // `eslint-plugin-react-hooks` v6 ships the React-Compiler-aware rule set,
    // which flags a large amount of pre-existing code (conditional hooks in
    // RoomDetailScreen, setState-in-effect, manual memoization, ref access
    // during render, ...). These are worth addressing but are tracked as a
    // separate cleanup — keep them visible as warnings so `npm run lint` can
    // gate new work without a blocking backlog.
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/static-components': 'warn',
      'react/display-name': 'warn',
      'import/no-unresolved': ['error', { ignore: ['^https?://'] }],
    },
  },
]);
