import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.spec.ts',
        '**/test-*.ts',
        '**/*.config.ts',
        '**/main.ts',
        '**/main.server.ts',
        '**/server.ts',
        '**/polyfills.ts',
        '**/environments/**'
      ]
    }
  }
});
