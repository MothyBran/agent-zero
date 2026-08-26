import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true // Das ist der magische Fix für den Railway-Block!
  },
  preview: {
    allowedHosts: true // Sicherheitshalber auch für den Preview-Modus
  }
});

