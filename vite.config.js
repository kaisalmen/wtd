/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

// Config Hints:
// https://vitejs.dev/guide/build.html#multi-page-app

export default defineConfig({
    plugins: [
    ],
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                helloComlink: path.resolve(__dirname, '/examples/helloPlayground/index.html')
            }
        },
        lib: {
            entry: path.resolve(__dirname, 'src/index.js'),
            name: 'three-wtm',
            fileName: (format) => `three-wtm.${format}.js`
        }
    }
});
