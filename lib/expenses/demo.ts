// Sample data for the demo account (Riverside). Generated relative to today; never stored.
import { localDate, type Category, type Crm, type Expense, type TtProject } from './core'

const id = (n: number) => `00000000-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`
export const DEMO_CATEGORIES: Category[] = ['Software', 'Advertising', 'Contractors', 'Equipment', 'Meals', 'Travel', 'Other'].map((name, i) => ({ id: id(i), name, archived: false }))
export const DEMO_PROJECTS: TtProject[] = [
  { id: '00000000-0000-4000-8000-0000000000a1', name: 'Website refresh', client_id: '00000000-0000-4000-8000-0000000000c1', client_name: 'Riverside Yoga Studio', client_email: 'hello@riverside.example', client_crm_email: 'hello@riverside.example' },
  { id: '00000000-0000-4000-8000-0000000000a3', name: 'Menu photos', client_id: '00000000-0000-4000-8000-0000000000c2', client_name: 'Maple & Co Bakery', client_email: null, client_crm_email: null },
]
export const DEMO_CRM: Crm[] = [{ email: 'hello@riverside.example', name: 'Riverside Yoga Studio', company: null }, { email: 'sam@northside.example', name: 'Sam Patel', company: 'Northside Fitness' }]
function back(days: number, today: string) { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - days); return localDate(d) }
export function demoExpenses(today = localDate()): Expense[] {
  const rows: [number, number, string, number, string | null, string | null, boolean, string | null, boolean][] = [
    [1, 2900, 'Figma', 0, null, null, false, 'Pro plan', false],
    [2, 8400, 'Unsplash+ stock photos', 0, '00000000-0000-4000-8000-0000000000a1', null, true, 'Hero images', false],
    [4, 4520, 'Blue Bottle Coffee', 4, null, 'sam@northside.example', true, 'Client lunch', false],
    [6, 25000, 'Upwork contractor', 2, '00000000-0000-4000-8000-0000000000a3', null, true, 'Photo retouching', false],
    [9, 1200, 'Google Workspace', 0, null, null, false, null, false],
    [12, 18999, 'Amazon', 3, null, null, false, 'Ring light', false],
    [18, 6000, 'Meta Ads', 1, null, null, false, 'Spring promo', false],
    [24, 3150, 'Lyft', 5, '00000000-0000-4000-8000-0000000000a1', null, true, 'Shoot day', true],
    [33, 2900, 'Figma', 0, null, null, false, 'Pro plan', false],
    [40, 9500, 'Delta', 5, null, null, false, null, false],
    [62, 2900, 'Figma', 0, null, null, false, 'Pro plan', false],
  ]
  return rows.map(([d, cents, vendor, cat, pid, crm, billable, note, billed], i) => ({
    id: id(50 + i), expense_date: back(d, today), amount_cents: cents, vendor, category_id: DEMO_CATEGORIES[cat].id, crm_email: crm, tt_project_id: pid, billable, note,
    receipt_name: i % 3 === 0 ? 'receipt.pdf' : null, receipt_mime: i % 3 === 0 ? 'application/pdf' : null, receipt_bytes: i % 3 === 0 ? 48213 : null,
    invoice_id: billed ? '00000000-0000-4000-8000-0000000000f1' : null, invoiced_at: billed ? new Date().toISOString() : null,
  }))
}
