/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'wtd-three-ext',
            fileName: () => 'index.js',
            formats: ['es']
        },
        outDir: 'bundle',
        emptyOutDir: false,
        rollupOptions: {
            external: ['three'],
            output: {
                inlineDynamicImports: true,
                name: 'wtd-three-ext',
                exports: 'named',
                sourcemap: false,
                assetFileNames: (assetInfo) => {
                    return `assets/${assetInfo.name}`;
                }
            }
        },

    }
});
