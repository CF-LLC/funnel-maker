import { summarize, type DayRow } from '@/lib/site-events/core'

/**
 * Traffic totals for HQ's analytics view: the same first-party site_events the /admin/traffic page reads, reduced to
 * plain counts for the last 7 and 30 days (UTC days). Only day, event and the daily-rotating visitor hash are read, and
 * nothing but totals leaves this function.
 */
export type TrafficWindow = { visits: number; visitors: number; signups: number; checkouts: number }
export type TrafficSummary = { d7: TrafficWindow; d30: TrafficWindow }

export function windowTotals(rows: DayRow[], since: string): TrafficWindow {
  const { days } = summarize(rows.filter((r) => r.day >= since))
  const t = { visits: 0, visitors: 0, signups: 0, checkouts: 0 }
  for (const d of days) { t.visits += d.visits; t.visitors += d.visitors; t.signups += d.signups; t.checkouts += d.checkouts }
  return t
}

export async function loadTraffic(sb: any, now = Date.now()): Promise<TrafficSummary> {
  const day = (n: number) => new Date(now - n * 86_400_000).toISOString().slice(0, 10)
  const since30 = day(29), since7 = day(6)
  const rows: DayRow[] = []
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await sb.from('site_events').select('day, event, visitor_hash').gte('day', since30).order('id').range(from, from + 999)
    if (error) throw new Error(`site_events read failed: ${String(error.code ?? '')}`)
    rows.push(...((data ?? []) as DayRow[]))
    if (!data || data.length < 1000) break
  }
  return { d7: windowTotals(rows, since7), d30: windowTotals(rows, since30) }
}
