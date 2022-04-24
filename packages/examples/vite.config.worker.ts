import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/worker/helloWorldWorker.ts'),
            name: 'helloWorldWorkerStandard',
            fileName: () => 'helloWorldWorkerStandard.js',
            formats: ['iife']
        },
        outDir: 'src/worker/volatile',
        emptyOutDir: false
    }
});

export default config;
