import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// NOTA sobre Stockfish: usamos a build SINGLE-THREAD (stockfish.js 10), que NÃO
// exige os cabeçalhos COOP/COEP nem SharedArrayBuffer. Quando/se migrarmos para a
// build multithread (para força máxima no nível profissional), será preciso servir
// com:
//   Cross-Origin-Opener-Policy: same-origin
//   Cross-Origin-Embedder-Policy: require-corp
// e habilitar os headers aqui no dev server e na hospedagem de produção.

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        // Arquivos do motor: precisam estar em cache para o app abrir offline
        // sem rebaixar o engine a cada visita.
        'engine/stockfish.js',
        'engine/stockfish.wasm',
        'engine/stockfish.wasm.js',
      ],
      manifest: {
        name: 'Michuri Xadrez',
        short_name: 'Xadrez',
        description:
          'Jogue contra o motor em três níveis e estude aberturas clássicas e gambitos, lance a lance, em português.',
        lang: 'pt-BR',
        theme_color: '#16130E',
        background_color: '#16130E',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // O .wasm tem ~560 KB; o asm.js de fallback ~1,5 MB. Elevamos o limite
        // para que o Workbox faça precache de ambos.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
      },
    }),
  ],
});
