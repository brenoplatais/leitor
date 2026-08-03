import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built app works at any path, including a GitHub Pages
  // project site served from https://<user>.github.io/<repo>/.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
  // pdfjs ships as an ESM worker; keep it out of pre-bundling so the
  // `?url` import resolves to a real file at build time.
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
