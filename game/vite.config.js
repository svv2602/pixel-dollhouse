import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// После сборки генерирует dist/sw.js: список всех файлов сборки + хэш версии.
// Service worker кэширует всё при установке -> игра работает офлайн.
function serviceWorker() {
  let outDir;
  return {
    name: 'pixel-house-sw',
    apply: 'build',
    configResolved(cfg) { outDir = cfg.build.outDir; },
    closeBundle() {
      const files = [];
      const walk = (d) => readdirSync(d).forEach((f) => {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f !== 'sw.js') files.push(p);
      });
      walk(outDir);
      const template = readFileSync('sw-template.js', 'utf8');
      const hash = createHash('sha256').update(template); // правка шаблона тоже = новая версия
      for (const f of files.sort()) hash.update(f).update(readFileSync(f));
      const version = hash.digest('hex').slice(0, 12);
      const urls = ['./', ...files.map((f) => './' + relative(outDir, f).split('\\').join('/'))];
      const sw = template
        .replace('__VERSION__', version)
        .replace('__FILES__', JSON.stringify(urls));
      writeFileSync(join(outDir, 'sw.js'), sw);
      console.log(`sw.js: ${urls.length} files, version ${version}`);
    },
  };
}

// 5173 занят другим проектом на этой машине; strictPort — чтобы не «уехать» молча на соседний порт
export default defineConfig({
  base: './',
  server: { port: 5317, strictPort: true },
  preview: { port: 5318, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [serviceWorker()],
});
