import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'path';

const appRoot = resolve(__dirname);

export default defineConfig({
  plugins: [
    angular({
      tsconfig: resolve(appRoot, 'tsconfig.spec.json'),
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(appRoot, 'src/test-setup.ts')],
    include: [resolve(appRoot, 'src/**/*.spec.ts')],
    root: appRoot,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.spec.ts',
        '**/test-*.ts',
        '**/*.config.ts',
        '**/main.ts',
        '**/polyfills.ts',
        '**/environments/**',
      ],
    },
  },
});
