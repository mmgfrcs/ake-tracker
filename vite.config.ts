import { defineConfig } from 'vite'
import { viteSingleFile } from "vite-plugin-singlefile"
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // ...
  plugins: [
    viteSingleFile(),
    VitePWA({
      registerType: "prompt",
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 10000000,
        skipWaiting: true,
      },
      manifest: {
        "name": "Arknights: Endfield Pull Tracker",
        "theme_color": "#574747",
        "background_color": "#09090b",
        "short_name": "AKETracker",
        "display": "standalone",
        "start_url": "./",
        "scope": "./",
        "description": "A local-first pull tracker for Arknights: Endfield",
        "icons": [
          {
            "src": "icon-512.webp",
            "type": "image/webp",
            "sizes": "512x512"
          },
          {
            "src": "icon-192.webp",
            "type": "image/webp",
            "sizes": "192x192"
          }
        ],
        "screenshots": [
          {
            "src": "example.png",
            "sizes": "2539x1371",
            "form_factor": "wide",
          },
          {
            "src": "example-mobile.jpg",
            "sizes": "1076x2164",
            "form_factor": "narrow",
          }
        ]
      }
    })
  ]
})