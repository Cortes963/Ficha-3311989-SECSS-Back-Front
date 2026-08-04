// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Le indica al compilador que "@" equivale a la carpeta "src"
      '@': path.resolve(__dirname, './src'),
    },
  },
});