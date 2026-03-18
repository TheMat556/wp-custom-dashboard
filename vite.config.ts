import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],

  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    manifest: true,
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.tsx'),
        outside: resolve(__dirname, 'src/outside.css'),
      },

      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        manualChunks(id) {
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/scheduler')) {
            return 'react'
          }
          
          if (id.includes('@ant-design/icons')) {
            return 'antd-icons'
          }
          
          if (id.includes('node_modules/antd') || 
              id.includes('@ant-design/') ||
              id.includes('node_modules/rc-')) {
            return 'antd'
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
})