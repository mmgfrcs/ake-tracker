// @ts-check
import { defineConfig } from 'astro/config';

import alpinejs from '@astrojs/alpinejs';
import { viteSingleFile } from "vite-plugin-singlefile"
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { VitePWA } from 'vite-plugin-pwa'
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
 * @param {string} filePath
 * @returns {string}
 */
function bundleJS(filePath, seen = new Set()) {
  const realPath = path.resolve(filePath);
  if (seen.has(realPath)) return '';
  seen.add(realPath);

  console.log(realPath)

  if (!fs.existsSync(realPath)) return '';

  let code = fs.readFileSync(realPath, 'utf-8');
  const fileDir = path.dirname(realPath);

  // Match: import ... from './foo.js'  OR  import './foo.js'
  const importRe = /\bimport\s*(?:[^'"]*?\s*from\s*)?["'](\.[^"']+)["']\s*;?/g;

  const chunks = [];
  let lastIndex = 0;
  let match;

  while ((match = importRe.exec(code)) !== null) {
    const importPath = match[1];
    console.log(importPath)
    const absImportPath = path.resolve(fileDir, importPath);

    // Append code before this import statement
    chunks.push(code.slice(lastIndex, match.index));

    // Recursively inline the imported file
    chunks.push(bundleJS(absImportPath, seen));

    lastIndex = match.index + match[0].length;
  }

  // Append remaining code after last import
  chunks.push(code.slice(lastIndex));

  return chunks.join('\n');
}


// https://astro.build/config
export default defineConfig({
  markdown: {
    processor: satteri()
  },
  build: {
    inlineStylesheets: "always",
  },

  integrations: [
    alpinejs({entrypoint: "/src/alpine"}), 
    mdx(),
    (() => ({
      "name": "inline-assets",
      "hooks": {
        "astro:build:done": async ({ dir, logger, pages }) => {
        const outDir = dir.pathname.slice(1).replaceAll("%20", " ");

        // Find all HTML files in the output directory
        const htmlFiles = findFiles(outDir, ".html");

        for (const htmlFile of htmlFiles) {
          let html = fs.readFileSync(htmlFile, "utf-8");
          const assets = new Set()

          // Inline <img src="..."> tags
          html = html.replace(/(<img\s[^>]*src=")([^"]+)(")/g, (match, pre, src, post) => {
            if (src.startsWith("data:") || src.startsWith("http")) return match;
            const assetPath = path.join(outDir, src);
            if (!fs.existsSync(assetPath)) return match;
            const ext = path.extname(assetPath).slice(1).toLowerCase();
            const mime = mimeType(ext);
            if (!mime) return match;
            const b64 = fs.readFileSync(assetPath).toString("base64");
            logger.info(`Inlining image: ${src}`);
            assets.add(assetPath)
            return `${pre}data:${mime};base64,${b64}${post}`;
          });

          // Inline data-assets
          html = html.replace(/(<div\s[^>]*data-assets=")([^"]+)(")/g, (match, pre, src, post) => {
            const assetJson = JSON.parse(unescapeHTML(src))

            for(let asset in assetJson) {
              if (assetJson[asset].startsWith("data:") || assetJson[asset].startsWith("http")) continue
              const assetPath = path.join(outDir, assetJson[asset]);

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
            const assetPath = path.join(outDir, src);
            if (!fs.existsSync(assetPath)) return match;
            const ext = path.extname(assetPath).slice(1).toLowerCase();
            const mime = mimeType(ext);
            if (!mime) return match;
            const b64 = fs.readFileSync(assetPath).toString("base64");
            logger.info(`Inlining font/asset: ${src}`);
            assets.add(assetPath)
            return `url(data:${mime};base64,${b64})`;
          });

          //Inline scripts in index.html
          // html = html.replace(
          //   /<script([^>]*)\ssrc="([^"]+)"([^>]*)><\/script>/g,
          //   (match, before, src, after) => {
          //     if (src.startsWith('http')) return match;
          //     const scriptPath = path.join(outDir, src.replace(/^\//, ''));
          //     if (!fs.existsSync(scriptPath)) return match;
          //     const code = fs.readFileSync(scriptPath, 'utf-8');
          //     // Keep all other attributes (e.g. type="module"), just drop src
          //     const attrs = (before + after).trim();
          //     logger.info(`Inlining script: ${scriptPath}`);
          //     assets.add(scriptPath)
          //     return `<script ${attrs}>${code}</script>`;
              
          //   }
          // );

          // // 2. Replace <link rel="modulepreload" href="..."> with inline <script type="module">
          // html = html.replace(
          //   /<link[^>]*\shref="([^"]+)"[^>]*\/?>/g,
          //   (match, href) => {
          //     if (!href.endsWith(".js") || href.startsWith('http')) return match;
          //     const scriptPath = path.join(outDir, href.replace(/^\//, ''));
          //     if (!fs.existsSync(scriptPath)) return match;
          //     const code = fs.readFileSync(scriptPath, 'utf-8');
          //     assets.add(scriptPath)
          //     logger.info(`Inlining script: ${scriptPath}`);
          //     return `<script type="module">${code}</script>`;
          //   }
          // );

          logger.info(`Total Assets: ${assets.size}`)

          assets.forEach(x=> {
            fs.rmSync(x)
          })

          fs.writeFileSync(htmlFile, html);
        }
      }
    }}))(),
  ],
  vite: {
    build: {
      assetsInlineLimit: 1000000000, // inline all assets
      chunkSizeWarningLimit: 1000000000,
      cssCodeSplit: false
    },
    plugins: [
      viteSingleFile({useRecommendedBuildConfig: false, removeViteModuleLoader: true}),
      {
        name: 'remove-unoptimized-originals',
        enforce: 'post',
        generateBundle(_, bundle) {
          let count = 0
          const ORIGINAL_EXTS = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/;
          for (const [key, chunk] of Object.entries(bundle)) {
            // Only remove asset chunks (not JS), and only original formats
            if (chunk.type === 'asset' && ORIGINAL_EXTS.test(key)) {
              delete bundle[key];
              count++
            }
          }
          this.info(`Removed ${count} unoptimized assets`)
        },
      },
      viteStaticCopy({
        targets: [
          {
            src: "docs/example*",
            dest: ".",
            rename: { stripBase: 1 },
          }
        ]
      }),
      VitePWA({
        registerType: "prompt",
        workbox: {
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 10000000,
          clientsClaim: true,
          globPatterns: ["example*"],
          additionalManifestEntries: [
            { url: 'index.html', revision: Date.now().toString() }
          ],
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
    ]
  }
});