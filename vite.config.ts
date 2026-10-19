import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("package.json", import.meta.url)), "utf-8"),
) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  // Doit correspondre exactement au nom du dépôt GitHub pour GitHub Pages
  // (https://<utilisateur>.github.io/Tribu/).
  base: "/Tribu/",

  // Exposés au code applicatif (voir src/vite-env.d.ts). La date de build
  // permet de vérifier à l'œil qu'une nouvelle version est bien arrivée.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },

  plugins: [
    VitePWA({
      // Mise à jour silencieuse : le nouveau service worker prend la main tout
      // de suite et la page se recharge (contrairement à YamsApp, qui affiche
      // un bandeau, car une partie en cours ne doit pas être interrompue).
      registerType: "autoUpdate",
      injectRegister: false, // enregistrement fait à la main dans src/pwa.ts
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        lang: "fr",
        name: "Tribu — liens familiaux",
        short_name: "Tribu",
        description: "Noter les liens familiaux de mes proches.",
        theme_color: "#1b6b58",
        background_color: "#f3f6f4",
        display: "standalone",
        start_url: "/Tribu/",
        scope: "/Tribu/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Explicites : sans eux, le nouveau service worker reste « en attente »
        // et l'ancienne version continue de servir l'appli.
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
