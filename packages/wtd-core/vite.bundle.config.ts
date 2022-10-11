import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'wtd-core',
            fileName: () => 'index.js',
            formats: ['es']
        },
        outDir: 'bundle',
        emptyOutDir: false,
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
                name: 'wtd-core',
                exports: 'named',
                sourcemap: false,
                assetFileNames: (assetInfo) => {
                    return `assets/${assetInfo.name}`;
                }
            }
        }
    }
});
