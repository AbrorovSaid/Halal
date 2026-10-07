import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Разрешаем доступ с любого хоста (идеально для Render, Vercel и т.д.)
      allowedHosts: true, 
      // Если хотите указать строго конкретный хост, используйте вместо true:
      // allowedHosts: ['halal-9tnm.onrender.com'],
    },
    preview: {
      // Разрешаем доступ с любого хоста для режима preview (сборки)
      allowedHosts: true,
      // Или строго: allowedHosts: ['halal-9tnm.onrender.com'],
    }
  };
});
