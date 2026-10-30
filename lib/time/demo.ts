// Sample data for the demo account (Riverside). Generated relative to today; never stored.
import { addDays, localDate, type Client, type Entry, type Project, type Settings } from './core'

export const DEMO_SETTINGS: Settings = { default_rate_cents: 9000, currency: 'USD' }
export const DEMO_CLIENTS: Client[] = [
  { id: '00000000-0000-4000-8000-0000000000c1', name: 'Riverside Yoga Studio', email: 'hello@riverside.example', crm_email: 'hello@riverside.example', archived: false },
  { id: '00000000-0000-4000-8000-0000000000c2', name: 'Maple & Co Bakery', email: null, crm_email: null, archived: false },
]
export const DEMO_PROJECTS: Project[] = [
  { id: '00000000-0000-4000-8000-0000000000a1', client_id: DEMO_CLIENTS[0].id, name: 'Website refresh', hourly_rate_cents: 12000, billable: true, archived: false },
  { id: '00000000-0000-4000-8000-0000000000a2', client_id: DEMO_CLIENTS[0].id, name: 'Monthly coaching', hourly_rate_cents: null, billable: true, archived: false },
  { id: '00000000-0000-4000-8000-0000000000a3', client_id: DEMO_CLIENTS[1].id, name: 'Menu photos', hourly_rate_cents: 7500, billable: true, archived: false },
  { id: '00000000-0000-4000-8000-0000000000a4', client_id: DEMO_CLIENTS[1].id, name: 'Discovery call', hourly_rate_cents: null, billable: false, archived: false },
]
export function demoEntries(today = localDate()): Entry[] {
  const rows: [number, number, number, string, boolean][] = [
    [0, 0, 5400, 'Homepage hero and pricing section', false], [0, 2, 2700, 'Shot list', false],
    [-1, 1, 3600, 'Session 4', false], [-1, 0, 7200, 'Booking page build', false], [-2, 3, 1800, 'Intro call', false],
    [-3, 2, 9000, 'Shoot day', false], [-4, 0, 4500, 'Wireframes', true], [-8, 1, 3600, 'Session 3', true], [-9, 0, 6300, 'Content audit', true],
  ]
  return rows.map(([d, p, sec, note, billed], i) => ({
    id: `00000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`, project_id: DEMO_PROJECTS[p].id, entry_date: addDays(today, d),
    started_at: null, seconds: sec, note, billable: DEMO_PROJECTS[p].billable, invoice_id: billed ? '00000000-0000-4000-8000-0000000000f1' : null,
    invoiced_at: billed ? new Date().toISOString() : null,
  }))
}
