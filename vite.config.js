import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig(({ mode }) => {
  return {
    base: './',
    build: {
      rollupOptions: {
        input: {
          'index': resolve(__dirname, 'index.html'),
          'swiper': resolve(__dirname, 'components/swiper/demo/index.html'),
        }
      },
      minify: false, // iOS 9 等低版本加载压缩代码报脚本异常
    },
    esbuild: {},
    server: {
      host: '0.0.0.0',
      port: 8080,
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
    },
    plugins: [
      legacy({
        targets: ['iOS >= 9'],
      }),
      tsconfigPaths(),
    ],
  };
});
