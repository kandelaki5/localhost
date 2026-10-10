// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export const LOCALES = ['en', 'ka', 'pl', 'it', 'de'];

export default defineConfig({
  site: 'https://www.localhost.ge',
  trailingSlash: 'ignore',
  // Pages are prerendered (static); AI endpoints opt out with `export const prerender = false`.
  // 300 s is the Hobby maximum with Fluid compute (on by default for new Vercel projects);
  // keep AI_TIME_LIMIT_SECONDS (default 280) about 20 s below it.
  adapter: vercel({ maxDuration: 300 }),
  i18n: {
    defaultLocale: 'en',
    locales: LOCALES,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ka: 'ka-GE', pl: 'pl-PL', it: 'it-IT', de: 'de-DE' },
      },
      filter: (page) => !page.includes('/styleguide') && !page.includes('/ai-lab/dev'),
    }),
  ],
  // Keep old URLs working.
  redirects: {
    '/sustainabilitypolicy': '/assets/policies/sustainability.pdf',
  },
});
