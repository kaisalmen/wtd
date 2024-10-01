import path from 'path';
import { defineConfig } from 'vite';

const config = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, '../src/worker/HelloWorldComChannelEndpointWorker.ts'),
            name: 'HelloWorldComChannelEndpointWorker',
            fileName: (format) => `HelloWorldComChannelEndpointWorker-${format}.js`,
            formats: ['es', 'iife']
        },
        outDir: 'src/worker/generated',
        emptyOutDir: false
    }
});

export default config;
