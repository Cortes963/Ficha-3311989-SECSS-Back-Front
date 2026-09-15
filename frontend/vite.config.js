// vite.config.js
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Le indica al compilador que "@" equivale a la carpeta "src"
      '@': resolve(__dirname, './src'),
    },
  },
});