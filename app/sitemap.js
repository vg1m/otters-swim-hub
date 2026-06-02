import { siteOrigin } from '@/lib/site'

export default function sitemap() {
  const base = siteOrigin()
  const lastModified = new Date()

  const pages = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/register', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/login', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/signup', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.5 },
  ]

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
