import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base keeps the build working on GitHub Pages project sites
// (https://user.github.io/passvault/) and on a custom domain alike.
export default defineConfig({
  base: './',
  plugins: [react()],
})
