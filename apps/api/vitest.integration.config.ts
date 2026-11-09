import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig, type Plugin } from 'vitest/config';

dotenv.config({ override: true });

function keepCompiledApi(): Plugin {
  const dist = path.resolve(import.meta.dirname, 'dist').replaceAll('\\', '/').toLowerCase();
  return {
    name: 'keep-compiled-api',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) {
        return null;
      }
      const importerPath = importer.split('?')[0]?.replaceAll('\\', '/').toLowerCase() ?? '';
      if (!importerPath.startsWith(dist)) {
        return null;
      }
      return path.resolve(path.dirname(importer.split('?')[0] ?? importer), source);
    },
  };
}

export default defineConfig({
  plugins: [keepCompiledApi()],
  test: {
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
