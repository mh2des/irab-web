// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Sitemaps are NOT generated here. scripts/build-sitemaps.mjs runs after
// `astro build` (see package.json "build"): it reads the built HTML, keeps only
// self-canonical pages with no robots/googlebot noindex, splits them into
// per-section child sitemaps and stamps each URL with a real content lastmod
// taken from git history, never the build date.

// https://astro.build/config
export default defineConfig({
  site: 'https://irab.app',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
