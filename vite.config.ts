/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

// Config Hints:
// https://vitejs.dev/guide/build.html#multi-page-app

export default defineConfig(({ command }) => {
    console.log(`Running: ${command}`);
    return {
        build: {
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    helloWorld: path.resolve(__dirname, 'packages/examples/helloWorld.html'),
                    helloWorldStandard: path.resolve(__dirname, 'packages/examples/helloWorldStandard.html'),
                    helloWorldWorkerTask: path.resolve(__dirname, 'packages/examples/helloWorldWorkerTask.html'),
                    transferables: path.resolve(__dirname, 'packages/examples/transferables.html'),
                    threejs: path.resolve(__dirname, 'packages/examples/threejs.html'),
                    potentiallyInfinite: path.resolve(__dirname, 'packages/examples/potentially_infinite.html')
                }
            }
        },
        server: {
            port: 8080,
            host: '0.0.0.0'
        },
    };
});
