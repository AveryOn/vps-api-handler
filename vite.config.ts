import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/services/scripts/*',
          dest: 'scripts',
        },
        {
          src: 'src/deploy/*',
          dest: 'deploy',
        },
      ],
    }),
  ],
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
