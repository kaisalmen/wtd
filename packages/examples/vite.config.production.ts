/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

// Config Hints:
// https://vitejs.dev/guide/build.html#multi-page-app

export default defineConfig(({ command }) => {
    console.log(`Running: ${command}`);
    return {
        build: {
            target: ['es2022'],
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    helloWorld: path.resolve(__dirname, 'helloWorld.html'),
                    workerCom: path.resolve(__dirname, 'workerCom.html'),
                    helloWorldWorkerTask: path.resolve(__dirname, 'helloWorldWorkerTask.html'),
                    transferables: path.resolve(__dirname, 'transferables.html'),
                    threejs: path.resolve(__dirname, 'threejs.html'),
                    potentiallyInfinite: path.resolve(__dirname, 'potentially_infinite.html')
                },
                output: {
                    esModule: true
                }
            },
            minify: false,
            assetsInlineLimit: 128,
            outDir: path.resolve(__dirname, 'preview'),
            emptyOutDir: true,
        },
        server: {
            port: 8080,
            host: '0.0.0.0'
        },
        optimizeDeps: {
            esbuildOptions: {
                target: 'es2022'
            }
        }
    };
});

