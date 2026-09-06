import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  preview: {
    allowedHosts: [
      "gcsc-store-production.up.railway.app",
      "gcsc.store",
      "www.gcsc.store",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the always-eager core libs in one cacheable vendor chunk.
        // recharts / @proton stay out so they remain in their lazy chunks.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-router') ||
              id.includes('/react-dom/') ||
              id.includes('/react/') ||
              id.includes('/scheduler/') ||
              id.includes('framer-motion') ||
              id.includes('lucide-react')
            ) {
              return 'react-vendor';
            }
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
