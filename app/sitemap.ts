import type { MetadataRoute } from 'next'
import { FREE_TOOLS, FREE_TOOLS_PATH, freeToolPath } from '@/lib/free-tools/registry'
import { SITE_URL, STATIC_PUBLIC_PATHS } from '@/lib/free-tools/site-url'
import { GUIDES, GUIDES_PATH, guidePath } from '@/lib/guides/registry'



export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...STATIC_PUBLIC_PATHS, FREE_TOOLS_PATH, ...FREE_TOOLS.map((t) => freeToolPath(t.slug)), GUIDES_PATH, ...GUIDES.map((g) => guidePath(g.slug))]
  return paths.map((p) => ({ url: `${SITE_URL}${p === '/' ? '' : p}`, changeFrequency: 'weekly', priority: p === '/' ? 1 : p.startsWith(FREE_TOOLS_PATH) ? 0.8 : p.startsWith(GUIDES_PATH) ? 0.7 : 0.6 }))
}
