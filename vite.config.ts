import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  
  // Base URL for deployment
  // Set to '/browser-battle-bench/' for GitHub Pages
  // Set to '/' for Vercel custom domain or local development
  base: process.env.VITE_BASE_URL || '/',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  build: {
    target: 'esnext', // Required for WebGPU support
    chunkSizeWarningLimit: 2000, // WebLLM is large, suppress warnings
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'vendor-vue': ['vue', 'pinia'],
          'vendor-llm': ['@mlc-ai/web-llm'],
        },
      },
    },
    // Improve build performance
    sourcemap: mode === 'development',
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', 'pinia', '@mlc-ai/web-llm'],
  },
  
  // Development server options
  server: {
    port: 5173,
    host: true, // Allow access from network
    open: true, // Auto-open browser
  },
  
  // Preview server options
  preview: {
    port: 4173,
    host: true,
  },

  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
}))
