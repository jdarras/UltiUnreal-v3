import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

// Numéro de version affiché dans l'interface : champ « version » de package.json
// (« 2026.3.0 » s'affiche « 2026.3 »).
const packageVersion = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')).version
const appVersion = String(packageVersion || '').replace(/\.0$/, '')

export default defineConfig({
  // très important : on dit que la racine Vite est le dossier "app"
  root: __dirname,
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
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
