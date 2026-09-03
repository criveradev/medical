import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3000';

// El dev server corre en el puerto 4200 (ya permitido por el CORS del backend)
// y proxea /api y /socket.io al backend en :3000 para evitar CORS en desarrollo.
export default defineConfig(({ mode }) => {
  const apiUrl = process.env.VITE_API_URL || '';
  if (mode === 'production' && process.env.VERCEL && !apiUrl) {
    throw new Error('VITE_API_URL es obligatoria para un despliegue de producción en Vercel');
  }
  if (mode === 'production' && apiUrl && !apiUrl.startsWith('https://')) {
    throw new Error('VITE_API_URL debe usar HTTPS en producción');
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 4200,
      allowedHosts: ['frontend'],
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/socket.io': { target: proxyTarget, ws: true },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      clearMocks: true,
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
