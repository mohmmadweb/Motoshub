import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base از محیط خوانده می‌شود تا بتوان همان بیلد را هم روی ریشه‌ی دامنه
// (demo.shub.ir) و هم زیرِ یک مسیر (docs.shub.ir/demo/) سرو کرد.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
})
