import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

export default {
  input: 'walkquest/static/js/main.js', // Entry point of your application
  output: {
    file: 'static/js/bundle.js', // Output file
    format: 'iife', // Immediately Invoked Function Expression (for browser)
    sourcemap: true,
  },
  plugins: [
    resolve(), // Resolves node_modules dependencies
    commonjs(), // Converts CommonJS modules to ES modules
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**', // Exclude node_modules from Babel transformation
      presets: ['@babel/preset-env'], // Use preset-env for broader browser compatibility
    }),
  ],
};