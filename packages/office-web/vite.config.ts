import { defineConfig } from 'vite';

const daemon = process.env.AO_DAEMON_URL ?? 'http://127.0.0.1:47821';
const api = ['/events', '/stream', '/snapshot', '/config', '/replay', '/demo', '/stats', '/health'];

export default defineConfig({
  base: './',
  build: {
    outDir: '../../plugin/dist/web',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    target: 'es2022',
  },
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      api.map((p) => [
        p,
        {
          target: daemon,
          changeOrigin: true,
          // the daemon rejects foreign origins; the dev server is trusted, so drop the header
          configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
        },
      ]),
    ),
  },
});
