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
            external: [
                'three',
                'three/examples/jsm/controls/TrackballControls'
            ],
            input: {
                main: path.resolve(__dirname, 'index.html'),
                helloworld: path.resolve(__dirname, 'helloworld.html'),
                transferables: path.resolve(__dirname, 'transferables.html'),
                potentiallyInfinite: path.resolve(__dirname, 'potentially_infinite.html')
            },
            plugins: [
            ]
        }
    },
    server: {
        port: 8080,
        host: '0.0.0.0'
    }
});
