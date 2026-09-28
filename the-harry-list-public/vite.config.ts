import { defineConfig } from 'vite'
import { createViteConfig } from 'the-harry-list-shared/vite.config.base.js'
import { name, version } from './package.json'

// Shared build setup (React, Tailwind, Sentry source maps): the-harry-list-shared/vite.config.base.js
export default defineConfig(createViteConfig({ name, version }))
