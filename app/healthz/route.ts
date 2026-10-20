// Liveness probe: no DB or auth calls. Excluded from middleware (see middleware.ts matcher).
export const dynamic = 'force-dynamic'
export function GET() {
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
