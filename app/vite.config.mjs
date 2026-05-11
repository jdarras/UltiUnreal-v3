import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  // très important : on dit que la racine Vite est le dossier "app"
  root: __dirname,
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        manualChunks(id) {
          const pathId = id.replace(/\\/g, '/');
          if (pathId.includes('node_modules')) {
            if (pathId.includes('react') || pathId.includes('scheduler')) return 'vendor-react';
            return 'vendor';
          }
          if (pathId.includes('/screens/postproduction/users')) return 'postprod-users';
          if (pathId.includes('/screens/postproduction/renderEditor')) return 'postprod-editor';
          if (pathId.includes('/screens/postproduction/renders')) return 'postprod-renders';
          if (pathId.includes('/screens/postproduction/catalogs')) return 'postprod-catalogs';
          if (pathId.includes('/screens/projects')) return 'screen-projects';
          if (pathId.includes('/screens/resources')) return 'screen-resources';
          if (pathId.includes('/screens/logs')) return 'screen-logs';
          return null;
        }
      }
    }
  }
})
