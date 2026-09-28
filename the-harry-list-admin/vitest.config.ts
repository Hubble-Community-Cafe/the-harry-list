import { defineConfig } from 'vitest/config'
import { vitestConfig } from 'the-harry-list-shared/vitest.config.base.js'

// Shared test setup (jsdom, stubs, coverage): the-harry-list-shared/vitest.config.base.js
export default defineConfig(vitestConfig)
