import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom)[\\/]/,
              priority: 30,
            },
            {
              name: 'fontawesome-icons',
              test: /node_modules[\\/]@fortawesome[\\/]free-solid-svg-icons[\\/]/,
              priority: 20,
              maxSize: 450 * 1024,
            },
            {
              name: 'ui-vendor',
              test: /node_modules[\\/](@dnd-kit|react-toastify|@fortawesome[\\/](fontawesome-svg-core|react-fontawesome))[\\/]/,
              priority: 10,
              maxSize: 450 * 1024,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
}) 
