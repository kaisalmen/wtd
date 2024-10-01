import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command }) => {
    console.log(`Running: ${command}`);
    return {
        build: {
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    helloWorldWorkerTask: path.resolve(__dirname, 'packages/examples/helloWorldWorkerTask.html'),
                    helloWorldComChannelEndpoint: path.resolve(__dirname, 'packages/examples/helloWorldComChannelEndpoint.html'),
                    helloWorldWorkerTaskDirector: path.resolve(__dirname, 'packages/examples/helloWorldWorkerTaskDirector.html'),
                    transferables: path.resolve(__dirname, 'packages/examples/transferables.html'),
                    threejs: path.resolve(__dirname, 'packages/examples/threejs.html'),
                    potentiallyInfinite: path.resolve(__dirname, 'packages/examples/potentially_infinite.html')
                }
            }
        },
        server: {
            port: 23001,
            host: '0.0.0.0'
        },
    };
});
