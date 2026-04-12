/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@react-three/drei/')) return 'react-three-drei';
          if (id.includes('node_modules/@react-three/fiber/')) return 'react-three-fiber';
          if (id.includes('node_modules/@react-three/postprocessing/')) return 'react-three-postprocessing';
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/postprocessing/')) return 'postprocessing';
          if (id.includes('node_modules/framer-motion/')) return 'framer';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
