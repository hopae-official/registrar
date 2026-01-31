import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:18000',
      '/wrp': 'http://localhost:18000',
      '/status-management': 'http://localhost:18000',
    },
  },
})
