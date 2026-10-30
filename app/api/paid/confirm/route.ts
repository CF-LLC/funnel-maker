import { NextResponse } from 'next/server'
import { pdGuard, bad } from '@/lib/paid/guard'
import { CONFIDENCES, cleanNote, isISODate, safePayer } from '@/lib/paid/core'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Confirm one match: marks the invoice paid (as of the bank date) and records the match. */
export async function POST(req: Request) {
  const g = await pdGuard(true); if (g.err) return g.err
  const b = await req.json().catch(() => null)
  if (!UUID.test(String(b?.invoiceId || ''))) return bad('Pick an invoice.')
  const amount = Math.round(Number(b?.amountCents)); if (!Number.isFinite(amount) || amount < 1 || amount > 100_000_000_000) return bad('That amount doesn’t look right.')
  if (!isISODate(b?.paidOn)) return bad('That date doesn’t look right.')
  const conf = CONFIDENCES.includes(b?.confidence) ? b.confidence : 'manual'
  const payer = typeof b?.payer === 'string' ? safePayer(b.payer) : null
  const { data, error } = await g.db.rpc('pd_confirm', { p_invoice: b.invoiceId, p_amount_cents: amount, p_paid_on: b.paidOn, p_confidence: conf, p_payer: payer, p_note: cleanNote(b?.note) })
  if (error) return bad(error.code === 'P0002' ? 'That invoice is already paid or was removed.' : error.code === '22023' ? 'That date doesn’t look right.' : 'Could not mark it paid.', error.code === 'P0002' ? 409 : 400)
  return NextResponse.json({ matchId: data })
}
