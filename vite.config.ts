import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['src/deck/**/*.ts', 'src/presenter/timer.ts'],
    },
  },
});
