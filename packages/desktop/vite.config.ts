import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-root-md',
      resolveId(id) {
        if (id === 'readme.md' || id === 'changelog.md') return id
      },
      load(id) {
        if (id === 'readme.md') {
          const p = path.resolve(__dirname, '../../README.md')
          const c = fs.readFileSync(p, 'utf-8')
          return `export default ${JSON.stringify(c)}`
        }
        if (id === 'changelog.md') {
          const p = path.resolve(__dirname, '../../CHANGELOG.md')
          const c = fs.readFileSync(p, 'utf-8')
          return `export default ${JSON.stringify(c)}`
        }
      },
    },
  ],
  base: './',
  server: { fs: { allow: ['..'] } },
})
