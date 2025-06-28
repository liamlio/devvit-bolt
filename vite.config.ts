import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../webroot',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        createGameForm: 'src/client/createGameForm/index.html',
      },
    },
  },
  server: {
    port: 3000,
  },
});