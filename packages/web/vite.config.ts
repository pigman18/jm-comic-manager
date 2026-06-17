import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath, URL} from 'node:url'
import Components from 'unplugin-vue-components/vite'
import {NaiveUiResolver} from 'unplugin-vue-components/resolvers'

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:47310/',
                ws: true,
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/api/, 'api'),
            },
            '/file': {
                target: 'http://127.0.0.1:47310/',
                ws: true,
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/file/, 'file'),
            },
        },
    },
    plugins: [
        vue(),
        Components({resolvers: [NaiveUiResolver()], dts: false}),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
