// @ts-check
import { defineConfig } from 'astro/config';

import alpinejs from '@astrojs/alpinejs';
import { viteSingleFile } from "vite-plugin-singlefile"
import { viteStaticCopy } from 'vite-plugin-static-copy'
import AstroPWA from '@vite-pwa/astro'
import {satteri} from '@astrojs/markdown-satteri'

import mdx from "@astrojs/mdx";

import fs from 'fs';
import path from "path"

/**
 * @param {string} dir
 * @param {string} ext
 */
function findFiles(dir, ext) {
  /**
   * @type {any[]}
   */
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(findFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

const base = import.meta.env.PROD && !process.env.FLY_APP_NAME ? "/ake-tracker" : "/";

/**
 * @param {string} url
 * @param {string} outDir
 */
function resolveOutputAsset(url, outDir) {
  const pathWithoutBase = base !== "/" && (url === base || url.startsWith(`${base}/`))
    ? url.slice(base.length)
    : url;
  return path.join(outDir, pathWithoutBase.replace(/^\/+/, ""));
}

/**
 * @param {string} ext
 */
function mimeType(ext) {
  return ({
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    woff: "font/woff", woff2: "font/woff2",
    ttf: "font/ttf", eot: "application/vnd.ms-fontobject",
  })[ext] ?? null;
}

/**
 * @param {string} str
 */
function unescapeHTML(str) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#39;': "'",
    '&quot;': '"'
  };
  return str.replace(/&amp;|&lt;|&gt;|&#39;|&quot;/g, (/** @type {string} */ tag) => entities[tag] || tag);
};

/**
 * @param {string} str
 */
function escapeHTML(str) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  };
  return str.replace(/\&|\<|\>|\'|\"/g, (/** @type {string} */ tag) => entities[tag] || tag);
};

/**
 * @param {string} srcset
 * @param {(url: string) => string} transform
 */
function mapSrcsetUrls(srcset, transform) {
  const candidates = [];
  let position = 0;

  while (position < srcset.length) {
    while (position < srcset.length && /[\s,]/.test(srcset[position])) position++;
    if (position >= srcset.length) break;

    const urlStart = position;
    while (position < srcset.length && !/\s/.test(srcset[position])) position++;
    let url = srcset.slice(urlStart, position);
    const trailingCommas = url.match(/,+$/)?.[0] ?? "";
    if (trailingCommas) url = url.slice(0, -trailingCommas.length);

    let descriptor = "";
    if (!trailingCommas) {
      const descriptorStart = position;
      while (position < srcset.length && srcset[position] !== ",") position++;
      descriptor = srcset.slice(descriptorStart, position).trim();
    }

    candidates.push(`${transform(url)}${descriptor ? ` ${descriptor}` : ""}`);
    if (position < srcset.length && srcset[position] === ",") position++;
  }

  return candidates.join(", ");
}


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
    alpinejs({entrypoint: "/src/alpine"}), 
    mdx(),
    (() => ({
      "name": "inline-assets",
      "hooks": {
        "astro:build:done": async ({ dir, logger }) => {
        const outDir = process.platform == "win32" ? dir.pathname.slice(1).replaceAll("%20", " ") : dir.pathname.replaceAll("%20", " ");

        // Find all HTML files in the output directory
        const htmlFiles = findFiles(outDir, ".html");

        for (const htmlFile of htmlFiles) {
          let html = fs.readFileSync(htmlFile, "utf-8");
          const assets = new Set()

          const inlineImage = (src) => {
            if (src.startsWith("data:") || src.startsWith("http")) return src;
            const assetPath = resolveOutputAsset(src, outDir);
            if (!fs.existsSync(assetPath)) return src;
            const ext = path.extname(assetPath).slice(1).toLowerCase();
            const mime = mimeType(ext);
            if (!mime) return src;
            const b64 = fs.readFileSync(assetPath).toString("base64");
            logger.info(`Inlining image: ${src}`);
            assets.add(assetPath)
            return `data:${mime};base64,${b64}`;
          };

          // Inline <img src="..."> tags
          html = html.replace(/(<img\s[^>]*src=")([^"]+)(")/g, (match, pre, src, post) => {
            return `${pre}${inlineImage(src)}${post}`;
          });

          // Inline local image candidates in <img srcset="..."> attributes
          html = html.replace(/<img\b[^>]*>/gi, (tag) => tag.replace(/(\bsrcset\s*=\s*)(["'])(.*?)\2/i, (match, prefix, quote, srcset) => {
            const inlinedSrcset = mapSrcsetUrls(srcset, inlineImage);
            return `${prefix}${quote}${inlinedSrcset}${quote}`;
          }));

          // Inline icon assets referenced by <link> tags
          html = html.replace(/<link\b[^>]*>/gi, (tag) => {
            const relMatch = tag.match(/\brel\s*=\s*(["'])(.*?)\1/i);
            if (!relMatch || !/(?:^|\s)(?:icon|apple-touch-icon|mask-icon)(?:\s|$)/i.test(relMatch[2])) return tag;

            return tag.replace(/(\bhref\s*=\s*)(["'])(.*?)\2/i, (match, prefix, quote, src) => {
              if (src.startsWith("data:") || src.startsWith("http")) return match;
              const assetPath = resolveOutputAsset(src, outDir);
              if (!fs.existsSync(assetPath)) return match;
              const ext = path.extname(assetPath).slice(1).toLowerCase();
              const mime = mimeType(ext);
              if (!mime) return match;
              const b64 = fs.readFileSync(assetPath).toString("base64");
              logger.info(`Inlining link icon: ${src}`);
              assets.add(assetPath);
              return `${prefix}${quote}data:${mime};base64,${b64}${quote}`;
            });
          });

          // Inline data-assets
          html = html.replace(/(<div\s[^>]*data-assets=")([^"]+)(")/g, (match, pre, src, post) => {
            const assetJson = JSON.parse(unescapeHTML(src))

            for(let asset in assetJson) {
              if (assetJson[asset].startsWith("data:") || assetJson[asset].startsWith("http")) continue
              const assetPath = resolveOutputAsset(assetJson[asset], outDir);

              if (!fs.existsSync(assetPath)) continue
              const ext = path.extname(assetPath).slice(1).toLowerCase();
              const mime = mimeType(ext);
              if (!mime) continue;
              const b64 = fs.readFileSync(assetPath).toString("base64");
              logger.info(`Inlining asset image: ${asset}`);
              assets.add(assetPath)
              assetJson[asset] = `data:${mime};base64,${b64}`
            }

            return `${pre}${escapeHTML(JSON.stringify(assetJson))}${post}`;
          });

          // Inline url(...) inside <style> blocks
          html = html.replace(/url\(["']?([^"')]+\.(woff2?|ttf|eot|png|jpg|jpeg|gif|svg|webp))["']?\)/g, (match, src) => {
            if (src.startsWith("data:") || src.startsWith("http")) return match;
            const assetPath = resolveOutputAsset(src, outDir);
            if (!fs.existsSync(assetPath)) return match;
            const ext = path.extname(assetPath).slice(1).toLowerCase();
            const mime = mimeType(ext);
            if (!mime) return match;
            const b64 = fs.readFileSync(assetPath).toString("base64");
            logger.info(`Inlining font/asset: ${src}`);
            assets.add(assetPath)
            return `url(data:${mime};base64,${b64})`;
          });

          logger.info(`Total Assets: ${assets.size}`)

          assets.forEach(x=> {
            fs.rmSync(x)
          })

          fs.writeFileSync(htmlFile, html);
        }

        const assetsDir = path.join(outDir, "_astro");
        const ORIGINAL_EXTS = /\.(jpg|jpeg|png|gif|webp)$/i;
        let removedCount = 0;

        if (fs.existsSync(assetsDir)) {
          const bundledImages = findFiles(assetsDir, ".jpg")
            .concat(findFiles(assetsDir, ".jpeg"))
            .concat(findFiles(assetsDir, ".png"))
            .concat(findFiles(assetsDir, ".gif"))
            .concat(findFiles(assetsDir, ".webp"));

          for (const imageFile of bundledImages) {
            if (!ORIGINAL_EXTS.test(imageFile)) continue;
            if (!fs.existsSync(imageFile)) continue;
            fs.rmSync(imageFile);
            removedCount++;
          }
        }
        logger.info(`Removed ${removedCount} unoptimized assets`);
      }
    }}))(),
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
      viteSingleFile({useRecommendedBuildConfig: false, removeViteModuleLoader: true}),
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