// Shared helpers for owner-facing "Download QR" buttons (Link-in-bio, Booking). Pure, browser-safe.
import { SITE_URL } from '@/lib/free-tools/site-url'
import { makeMatrix, matrixToSvg, type Matrix } from '@/lib/free-tools/qr'

export const QR_STYLE = { fg: '#111111', bg: '#ffffff', margin: 4, px: 1024 }

/** Absolute public URL for a site path like /@me or /@me/book/call. */
export function absoluteUrl(path: string, base: string = SITE_URL): string {
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`)
}
/** Safe file name stem: "qr-me-book-call". */
export function qrFileStem(path: string): string {
  const s = path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `qr-${s || 'link'}`
}
export function qrSvgFor(url: string): string { return matrixToSvg(makeMatrix(url, 'M'), QR_STYLE) }
export function qrMatrixFor(url: string): Matrix { return makeMatrix(url, 'M') }
