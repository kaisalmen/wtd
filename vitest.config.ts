import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default defineConfig(configEnv => mergeConfig(
    viteConfig(configEnv),
    defineConfig({
        test: {
        }
    })
));
