import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Open the dev server directly on the login page to avoid auto-landing on a logged-in home
    open: '/login',
  },
})
