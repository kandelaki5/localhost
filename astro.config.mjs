// @ts-check
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export const LOCALES = ['en', 'ka', 'pl', 'it', 'de'];

/**
 * Dev-only pages (the styleguide and the AI dev harnesses, incl. the staff
 * triage UI) live in src/dev-pages/ and are routed only by `astro dev`, so a
 * production build never contains them. Set SHOW_DEV_PAGES=1 to include them
 * in a build anyway (e.g. a private preview deployment).
 *
 *   src/dev-pages/styleguide.astro          → /styleguide/
 *   src/dev-pages/ai-lab/dev/<name>.astro   → /ai-lab/dev/<name>/
 */
const SHOW_DEV_PAGES = ['1', 'true', 'yes'].includes(String(process.env.SHOW_DEV_PAGES ?? '').toLowerCase());

/** @returns {import('astro').AstroIntegration} */
function devPages() {
  return {
    name: 'localhost:dev-pages',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev' && !SHOW_DEV_PAGES) return;
        injectRoute({ pattern: '/styleguide', entrypoint: './src/dev-pages/styleguide.astro' });
        const harnessDir = new URL('./src/dev-pages/ai-lab/dev/', import.meta.url);
        for (const file of readdirSync(harnessDir).filter((f) => f.endsWith('.astro'))) {
          const name = file.replace(/\.astro$/, '');
          injectRoute({ pattern: `/ai-lab/dev/${name}`, entrypoint: `./src/dev-pages/ai-lab/dev/${file}` });
        }
      },
    },
  };
}

/**
 * Redirects (below) compile to exact-match Vercel routes (^/sustainabilitypolicy$),
 * and a second "/sustainabilitypolicy/" key collides in Astro's router. After the
 * Vercel adapter has written its config (adapters run first), let every redirect
 * also match an optional trailing slash.
 * @returns {import('astro').AstroIntegration}
 */
function redirectTrailingSlash() {
  let root = new URL('./', import.meta.url);
  return {
    name: 'localhost:redirect-trailing-slash',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = config.root;
      },
      'astro:build:done': ({ logger }) => {
        const file = new URL('./.vercel/output/config.json', root);
        if (!existsSync(file)) return;
        const config = JSON.parse(readFileSync(file, 'utf8'));
        let n = 0;
        for (const route of config.routes ?? []) {
          const isRedirect = route.status >= 300 && route.status < 400 && route.headers?.Location;
          if (isRedirect && typeof route.src === 'string' && route.src.endsWith('$') && !route.src.endsWith('/?$')) {
            route.src = route.src.replace(/\/?\$$/, '/?$');
            n++;
          }
        }
        if (n) {
          writeFileSync(file, JSON.stringify(config, null, 2));
          logger.info(`${n} redirect(s) now also match a trailing slash`);
        }
      },
    },
  };
}

/**
 * @astrojs/vercel 11.0.13: the server entrypoint imports constants from the
 * adapter's index.js, which imports the build-time bundler `rolldown`. Tree-shaking
 * keeps a bare `import "rolldown"` in the function, and the traced bundle lacks
 * rolldown's native binary, so every on-demand route (the AI APIs) crashes on
 * Vercel with "Cannot find native binding". Nothing in the server needs rolldown
 * at runtime: resolve it to a stub module in production builds.
 * @returns {import('astro').AstroIntegration}
 */
function dropRolldownFromServer() {
  const STUB = '\0localhost:rolldown-stub';
  return {
    name: 'localhost:drop-rolldown-from-server',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        if (command !== 'build') return;
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'localhost:rolldown-stub',
                enforce: 'pre',
                resolveId: (id) => (id === 'rolldown' ? STUB : null),
                load: (id) =>
                  id === STUB
                    ? 'export function rolldown() { throw new Error("rolldown is not available at runtime"); }'
                    : null,
              },
            ],
          },
        });
      },
    },
  };
}

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
    devPages(),
    redirectTrailingSlash(),
    dropRolldownFromServer(),
    sitemap({
      // hreflang: language-only codes (same as <link rel="alternate"> in Base.astro),
      // so e.g. German speakers in Austria/Switzerland match the /de/ pages.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ka: 'ka', pl: 'pl', it: 'it', de: 'de' },
      },
      filter: (page) => !page.includes('/styleguide') && !page.includes('/ai-lab/dev'),
      // The integration has no x-default option: add it to every URL's alternates
      // (pointing at the English page of the same path).
      serialize(item) {
        if (item.links?.length) {
          const en = item.links.find((l) => l.lang === 'en');
          if (en && !item.links.some((l) => l.lang === 'x-default')) {
            item.links = [...item.links, { lang: 'x-default', url: en.url }];
          }
        }
        return item;
      },
    }),
  ],
  // Keep old URLs working (redirectTrailingSlash() makes "/sustainabilitypolicy/" match too).
  redirects: {
    '/sustainabilitypolicy': '/assets/policies/sustainability.pdf',
  },
});
