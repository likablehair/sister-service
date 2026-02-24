import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `sister-service.${format === 'cjs' ? 'cjs' : 'js'}`,
    },
    //target: 'node20',
    rollupOptions: {
      external: [...builtinModules, /^node:/],
      input: {
        main: resolve(__dirname, 'src/main.ts'),
      },
    },
    sourcemap: true,
    outDir: 'dist',
  },
  resolve: {
    alias: {
      src: resolve('src/'),
      public: resolve(__dirname, '/public/'),
    },
  },
  plugins: [
    dts({
      entryRoot: resolve(__dirname, 'src'),
      // make plugin emit an index.d.ts in dist and add a types entry
      insertTypesEntry: true,
      outDir: 'dist',
      rollupTypes: true,
    }),
  ],
});
