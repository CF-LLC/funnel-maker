// Funnel download files live in the PRIVATE fm-downloads bucket and are served via
// /api/funnels/[funnelId]/download/[stepId], which checks access and redirects to a short-lived signed URL.
import { safeHttpsUrl } from '@/lib/url-safety'

export const DOWNLOAD_BUCKET = 'fm-downloads'
export const STORAGE_PREFIX = `storage:${DOWNLOAD_BUCKET}/`
const LEGACY_PUBLIC = new RegExp(`^https://[^/]+/storage/v1/object/(?:public|sign)/${DOWNLOAD_BUCKET}/([^?#]+)`)

/** Storage object path for a step's downloadUrl, or null if it's an external link. Accepts the new
 *  "storage:fm-downloads/<path>" form and legacy public bucket URLs (so old funnels keep working). */
export function storagePathOf(url: unknown): string | null {
  if (typeof url !== 'string') return null
  let p: string | null = null
  if (url.startsWith(STORAGE_PREFIX)) p = url.slice(STORAGE_PREFIX.length)
  else { const m = url.match(LEGACY_PUBLIC); if (m) { try { p = decodeURIComponent(m[1]) } catch { p = null } } }
  if (!p || p.includes('..') || p.startsWith('/') || p.length > 500) return null
  return p
}

/** Path must sit in the owner's folder: "<ownerId>/...". */
export const pathOwnedBy = (path: string, ownerId: string) => path.split('/')[0] === ownerId

export function isValidDownload(url: unknown): boolean {
  return !!storagePathOf(url) || !!safeHttpsUrl(url)
}

/** href to render for a download step. Storage files go through the access-checked route. */
export function downloadHref(funnelId: string | null | undefined, step: { id: string; downloadUrl?: string }): string | undefined {
  if (storagePathOf(step.downloadUrl)) {
    return funnelId ? `/api/funnels/${encodeURIComponent(funnelId)}/download/${encodeURIComponent(step.id)}` : undefined
  }
  return safeHttpsUrl(step.downloadUrl) ?? undefined
}
