// vite.config.js
import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';

export default defineConfig({
    base: "/demo",
    plugins: [glsl()]
});
