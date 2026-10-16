// @ts-check
import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import { satteri } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import AstroPWA from '@vite-pwa/astro';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { inlineAssets } from './astro-extensions.mjs';

const base = import.meta.env.PROD && !process.env.FLY_APP_NAME ? "/ake-tracker" : "/";

// https://astro.build/config
export default defineConfig({
  markdown: {
    processor: satteri()
  },
  build: {
    inlineStylesheets: "always",
  },
  image: {
    domains: ["openinary-aketracker.fly.dev"],
  },
  base,
  integrations: [
    alpinejs({ entrypoint: "/src/alpine" }),
    mdx(),
    inlineAssets(base),
    AstroPWA({
      registerType: "prompt",
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 10000000,
        clientsClaim: true,
        globPatterns: ["*.{html,jpg,png,webp,js,css}", "**/*.js"],
        navigateFallback: '/'
      },
      filename: "swv2.js",
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
  ],
  vite: {
    build: {
      assetsInlineLimit: 1000000000, // inline all assets
      chunkSizeWarningLimit: 1000000000,
      cssCodeSplit: false
    },
    plugins: [
      viteSingleFile({ useRecommendedBuildConfig: false, removeViteModuleLoader: true }),
      viteStaticCopy({
        targets: [
          {
            src: "docs/example*",
            dest: ".",
            rename: { stripBase: 1 },
          }
        ]
      })
    ]
  }
});