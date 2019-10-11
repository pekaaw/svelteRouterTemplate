import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/main.js',
    output: {
        sourcemap: true,
        format: 'es',
        name: 'app',
        dir: 'public/module'
    },
    plugins: [
        svelte({
            // enable run-time checks when not in production
            dev: !production,
            // we'll extract any component CSS into a separate file for better performance
            css: css => {
                css.write('/public/bundle.css');
            }
        }),
        resolve({
            browser: true,
            dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
        }),
        commonjs(),

        // Watch the `public` directory and refresh the browser on changes when not in production
        !production && livereload('public'),

        // minify in production
        production && terser()
    ],
    watch: {
        clearScreen: false
    }
};
