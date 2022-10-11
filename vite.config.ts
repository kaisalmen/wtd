/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

// Config Hints:
// https://vitejs.dev/guide/build.html#multi-page-app

export default defineConfig(({ command }) => {
    console.log(`Running: ${command}`);
    const dirExamples = path.resolve(__dirname, 'pacakges/examples');
    return {
        build: {
            target: ['es2020'],
            rollupOptions: {
                input: {
                    main: path.resolve(dirExamples, 'index.html'),
                    helloWorld: path.resolve(dirExamples, 'helloWorld.html'),
                    helloWorldStandard: path.resolve(dirExamples, 'helloWorldStandard.html'),
                    helloWorldWorkerTask: path.resolve(dirExamples, 'helloWorldWorkerTask.html'),
                    transferables: path.resolve(dirExamples, 'transferables.html'),
                    threejs: path.resolve(dirExamples, 'threejs.html'),
                    potentiallyInfinite: path.resolve(dirExamples, 'potentially_infinite.html')
                },
                output: {
                    esModule: true
                }
            },
            minify: false,
            assetsInlineLimit: 128,
            outDir: path.resolve(dirExamples, 'preview'),
            emptyOutDir: true,
        },
        server: {
            port: 8080,
            host: '0.0.0.0'
        },
        optimizeDeps: {
            esbuildOptions: {
                target: 'es2020'
            }
        }
    };
});
