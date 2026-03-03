import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/admin': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/catalog/categories': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/catalog/products': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/auth': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
});
