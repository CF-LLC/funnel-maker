// Server-only. Writes cookieless site events with the service role. Never throws.
import { createHash } from 'node:crypto'
import { serviceClient } from '@/lib/server/admin-client'
import { dailyVisitorHash, deviceFromUa, utcDay, type SiteEvent } from './core'

export const OWN_HOSTS = ['saasnation.site', 'funnels.saasnation.site', 'localhost', '127.0.0.1']

/** Pepper for the daily hash, derived from an existing server secret (never stored, never sent). */
function pepper(): string {
  return createHash('sha256').update(`site-events|${process.env.SUPABASE_SECRET_KEY || 'dev-only'}`).digest('hex')
}

export function visitorHash(ip: string, ua: string): string | null {
  return ip && ip !== 'unknown' ? dailyVisitorHash(ip, ua, utcDay(), pepper()) : null
}

export async function recordSiteEvent(row: { event: SiteEvent; path?: string | null; tool?: string | null; plan?: string | null; amount_cents?: number | null; referrer_host?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; device?: string | null; visitor_hash?: string | null }): Promise<void> {
  try { await serviceClient().from('site_events').insert({ day: utcDay(), ...row }) } catch { /* analytics must never break a request */ }
}

export const deviceOf = (ua: string | null) => deviceFromUa(ua)
