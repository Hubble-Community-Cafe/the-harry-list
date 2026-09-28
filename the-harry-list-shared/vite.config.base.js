// Shared Vite config for the public form and the admin. Plain JavaScript on purpose: Vite loads it
// through Node when it reads an app's vite.config.ts, and Node does not strip TypeScript inside
// node_modules (where the workspace link lives).
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

/**
 * @param {{ name: string, version: string }} app the app's package.json name (Sentry project) and version
 * @returns {import('vite').UserConfig}
 */
export function createViteConfig({ name, version }) {
  return {
    build: {
      sourcemap: true,
    },
    plugins: [
      react(),
      tailwindcss(),
      sentryVitePlugin({
        org: 'stichting-bar-potential',
        project: name,
        release: { name: version },
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        disable: !process.env.SENTRY_AUTH_TOKEN,
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
  }
}
