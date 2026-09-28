// Shared Vitest config for the public form, the admin and this package. Plain JavaScript for the
// same reason as vite.config.base.js. The test setup (jsdom stubs, localStorage, fetch) lives in
// this package, so every app runs its tests against the same environment.
import { fileURLToPath } from 'node:url'

/** @type {import('vitest/config').UserConfig} */
export const vitestConfig = {
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      // json-summary feeds the coverage table CI writes to the job summary.
      reporter: ['text', 'json', 'json-summary', 'html'],
      // Count every source file, not only the ones some test imports: an untested file must lower
      // the percentage instead of silently not existing.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/main.tsx',
      ],
    },
  },
}
