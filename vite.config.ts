// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // TERMS COMPLIANCE & LICENSING ENFORCEMENT:
              // Provider API queries and audio streams MUST NEVER be cached offline.
              // Jamendo API Terms Clause 3.3 strictly forbids offline caching or storage.
              // Audius streams are stream-only with no offline caching rights granted.
              urlPattern: ({ url }) =>
                url.hostname.includes("audius.co") || url.hostname.includes("jamendo.com"),
              handler: "NetworkOnly",
            },
            {
              // HTML navigations must stay fresh but survive offline.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "reson8-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Album art + logos: cache-first so the library looks complete offline.
              // Exclude direct provider audio streams
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "reson8-artwork",
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }) =>
                request.destination === "script" || request.destination === "style",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "reson8-shell" },
            },
            {
              urlPattern: ({ request }) => request.destination === "font",
              handler: "CacheFirst",
              options: {
                cacheName: "reson8-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              // Audio caching: Cache-First ONLY for local/demo audio.
              // Strictly exclude any Audius or Jamendo domains from audio caching.
              urlPattern: ({ url, request }) =>
                request.destination === "audio" &&
                !url.hostname.includes("audius.co") &&
                !url.hostname.includes("jamendo.com"),
              handler: "CacheFirst",
              options: {
                cacheName: "reson8-audio",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true,
              },
            },
          ],
        },
      }),
    ],
  },
});
