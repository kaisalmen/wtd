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
                helloworld: path.resolve(__dirname, 'helloworld/index.html'),
                transferables: path.resolve(__dirname, 'transferables/index.html'),
                //                threejsobj: path.resolve(__dirname, 'examples/threejsobj/index.html')
            },
            plugins: [
            ]
        }
    },
    server: {
        port: 8080
    }
});
