import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../src/worker/InfiniteWorkerExternalGeometry.ts'),
            name: 'InfiniteWorkerExternalGeometry',
            fileName: (format) => `InfiniteWorkerExternalGeometry-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'src/worker/generated',
        emptyOutDir: false
    }
});

export default config;
