# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- **Combined Pity Tracking & Statistics** — Added combined pity tracking and a dedicated pull statistics view with historical pull data by banner, including empty state handling when no data is available. ([768f337](https://github.com/mmgfrcs/ake-tracker/commit/768f337d20e2a94b16e1b3f9f7cd511803012770), [2e82384](https://github.com/mmgfrcs/ake-tracker/commit/2e8238459108f1c4011f72aaf78173386f9631b9), [8d56dc7](https://github.com/mmgfrcs/ake-tracker/commit/8d56dc7c22e4d0bdf4b423fdb1e14995c73ec231))
- **Image Export Functionality** — Added pull history image export feature with customizable layout and styling controls. ([0b0989e](https://github.com/mmgfrcs/ake-tracker/commit/0b0989ecd1fc808a22ff47e08ac7d5581aa91d7d))
- **Weapon Banner Data & Images** — Added full weapon banner pools and associated assets, adjusting banner view width for the wider layout. ([7ab87b7](https://github.com/mmgfrcs/ake-tracker/commit/7ab87b70f7fd77161f735d9d43f41a94eb4fc339), [a4ec42a](https://github.com/mmgfrcs/ake-tracker/commit/a4ec42a0f91a6c6ddbc0f76c6874ac60987395e0), [eb6b48b](https://github.com/mmgfrcs/ake-tracker/commit/eb6b48b29900cee13743f52d482717e78413b6c1))
- **Version 1.4 Phase 2 & 1.5 Assets** — Added banner images for 1.4 Phase 2, version 1.5 character assets (Typhoeus), banner pools, and Typhoeus weapon artwork; updated game version display to 1.5. ([64d7bf1](https://github.com/mmgfrcs/ake-tracker/commit/64d7bf157400c8a2601e31ded30194842df6f395), [3472957](https://github.com/mmgfrcs/ake-tracker/commit/3472957fbb409d0cb4d82f7c0067ff5066dbcb66), [5e36610](https://github.com/mmgfrcs/ake-tracker/commit/5e36610ddb216447814aee67035f29910a300a88))
- **Visual & UI Enhancements** — Added glass background effect (`bg.webp`) and NOTUS font and styling. ([4914e9f](https://github.com/mmgfrcs/ake-tracker/commit/4914e9f75f9feceeaae7fe19a3b2b80aa2a34ee0))
- **Service Worker Debug Mode & Reset** — Added SW debug mode and SW reset capability to assist with diagnosing caching and lifecycle issues. ([8671f63](https://github.com/mmgfrcs/ake-tracker/commit/8671f634fe29d06862dbf3127ff42f76c77c40c2), [e4f226c](https://github.com/mmgfrcs/ake-tracker/commit/e4f226c6d05f03feeb1a0fa2e89694e9f872b4f9))

### Fixed

- **Weapon Pity Calculation** — Fixed weapon banner pity calculation logic. ([7560703](https://github.com/mmgfrcs/ake-tracker/commit/75607034c2ee3bf99540b6167885e3ee41cb02c3))
- **Offline PWA & Service Worker Updates** — Fixed service worker offline functionality, forced update handling via `updateSW(true)`, and configurable update interval. ([e4f226c](https://github.com/mmgfrcs/ake-tracker/commit/e4f226c6d05f03feeb1a0fa2e89694e9f872b4f9), [4914e9f](https://github.com/mmgfrcs/ake-tracker/commit/4914e9f75f9feceeaae7fe19a3b2b80aa2a34ee0), [a304c5a](https://github.com/mmgfrcs/ake-tracker/commit/a304c5ac65d549ed7fcf8193b5d37e929bc3cb0f))
- **Refresh Dialog Behavior** — Fixed the refresh dialog not closing after performing data operations. ([d77b8e0](https://github.com/mmgfrcs/ake-tracker/commit/d77b8e040bf595f590bb598df03fcdd40c8322ca))
- **TypeScript Definitions** — Fixed `is5050Win` typing definition and minor type errors across codebase. ([919322b](https://github.com/mmgfrcs/ake-tracker/commit/919322ba667ef4aa009d7df9d949fe4f23bdfc51), [cdc9cec](https://github.com/mmgfrcs/ake-tracker/commit/cdc9cecf9087009175be8017ab73a42bb201380a))
- **Satori Debug Mode Rendering** — Fixed Satori rendering failures when running in debug mode. ([a304c5a](https://github.com/mmgfrcs/ake-tracker/commit/a304c5ac65d549ed7fcf8193b5d37e929bc3cb0f))
- **Banner Naming & Empty Pool Types** — Fixed capitalization on 1.4 Phase 2 banner name and handled empty pool types returned by the game API. ([c23cfac](https://github.com/mmgfrcs/ake-tracker/commit/c23cface2b8faf2a660bb1ee2a5c2b9e6d9c6f80), [19a21ea](https://github.com/mmgfrcs/ake-tracker/commit/19a21ea3ae83b2bea035ca1111127eda09062eb9))
- **Image Exporter Styling** — Fixed incorrect image export logic and visual styling in export output. ([52fec54](https://github.com/mmgfrcs/ake-tracker/commit/52fec54aca26e7d715e77c2269c9ec00f641bb0f))
- **Pity Count Calculation & 80-Pull Pity Carryover** — Fixed pity counter display in history view and ensured 6★ pity carries over across rerun banners of the same type. ([80e2dc7](https://github.com/mmgfrcs/ake-tracker/commit/80e2dc7b5dd01482592b40cc65638b5cede151b1))
- **Single-file HTML Size for Service Worker** — Resolved bundle size issues where single-file HTML exceeded service worker cache limit. ([22a100c](https://github.com/mmgfrcs/ake-tracker/commit/22a100cfb65c0073c0f99cb514aaa56be648dbc1))
- **Per-banner Rarity Toggle** — Fixed per-banner rarity toggle not applying correctly when switching between banners. ([07ec1a0](https://github.com/mmgfrcs/ake-tracker/commit/07ec1a0cde3cfc75764cad1e16bec8b3a0358ce9))

### Removed

- **Workbox skipWaiting Option** — Removed Workbox `skipWaiting` option in favor of explicit `updateSW(true)` lifecycle handling. ([4914e9f](https://github.com/mmgfrcs/ake-tracker/commit/4914e9f75f9feceeaae7fe19a3b2b80aa2a34ee0))
- **Extraneous Console Logs** — Removed redundant debug logs from banner and tracking logic. ([07ec1a0](https://github.com/mmgfrcs/ake-tracker/commit/07ec1a0cde3cfc75764cad1e16bec8b3a0358ce9))

## 1.2 — 2026-07-16

### Added

- **Banner View Redesign** — Completely redesigned the banner view for a cleaner layout and improved readability across screen sizes. ([fa94c79](https://github.com/mmgfrcs/ake-tracker/commit/fa94c79afac4e9ab8df1fc99b06d320129c85243))
- **Rossi Weapon and 1.2 Assets** — Added Rossi weapon data and temporary placeholder assets for version 1.2. ([111ad18](https://github.com/mmgfrcs/ake-tracker/commit/111ad18185367098386f5b644b6d3c12e3cbb862), [3f267bb](https://github.com/mmgfrcs/ake-tracker/commit/3f267bbdfdd6d6c0a3f9a07e08485d7f9d220fc3))
- **Pity Counter** — Added a persistent pity counter that tracks pull count toward guaranteed drops per banner. ([5c96083](https://github.com/mmgfrcs/ake-tracker/commit/5c96083603caace72a3c3bbd371eb787dd4e1bb5))
- **App and Game Version Display** — Added visible app version and current in-game version labels to the UI. ([38bb7b2](https://github.com/mmgfrcs/ake-tracker/commit/38bb7b2ae3f6e23a733762410a6673412b7679cb))
- **Local Image Optimizer** — Added a local image optimization step using Sharp as a dependency to reduce asset sizes at build time. ([138142d](https://github.com/mmgfrcs/ake-tracker/commit/138142da42a6cf825c4942671a988bab83fbf813))
- **Partial Update Logic in PowerShell Script** — Added logic in the data-fetching PowerShell script to perform partial/incremental updates instead of full re-downloads. ([49a54f7](https://github.com/mmgfrcs/ake-tracker/commit/49a54f7aa1941192ce75e70acf99fccd50ee200d))
- **Camille Character and 1.4 Assets** — Added Camille character image, weapon data, and all version 1.4 assets including updated 1.3 images for Mi Fu and Amaranthine Tassel. ([763843c](https://github.com/mmgfrcs/ake-tracker/commit/763843c6cf9f5e564a89882b891f13fce53d3f45), [29794d7](https://github.com/mmgfrcs/ake-tracker/commit/29794d7a3a4e68a9251e040446c9f0f45c6cdee6), [ba6d702](https://github.com/mmgfrcs/ake-tracker/commit/ba6d7022e74041affeb71b893b63e654d8dbc67e))

### Fixed

- **Service Worker Update Logic** — Fixed a bug in service worker update detection that prevented the app from refreshing to the latest version. ([21b00b5](https://github.com/mmgfrcs/ake-tracker/commit/21b00b5f083c33055ff4cc22d7a2ae1752b408ee))
- **Character Currency Spent Calculation** — Fixed an incorrect calculation for total currency spent per character in pull history. ([a11b17a](https://github.com/mmgfrcs/ake-tracker/commit/a11b17ace76140a741fd60288dd8b682f1fe395f))
- **Versioning, Banner Sort, and 80-Pull Pity Calculation** — Fixed version detection, incorrect banner sort ordering, and an off-by-one error in 80-pull pity threshold. ([bee7967](https://github.com/mmgfrcs/ake-tracker/commit/bee7967531efe768532a00738ac5325e8f8bb4ab))
- **App Version Retrieval and Lockfile Inclusion** — Fixed build failing to obtain the app version correctly and ensured lockfile is included. ([90af116](https://github.com/mmgfrcs/ake-tracker/commit/90af11675b9be1646f299c6efee4b5b5a150ce0f), [fbbdbe6](https://github.com/mmgfrcs/ake-tracker/commit/fbbdbe68f43ee00107a3acdb2335c5f4d726d4b2))
- **Array Init in PowerShell Script** — Fixed improper array initialization in data-fetching script causing parse errors. ([9fb63b4](https://github.com/mmgfrcs/ake-tracker/commit/9fb63b409cecb681afa62ccc893113e03757f0ae))
- **Image Format (WebP)** — Fixed assets not being served in the proper WebP format. ([77e00c8](https://github.com/mmgfrcs/ake-tracker/commit/77e00c88dc78d7238b830b2bad7699c7d87ad4be))
- **Workflow Unset Job Outputs** — Fixed CI/CD workflow steps that had unset or missing job output variables causing pipeline failures. ([0240956](https://github.com/mmgfrcs/ake-tracker/commit/0240956d4e018d04fdcb8d7d07a2c73972135ce8), [08ed389](https://github.com/mmgfrcs/ake-tracker/commit/08ed3891dacb3831da9137b8e81d30c23baad6ed))
- **1.2 Zhuang Fangyi Icon Update** — Replaced placeholder icon for Zhuang Fangyi with correct version 1.2 asset. ([e449f62](https://github.com/mmgfrcs/ake-tracker/commit/e449f62994df63cbc8391d51f25217ac0de15c6d))

## 1.1 — 2026-04-06

### Added

- **Backup, Tooltip, Database Schema, and Lucide Icons** — Added backup/restore feature, hover tooltips, defined database schema, and Lucide icon library integration. ([b30580c](https://github.com/mmgfrcs/ake-tracker/commit/b30580ceeb44562b81ec030af5261cdb3bde45d3))
- **Weapon Icons for Version 1.0** — Added weapon artwork and icons for all version 1.0 weapons. ([8f7afde](https://github.com/mmgfrcs/ake-tracker/commit/8f7afdea0265da967b691a5ca30c43b31bd4b7fa))
- **1.1 Icon Assets** — Added character and weapon icons for version 1.1. ([0043555](https://github.com/mmgfrcs/ake-tracker/commit/0043555b3343e8431e09d1a7d64787e0ca2784f8))
- **Offline PWA Support** — Added full Progressive Web App support with offline caching via service worker and enhanced storage persistence. ([3862106](https://github.com/mmgfrcs/ake-tracker/commit/38621067a5e042b9fc947b005d93906616bf4b3f))
- **Deploy Preview via Fly.io** — Added GitHub Actions workflow step to deploy PR preview environments through Fly.io. ([9a24ba1](https://github.com/mmgfrcs/ake-tracker/commit/9a24ba1811663303cb17a6299dbc773158e4c080))
- **PR Review Workflow** — Added GitHub Actions workflows for automated PR review and cleanup. ([b591ce0](https://github.com/mmgfrcs/ake-tracker/commit/b591ce003aa8fd6a01589cb57980f5e92b72f93f), [cb0124d](https://github.com/mmgfrcs/ake-tracker/commit/cb0124d862b21019e13e4d6a6ab54a89b47c6186))
- **Data Sync** — Added automatic data sync mechanism to fetch and update pull records from the game server. ([0b117c3](https://github.com/mmgfrcs/ake-tracker/commit/0b117c32d8caddd60016071bde9dadb3d23aa16a))

### Fixed

- **Workflow CI Fixes** — Fixed multiple CI/CD workflow issues including pnpm command execution, LFS checkout failures, and missing Dockerfile copy steps. ([2aeadd0](https://github.com/mmgfrcs/ake-tracker/commit/2aeadd0c44e9633cb23712d37ebc43de1bceb0aa), [594dd15](https://github.com/mmgfrcs/ake-tracker/commit/594dd154ae8bde39e00451b9ebf6ff383eaa5d4c), [741e6cd](https://github.com/mmgfrcs/ake-tracker/commit/741e6cd98009a285df010a02c02307d582fd5270))
- **Tab and Icon Initialization** — Fixed `ot-tabs` component not reinitializing on navigation and resolved incorrect icon path and filename references. ([ee3944b](https://github.com/mmgfrcs/ake-tracker/commit/ee3944b3b32a84259e491d53b51705a6382b622b), [a9aac8b](https://github.com/mmgfrcs/ake-tracker/commit/a9aac8b70c04a67c4d08a9d3b1cb8c5348efbe70))
- **Character and Weapon History Definitions** — Fixed incorrect type definitions for character and weapon pull history entries. ([2ca8d25](https://github.com/mmgfrcs/ake-tracker/commit/2ca8d25a1b05ab62ce6181e3ded2c8e41a5c7509))
- **Null Character and PSS7 Errors** — Fixed crashes caused by null character entries and unhandled PSS7 protocol errors during data fetching. ([d8937e5](https://github.com/mmgfrcs/ake-tracker/commit/d8937e55f730784285ee8873adb8da84a7af8094))
- **Script Output Encoding** — Fixed PowerShell data-fetch script producing incorrectly encoded output files. ([cbb9fb4](https://github.com/mmgfrcs/ake-tracker/commit/cbb9fb411e50f4d50d555d535a51c256b9f7ad2a))
- **Mobile Layout** — Fixed layout overflow and alignment issues on mobile screen sizes. ([699af62](https://github.com/mmgfrcs/ake-tracker/commit/699af624873a010df07927b3ba1137c69f1b8bd1))
- **Image Optimization and Asset Fixes** — Optimized images for faster loading and fixed Brigand's Calling weapon name typo. ([ab8c546](https://github.com/mmgfrcs/ake-tracker/commit/ab8c54663fa9531a993ed353c437bd4fd14810d8), [d5eb586](https://github.com/mmgfrcs/ake-tracker/commit/d5eb5865c7e6ed715e904f57a794df23d3cffc61))
- **PWA Start URL and SW Update Bugs** — Fixed incorrect `start_url` in PWA manifest and resolved bug where service worker would not update to the latest version. ([07132ba](https://github.com/mmgfrcs/ake-tracker/commit/07132ba6fe877fa23288866109479cd025053be4), [cb404fb](https://github.com/mmgfrcs/ake-tracker/commit/cb404fbc5eb6885f308b18c176a2972dc5e8140c))
- **Workflow SHA Pin and PR Triggers** — Updated CI workflow to use commit SHA hashes for script links and fixed PR trigger conditions. ([424a9c4](https://github.com/mmgfrcs/ake-tracker/commit/424a9c4f5c1bbfbb3382dcaf5430c8a33244f466))

### Removed

- **Refresh Dialog and Early Data Sync** — Removed early implementation of refresh dialog and initial data sync prototype, replaced by the improved Data Sync feature. ([11c8d94](https://github.com/mmgfrcs/ake-tracker/commit/11c8d945b47e84bc19c40fb77e1f394a218e2388))

## 1.0 — 2026-03-10

### Added

- **Initial Application** — Initial release of Arknights Endfield pull tracker with pull history display, character and weapon pool data, icon handling, and data persistence using IndexedDB. ([ae0ef99](https://github.com/mmgfrcs/ake-tracker/commit/ae0ef99a905a5241267188807ea726a26f877cf7), [1bf1644](https://github.com/mmgfrcs/ake-tracker/commit/1bf1644fce20cb63ffa351b7fe490e230ab8a005), [fab2526](https://github.com/mmgfrcs/ake-tracker/commit/fab252667eab8716361a93f3d3a7fb0cd1a1ba68))
