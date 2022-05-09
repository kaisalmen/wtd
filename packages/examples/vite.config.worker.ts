import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/worker/HelloWorldWorker.ts'),
            name: 'HelloWorldWorkerStandard',
            fileName: () => 'HelloWorldWorkerStandard.js',
            formats: ['iife']
        },
        outDir: 'src/worker/volatile',
        emptyOutDir: false
    }
});

export default config;
