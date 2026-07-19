import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      // The `@` alias used to be provided by @base44/vite-plugin. After removing
      // Base44, we provide it here so `@/...` imports keep resolving to src/.
      '@': path.resolve(__dirname, './src'),
    },
  },
});
