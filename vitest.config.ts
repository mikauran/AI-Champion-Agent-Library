import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'node',
    // Full-suite runs are CPU-starved (160+ files in parallel); polling helpers and
    // jsdom/axe tests exceeded the 5s default under load. Generous limits, no assertion changes.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Tests must never resolve or download a real embedding model.
    env: { SEARCH_EMBEDDINGS: 'off' },
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environmentMatchGlobs: [
      ['src/lib/components/**/*.test.ts', 'jsdom'],
    ],
  },
})
