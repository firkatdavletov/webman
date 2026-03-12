import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'https://api.aiymbrand.ru',
                changeOrigin: true,
            },
        },
    },
});
