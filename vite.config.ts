import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

function resolveSiteUrl(env: Record<string, string>): string | null {
  const explicitUrl = env.VITE_SITE_URL || process.env.VITE_SITE_URL;
  if (explicitUrl && /^https?:\/\//i.test(explicitUrl)) {
    return explicitUrl.endsWith('/') ? explicitUrl : `${explicitUrl}/`;
  }

  const githubRepo = process.env.GITHUB_REPOSITORY;
  if (githubRepo && githubRepo.includes('/')) {
    const [owner, repo] = githubRepo.split('/');
    if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
      return `https://${owner}.github.io/`;
    }
    return `https://${owner}.github.io/${repo}/`;
  }

  return null;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const resolvedSiteUrl = resolveSiteUrl(env);
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        {
          name: 'social-meta-site-url',
          transformIndexHtml(html) {
            if (!resolvedSiteUrl) return html;
            return html.replaceAll('https://<username>.github.io/<repo-name>/', resolvedSiteUrl);
          },
        },
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: [
            'favicon-32x32.png',
            'apple-touch-icon.png',
            'icon.svg',
            'pwa-192x192.png',
            'pwa-512x512.png',
            'pwa-maskable-512x512.png',
          ],
          manifest: {
            id: './',
            name: 'حاسبة تكلفة تغطية المساحات',
            short_name: 'حاسبة المساحة',
            description:
              'تطبيق ويب تفاعلي لحساب المساحات وتقدير التكلفة المتوقعة لتغطيتها بمواد مثل الفرش أو السيراميك أو البلاط.',
            dir: 'rtl',
            lang: 'ar',
            theme_color: '#0F766E',
            background_color: '#0F172A',
            display: 'standalone',
            start_url: './',
            scope: './',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: 'pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
              {
                src: 'apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
                purpose: 'any',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            globIgnores: ['**/assets/aistudio/**', '**/og-image.png'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
          devOptions: {
            enabled: true,
            type: 'module',
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
