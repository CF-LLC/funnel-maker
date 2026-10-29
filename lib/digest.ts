// Weekly digest: BUILT DISABLED. This module only builds the content; nothing here sends email.
// Turning it on later needs Cooper's approval, an email sender and DIGEST_EMAILS_ENABLED=true.
export const DIGEST_ENABLED = process.env.DIGEST_EMAILS_ENABLED === 'true'

export type DigestCounts = { leads: number; responses: number; bookings: number; invoicesPaid: number; reviews: number }

export function buildDigest(c: DigestCounts): { subject: string; lines: string[] } {
  const parts: [number, string][] = [[c.leads, 'new lead'], [c.responses, 'form response'], [c.bookings, 'booking'], [c.invoicesPaid, 'invoice paid'], [c.reviews, 'new review']]
  const lines = parts.filter(([n]) => n > 0).map(([n, w]) => `${n} ${w}${n === 1 ? '' : w.endsWith('paid') ? '' : 's'}`)
  return { subject: lines.length ? `Your week on SaaS Nation: ${lines[0]}${lines.length > 1 ? ' and more' : ''}` : 'Your week on SaaS Nation', lines: lines.length ? lines : ['A quiet week. Share your page to get things moving.'] }
}
