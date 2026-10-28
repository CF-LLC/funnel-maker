import { elGuard } from '@/lib/emaillist/guard'
import { loadSubscribers } from '@/lib/emaillist/load'
import { demoSubscribers } from '@/lib/emaillist/demo'

const cell = (v: unknown) => { const s = String(v ?? ''); const t = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }
export async function GET() {
  const g = await elGuard(false); if (g.err) return g.err
  const subs = g.demo ? demoSubscribers() : await loadSubscribers()
  const head = ['email', 'name', 'status', 'tags', 'source', 'consent', 'consent_at', 'consent_detail', 'signed_up', 'unsubscribed_at']
  const lines = [head.join(','), ...subs.map((s) => [s.email, s.name, s.status, s.tags.join('|'), s.source, s.consent, s.consent_at, s.consent_detail, s.created_at, s.unsubscribed_at].map(cell).join(','))]
  return new Response(lines.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="email-list.csv"', 'Cache-Control': 'no-store' } })
}
