import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function resolveBase(): string {
  let raw = process.env.VITE_BASE?.trim();
  if (!raw && process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const [owner = '', repo = ''] = process.env.GITHUB_REPOSITORY.split('/');
    raw =
      repo && repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : repo ? `/${repo}/` : '/';
  }
  const normalized = raw || '/';
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

const base = resolveBase();
const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));

async function listPublicFiles(dir: string, prefix = ''): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'aistudio') continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await listPublicFiles(join(dir, entry.name), path)));
    else files.push(`/${path}`);
  }
  return files;
}

function spaFallback(): Plugin {
  const templatePath = fileURLToPath(new URL('./404.template.html', import.meta.url));
  return {
    name: 'tikatrack:spa-fallback',
    apply: 'build',
    async generateBundle() {
      const template = await readFile(templatePath, 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: template.split('{{BASE}}').join(base),
      });
      this.emitFile({
        type: 'asset',
        fileName: '.nojekyll',
        source: '',
      });
    },
  };
}

function pwaAssets(): Plugin {
  const manifestPath = fileURLToPath(new URL('./manifest.template.json', import.meta.url));
  const swPath = fileURLToPath(new URL('./sw.template.js', import.meta.url));
  const manifestHref = `${base}manifest.webmanifest`;
  const swHref = `${base}sw.js`;
  const renderManifest = async (): Promise<string> =>
    (await readFile(manifestPath, 'utf8')).split('{{BASE}}').join(base);
  const renderDevSw = async (): Promise<string> =>
    (await readFile(swPath, 'utf8'))
      .split('{{CACHE_NAME}}')
      .join('tikatrack-dev')
      .split('{{BASE}}')
      .join(base);

  return {
    name: 'tikatrack:pwa-assets',
    enforce: 'post',
    transformIndexHtml() {
      return [{ tag: 'link', attrs: { rel: 'manifest', href: manifestHref }, injectTo: 'head' }];
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = (request.url ?? '').split('?')[0];
        if (pathname === manifestHref) {
          renderManifest()
            .then((body) => {
              response.setHeader('Content-Type', 'application/manifest+json');
              response.end(body);
            })
            .catch(next);
          return;
        }
        if (pathname === swHref) {
          renderDevSw()
            .then((body) => {
              response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              response.setHeader('Cache-Control', 'no-store');
              response.end(body);
            })
            .catch(next);
          return;
        }
        next();
      });
    },
    async generateBundle(_options, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: await renderManifest(),
      });

      const emitted = Object.keys(bundle).filter(
        (name) => !name.endsWith('.map') && name !== '.nojekyll',
      );
      const shellFiles = [
        ...new Set([
          ...emitted.map((name) => `/${name}`),
          ...(await listPublicFiles(PUBLIC_DIR)),
          '/index.html',
          '/manifest.webmanifest',
        ]),
      ].sort();
      const precache = shellFiles.map((file) => `${base}${file.replace(/^\//, '')}`);
      const revision = createHash('sha256')
        .update(`${base}\n${precache.join('\n')}`)
        .digest('hex');
      const cacheName = `tikatrack-v${revision.slice(0, 12)}`;
      const template = await readFile(swPath, 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .split('{{CACHE_NAME}}')
          .join(cacheName)
          .split('{{BASE}}')
          .join(base)
          .replace(
            /\/\* \{\{PRECACHE\}\} \*\/ \[\]/,
            `/* precache, generated at build time */ ${JSON.stringify(precache)}`,
          ),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mapsKey = env.VITE_GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY || '';
  return {
    base,
    plugins: [react(), tailwindcss(), spaFallback(), pwaAssets()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    ...(mapsKey && !env.VITE_GOOGLE_MAPS_API_KEY
      ? {
          define: {
            'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(mapsKey),
          },
        }
      : {}),
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: false,
      ws: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    build: {
      target: 'es2022',
      sourcemap: process.env.TIKATRACK_SOURCEMAPS !== 'false',
      reportCompressedSize: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/three/')) return 'three';
            if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-vendor/')) {
              return 'recharts';
            }
            if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
            if (id.includes('/@vis.gl/react-google-maps/')) return 'maps';
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router-dom/') ||
              id.includes('/react-router/')
            ) {
              return 'react-vendor';
            }
            return undefined;
          },
        },
      },
    },
  };
});
