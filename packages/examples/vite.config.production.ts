import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command }) => {
    console.log(`Running: ${command}`);
    return {
        build: {
            target: ['es2022'],
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    helloWorldWorkerTask: path.resolve(__dirname, 'helloWorldWorkerTask.html'),
                    helloWorldComChannelEndpoint: path.resolve(__dirname, 'helloWorldComChannelEndpoint.html'),
                    helloWorldWorkerTaskDirector: path.resolve(__dirname, 'helloWorldWorkerTaskDirector.html'),
                    workerCom: path.resolve(__dirname, 'workerCom.html'),
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
            outDir: path.resolve(__dirname, 'production'),
            emptyOutDir: true,
        },
        base: 'https://kaisalmen.github.io/wtd/',
        optimizeDeps: {
            esbuildOptions: {
                target: 'es2022'
            }
        }
    };
});

