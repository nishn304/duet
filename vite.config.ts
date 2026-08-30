import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages serves project sites under /<repo>/. The Pages workflow sets
// GITHUB_PAGES=true; every other target (Vercel, Netlify, local) serves at root.
const base = process.env.GITHUB_PAGES ? '/duet/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
