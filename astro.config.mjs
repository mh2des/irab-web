// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Keep the sitemap to indexable, canonical URLs only: drop noindex (thin /
// backfilled) ayat and non-head members of multi-ayah groups (they canonical
// to the group head). Mirrors the gate in [surah]/[ayah].astro.
const quran = JSON.parse(readFileSync(new URL('./src/data/quran-pilot.json', import.meta.url), 'utf8'));
const surahs = JSON.parse(readFileSync(new URL('./src/data/surahs.json', import.meta.url), 'utf8'));
const slugById = Object.fromEntries(
  surahs.map((/** @type {{ id: number, slug: string }} */ s) => [s.id, s.slug]),
);
const sitemapExclude = new Set();
for (const a of quran.ayat) {
  const isHead = a.ayah === a.ayahStart;
  const shared = a.ayahStart !== a.ayahEnd;
  const thin = a.isBackfilled || (!a.irab && a.words.length === 0);
  const nonCanonical = shared && a.isShared && !isHead;
  if (thin || nonCanonical) sitemapExclude.add(`https://irab.app/quran/${slugById[a.surah]}/${a.ayah}`);
}

// Private/auth pages — noindex, keep out of the sitemap.
for (const p of ['/login', '/account', '/en/login', '/en/account']) {
  sitemapExclude.add(`https://irab.app${p}`);
}

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
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ar',
        locales: { ar: 'ar-SA', en: 'en-US' },
      },
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !sitemapExclude.has(page.replace(/\/$/, '')),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
