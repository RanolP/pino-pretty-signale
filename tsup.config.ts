import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/runtime/index.ts'],
  format: ['cjs', 'esm'],
  bundle: false,
  clean: true,
  dts: true,
});
