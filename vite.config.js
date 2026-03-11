import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "SaunaStats",
        short_name: "SaunaStats",
        description: "Track your sauna sessions",
        start_url: "/dashboard",
        display: "standalone",
        background_color: "#0d0d0d",
        theme_color: "#0d0d0d",
        orientation: "portrait",
        icons: [
          {
            src: "/08_saunastats-app-icon-gold.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
