/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Testerna körs i svensk tidszon så datumlogiken (midnatt, sommartid) testas som i produktion.
process.env.TZ = 'Europe/Stockholm'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
