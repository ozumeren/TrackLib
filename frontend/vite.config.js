import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- YENİ EKLENEN BÖLÜM ---
  server: {
    proxy: {
      // '/api' ile başlayan tüm istekleri backend'e yönlendir
      '/api': {
        target: 'http://localhost:3000', // Backend sunucumuzun adresi
        changeOrigin: true,
      }
    }
  }
  // --- YENİ BÖLÜM SONU ---
})
