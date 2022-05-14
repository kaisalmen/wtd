import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../src/worker/TransferableWorkerTest4.ts'),
            name: 'TransferableWorkerTest4',
            fileName: (format) => `TransferableWorkerTest4-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'src/worker/generated',
        emptyOutDir: false
    }
});

export default config;
