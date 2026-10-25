import { serviceClient } from '@/lib/server/admin-client'
import { HANDLE_RE, normalizeHandle, orderLinks, showBadge, socialsSchema, THEMES, type PublicLink, type Social, type Theme } from '@/lib/linkinbio/core'
import { safeHttpsUrl } from '@/lib/url-safety'

export type PublicPage = {
  handle: string; display_name: string; bio: string; avatar_url: string | null
  links: PublicLink[]; funnels: { name: string; slug: string; template: string | null }[]
  theme: Theme; socials: Partial<Record<Social, string>>; badge: boolean; user_id: string
}

/** Read-only projection for /u/[handle]: published page AND owner has linkinbio (or all) access. */
export async function getPublicPage(raw: string): Promise<PublicPage | null> {
  const handle = normalizeHandle(raw)
  if (!HANDLE_RE.test(handle)) return null
  const db = serviceClient()
  const { data: p } = await (db as any).from('lib_profiles')
    .select('user_id, handle, display_name, bio, avatar_url, show_funnels, published, theme, socials, hide_badge').eq('handle', handle).maybeSingle()
  if (!p || !p.published) return null
  const { data: ok } = await db.rpc('lib_has_access' as any, { uid: p.user_id } as any)
  if (ok !== true) return null
  const { data: links } = await (db as any).from('lib_links').select('id, title, url, position, created_at').eq('user_id', p.user_id)
  let funnels: { name: string; slug: string; template: string | null }[] = []
  if (p.show_funnels) {
    const { data: fa } = await db.rpc('fm_has_funnels_access' as any, { uid: p.user_id } as any)
    if (fa === true) {
      const { data: f } = await (db as any).from('funnels').select('name, slug, template, created_at')
        .eq('user_id', p.user_id).eq('is_public', true).not('slug', 'is', null).order('created_at', { ascending: false }).limit(20)
      funnels = (f || []).map((x: any) => ({ name: x.name, slug: x.slug, template: x.template ?? null }))
    }
  }
  const { data: allRow } = await (db as any).from('app_access').select('id').eq('user_id', p.user_id).eq('tool', 'all').eq('active', true).limit(1)
  const socials = socialsSchema.safeParse(p.socials || {})
  return {
    theme: (THEMES as readonly string[]).includes(p.theme) ? p.theme : 'light',
    socials: socials.success ? socials.data : {},
    badge: showBadge(!!p.hide_badge, Array.isArray(allRow) && allRow.length > 0),
    user_id: p.user_id, handle: p.handle, display_name: p.display_name, bio: p.bio, avatar_url: safeHttpsUrl(p.avatar_url) ?? null,
    links: orderLinks(links || []).filter((l: any) => safeHttpsUrl(l.url)).map((l: any) => ({ id: l.id, title: l.title, url: l.url, position: l.position })),
    funnels,
  }
}
