import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';

const pkg = require('./package.json');
const banner = `/*!
 * Name: ${pkg.name}
 * Description: ${pkg.description}
 * Author: ${pkg.author}
 * Contributors: ${pkg.contributors.map(c => c.name).join(',')}
 * Version: v${pkg.version}
 */
`;

const globals = {
  '@galacean/effects': 'ge',
};
const external = ['@galacean/effects'];
const plugins = [
  typescript({ tsconfig: './tsconfig.bundle.json' }),
  resolve(),
  commonjs(),
];

export default (commandLineArgs) => {
  return [{
    input: {
      index: 'components/index.ts',
      swiper: 'components/swiper/index.ts',
    },
    output: {
      dir: 'es',
      chunkFileNames: 'chunk-[name].mjs',
      entryFileNames: '[name]/index.mjs',
      format: 'es',
      banner,
      globals,
    },
    treeshake: true,
    external,
    plugins,
  }, {
    input: 'components/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      banner,
      globals,
      sourcemap: true,
    },
    external,
    plugins,
  }, {
    input: 'components/index.ts',
    output: {
      file: pkg.brower,
      format: 'umd',
      name: 'ge.components',
      banner,
      globals,
      sourcemap: true,
    },
    external,
    plugins: plugins.concat(
      terser()
    ),
  }];
};
