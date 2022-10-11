import esbuild, { BuildOptions } from 'esbuild';
import fg from 'fast-glob';
import { copy  } from 'esbuild-plugin-copy';
import deepmerge from 'deepmerge';

const files = await fg('src/**/*.ts');

const options: BuildOptions = {
  bundle: true,
  tsconfig: 'tsconfig.json',
  entryPoints: files,
  platform: 'node',
  external: ['./node_modules/*'],
  plugins: [
    copy(),
    {
      name: 'externalize',
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          if (args.importer) {
            return {
              external: true,
            };
          }
        });
      },
    },
  ],
};

await Promise.all([
  // ESM
  esbuild.build(
    deepmerge(options, {
      outdir: 'dist/esm',
      format: 'esm',
    }),
  ),

  // CJS
  esbuild.build(
    deepmerge(options, {
      outdir: 'dist/cjs',
      format: 'cjs',
      outExtension: {
        '.js': '.cjs',
      },
      plugins: [
        {
          name: 'change-import-extension',
          setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
              if (args.importer) {
                return {
                  path: args.path.replace(/\.js$/, '.cjs'),
                  external: true,
                };
              }
            });
          },
        },
      ],
    }),
  ),
]);
