// Shared image-upload rules (client + server). PNG, JPEG, WebP, GIF only; 3 MB max. SVG is never accepted.
export const IMAGE_BUCKET = 'user-images'
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024
export const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' } as const
export type ImageMime = keyof typeof IMAGE_TYPES
export const ACCEPT_ATTR = Object.keys(IMAGE_TYPES).join(',')
export const UPLOAD_KINDS = ['avatar', 'funnel'] as const
export type UploadKind = (typeof UPLOAD_KINDS)[number]

export const ERR = {
  type: 'That file type isn\u2019t supported. Use a PNG, JPG, WebP or GIF.',
  size: 'That image is over 3 MB. Try a smaller one.',
  empty: 'That file is empty.',
  mismatch: 'That file doesn\u2019t look like a real image. Try exporting it again as PNG or JPG.',
  demo: 'Uploads are turned off on demo accounts.',
  auth: 'Please sign in again to upload.',
  plan: 'Uploading needs an active plan for this tool.',
  server: 'Upload failed. Please try again.',
} as const

/** Quick client-side check before sending (type + size). Returns an error message or null. */
export function checkFileMeta(f: { type: string; size: number }): string | null {
  if (!(f.type in IMAGE_TYPES)) return ERR.type
  if (f.size <= 0) return ERR.empty
  if (f.size > MAX_IMAGE_BYTES) return ERR.size
  return null
}

/** Detects the real image type from the first bytes. Null for anything else (SVG, HTML, PDF, ...). */
export function sniffImage(b: Uint8Array): ImageMime | null {
  const at = (i: number, ...v: number[]) => v.every((x, j) => b[i + j] === x)
  if (b.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (b.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (b.length >= 6 && (at(0, 0x47, 0x49, 0x46, 0x38, 0x37, 0x61) || at(0, 0x47, 0x49, 0x46, 0x38, 0x39, 0x61))) return 'image/gif'
  if (b.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'
  return null
}

/** Full server-side check: declared type, size and magic bytes must agree. */
export function validateImage(declared: string, bytes: Uint8Array): { ok: true; mime: ImageMime; ext: string } | { ok: false; error: string } {
  const meta = checkFileMeta({ type: declared, size: bytes.length })
  if (meta) return { ok: false, error: meta }
  const real = sniffImage(bytes)
  if (!real || real !== declared) return { ok: false, error: ERR.mismatch }
  return { ok: true, mime: real, ext: IMAGE_TYPES[real] }
}

/** Object path for a user's upload: <uid>/<uuid>.<ext>. */
export function objectPath(uid: string, id: string, ext: string) { return `${uid}/${id}.${ext}` }

/** If url is one of OUR uploads owned by uid, returns its object path (for deleting replaced files). */
export function ownedObjectPath(url: string | null | undefined, uid: string, supabaseUrl: string): string | null {
  if (!url || !supabaseUrl) return null
  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${IMAGE_BUCKET}/`
  if (!url.startsWith(prefix)) return null
  const p = decodeURIComponent(url.slice(prefix.length).split('?')[0])
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/i.test(p) && p.startsWith(`${uid}/`) ? p : null
}
