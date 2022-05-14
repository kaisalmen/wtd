import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../src/worker/TransferableWorkerTest2.ts'),
            name: 'TransferableWorkerTest2',
            fileName: (format) => `TransferableWorkerTest2-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'src/worker/generated',
        emptyOutDir: false
    }
});

export default config;
