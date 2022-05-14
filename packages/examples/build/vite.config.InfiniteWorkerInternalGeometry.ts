import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../src/worker/InfiniteWorkerInternalGeometry.ts'),
            name: 'InfiniteWorkerInternalGeometry',
            fileName: (format) => `InfiniteWorkerInternalGeometry-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'src/worker/generated',
        emptyOutDir: false
    }
});

export default config;
