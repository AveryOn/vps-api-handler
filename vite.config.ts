import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    ssr: resolve(__dirname, 'src/index.ts'),
    outDir: 'dist',
    minify: true,          // сжатие через esbuild
    rollupOptions: {
      external: [
        'express',
        'cors',
        'helmet',
        'express-rate-limit',
      ],
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs'
      }
    }
  }
})
