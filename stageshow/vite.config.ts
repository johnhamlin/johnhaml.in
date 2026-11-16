import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  // Keep the site's Tailwind PostCSS config out of the scene.
  css: { postcss: {} },
  server: { host: '127.0.0.1', fs: { allow: ['..'] } },
  resolve: { dedupe: ['react', 'react-dom'] },
})
