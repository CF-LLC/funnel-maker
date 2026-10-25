// Internal, aggregates-only summary for HQ. Lives under /healthz so middleware (auth/session) skips it;
// access is enforced here and fails closed (see lib/server/internal-summary.ts).
import { serviceClient } from '@/lib/server/admin-client'
import { demoUserIds } from '@/lib/demo'
import { allowSummary, loadCounts } from '@/lib/server/internal-summary'

export const dynamic = 'force-dynamic'
const head = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
let cache: { at: number; body: unknown } | null = null

export async function GET(request: Request) {
  const code = allowSummary(request.headers)
  if (code !== 200) return Response.json({ error: code === 404 ? 'not found' : 'forbidden' }, { status: code, headers: head })
  try {
    if (!cache || Date.now() - cache.at > 60_000) cache = { at: Date.now(), body: { v: 1, generatedAt: new Date().toISOString(), ...(await loadCounts(serviceClient(), demoUserIds())) } }
    return Response.json(cache.body, { headers: head })
  } catch (err) {
    console.error('healthz/summary unavailable:', err instanceof Error ? err.message.slice(0, 200) : 'unknown')
    return Response.json({ error: 'unavailable' }, { status: 503, headers: head })
  }
}
