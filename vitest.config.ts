import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'node',
    // Tests must never resolve or download a real embedding model.
    env: { SEARCH_EMBEDDINGS: 'off' },
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environmentMatchGlobs: [
      ['src/lib/components/**/*.test.ts', 'jsdom'],
    ],
  },
})
