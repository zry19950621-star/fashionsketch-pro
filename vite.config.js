import { env } from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = 'fashionsketch-pro'

export default defineConfig({
  base: env.GITHUB_ACTIONS ? `/${repositoryName}/` : '/',
  plugins: [react(), tailwindcss()],
})
