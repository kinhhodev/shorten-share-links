import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load env từ file .env ở repo root (dùng chung FE/BE)
  envDir: '../..',
});
