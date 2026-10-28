import type { MetadataRoute } from 'next'
import { FREE_TOOLS, FREE_TOOLS_PATH, freeToolPath } from '@/lib/free-tools/registry'
import { SITE_URL, STATIC_PUBLIC_PATHS } from '@/lib/free-tools/site-url'



export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...STATIC_PUBLIC_PATHS, FREE_TOOLS_PATH, ...FREE_TOOLS.map((t) => freeToolPath(t.slug))]
  return paths.map((p) => ({ url: `${SITE_URL}${p === '/' ? '' : p}`, changeFrequency: 'weekly', priority: p === '/' ? 1 : p.startsWith(FREE_TOOLS_PATH) ? 0.8 : 0.6 }))
}
