import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 相対パスでビルドし、GitHub Pages などサブパス配信でも動くようにする
export default defineConfig({
  base: './',
  plugins: [react()],
})
