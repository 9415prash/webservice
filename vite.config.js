import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Relative asset paths so the built site works on any static host or sub-folder
  // (GitHub Pages repo URL, Netlify, a plain file server, or opening dist/ directly).
  base: './',
})
