import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Load backend/.env (DATABASE_URL) into process.env for tests.
    env: loadEnv('', process.cwd(), ''),
  },
})
