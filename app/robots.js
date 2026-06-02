import { siteOrigin } from '@/lib/site'

const PRIVATE_PREFIXES = [
  '/admin/',
  '/dashboard/',
  '/coach/',
  '/swimmers/',
  '/invoices/',
  '/settings/',
  '/api/',
  '/auth/',
]

const PUBLIC_PATHS = ['/', '/login', '/signup', '/register', '/privacy']

function crawlRules(userAgent) {
  return {
    userAgent,
    allow: PUBLIC_PATHS,
    disallow: PRIVATE_PREFIXES,
  }
}

export default function robots() {
  const base = siteOrigin()

  return {
    rules: [
      crawlRules('*'),
      crawlRules('GPTBot'),
      crawlRules('ChatGPT-User'),
      crawlRules('ClaudeBot'),
      crawlRules('Google-Extended'),
      crawlRules('PerplexityBot'),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
