import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  root: __dirname,
  test: {
    environment: 'jsdom',
    include: ['apps/**/mobile/**/__tests__/**/*.{test,spec}.{js,jsx}'],
    setupFiles: [path.resolve(__dirname, 'vitest.setup.js')],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      // Webpack aliases from vendor/framework7-react/build/webpack.config.js
      '@common': path.resolve(__dirname, 'apps/common/mobile'),
      '@common-icons': path.resolve(__dirname, 'apps/common/mobile/resources/icons/common'),
      '@common-ios-icons': path.resolve(__dirname, 'apps/common/mobile/resources/icons/ios'),
      '@common-android-icons': path.resolve(__dirname, 'apps/common/mobile/resources/icons/android'),

      // Stub framework7 — not installed here, and not needed for logic tests.
      // When component tests need real F7, add it to package.json.
      'framework7-react': path.resolve(__dirname, 'vitest.stubs/framework7-react.js'),
      'framework7': path.resolve(__dirname, 'vitest.stubs/framework7.js'),
    },
  },
  plugins: [
    // Stub SVG imports (svg-sprite-loader returns { id } in webpack)
    {
      name: 'stub-svg',
      transform(code, id) {
        if (id.endsWith('.svg')) {
          const name = path.basename(id, '.svg');
          return { code: `export default { id: '${name}' };` };
        }
      },
    },
  ],
};
