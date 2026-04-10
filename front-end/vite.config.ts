import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { firebaseMessagingSwPlugin } from './plugins/firebaseMessagingSw'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), firebaseMessagingSwPlugin()],
})
