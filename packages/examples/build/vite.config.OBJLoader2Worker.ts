import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../src/worker/volatile/OBJLoader2Worker.js'),
            name: 'OBJLoader2Worker',
            fileName: (format) => `OBJLoader2Worker-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'src/worker/generated',
        emptyOutDir: false
    }
});

export default config;
