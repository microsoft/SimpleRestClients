import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  input: './src/SimpleRestClients.ts',
  external: id => new RegExp(Object.keys(pkg.dependencies).join('|'), 'i').test(id),
  plugins: [
    resolve({ extensions: ['.ts'], jsnext: true,  main: true, browser: true }),
    babel({ extensions: ['.ts'], exclude: ['dist/**', 'node_modules/**'] }),
  ],
  output: [
    { file: pkg.main, format: 'cjs' },
    { file: pkg.module, format: 'es' },
  ],
};
