/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';
import typescript from '@rollup/plugin-typescript';

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
                //                main: path.resolve(__dirname, 'index.html'),
                helloworld: path.resolve(__dirname, 'index.html'),
                //              transferables: path.resolve(__dirname, 'examples/transferables/index.html'),
                //                threejsobj: path.resolve(__dirname, 'examples/threejsobj/index.html')
            },
            plugins: [
                typescript({
                    tsconfig: path.resolve(__dirname, './tsconfig.json'),
                    sourceMap: true
                })
            ]
        }
    },
    server: {
        port: 8080
    }
});
