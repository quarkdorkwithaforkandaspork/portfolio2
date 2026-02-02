import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        new: path.resolve(__dirname, 'new.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname)
    }
  }
});
