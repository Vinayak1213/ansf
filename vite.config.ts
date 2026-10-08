import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Bind to every network interface so teammates on the same Wi-Fi/LAN can open
  // the dev server at http://<your-LAN-IP>:5173 (not just localhost).
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  // Pre-bundle every runtime dep at startup so Vite doesn't discover them
  // mid-load and re-optimize (which causes a transient 504 on first paint).
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'motion/react',
      'recharts',
      '@number-flow/react',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-scroll-area',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
    ],
  },
})
