/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
    build: {
        emptyOutDir: true,
        rollupOptions: {
            external: ['three'],
            plugins: [
                typescript({
                    target: 'ESNext',
                    rootDir: path.resolve('./src'),
                    declaration: true,
                    declarationDir: path.resolve('./dist'),
                    exclude: path.resolve('./node_modules/**'),
                    allowSyntheticDefaultImports: true,
                })
            ]
        },
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'three-wtm',
            fileName: 'index.js',
            formats: ['es']
        }
    }
});
