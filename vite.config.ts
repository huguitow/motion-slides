import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths: the build works from any sub-path (e.g. GitHub Pages at /motion-deck/).
  base: './',
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['src/deck/**/*.ts', 'src/presenter/timer.ts'],
    },
  },
});
