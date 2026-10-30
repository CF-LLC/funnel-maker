// Riverside demo: sample open invoices and a sample bank CSV. Nothing here is real or stored.
import type { OpenInvoice } from './core'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const d = (days: number) => { const x = new Date(Date.now() + days * 86_400_000); return x.toISOString().slice(0, 10) }
export const DEMO_OWNER = 'Riverside Fitness'
export function demoInvoices(): OpenInvoice[] {
  return [
    { id: id(901), number: 'RF-1042', client_name: 'Maple & Co Bakery', total: 120000, currency: 'USD', issue_date: d(-30), due_date: d(-2) },
    { id: id(902), number: 'RF-1043', client_name: 'Northside Physio', total: 45000, currency: 'USD', issue_date: d(-21), due_date: d(7) },
    { id: id(903), number: 'RF-1044', client_name: 'Harbor Yoga', total: 89900, currency: 'USD', issue_date: d(-14), due_date: d(14) },
    { id: id(904), number: 'RF-1045', client_name: 'Oakline Dental', total: 45000, currency: 'USD', issue_date: d(-10), due_date: d(20) },
    { id: id(905), number: 'RF-1046', client_name: 'Copper Kettle Cafe', total: 30000, currency: 'USD', issue_date: d(-5), due_date: d(25) },
  ]
}
export function demoCsv(): string {
  return [
    'Date,Description,Debit,Credit,Balance',
    `${d(-1)},"ONLINE TRANSFER FROM MAPLE & CO BAKERY REF 88412093 RF-1042",,"1,200.00","8,410.22"`,
    `${d(-2)},"ACH CREDIT HARBOR YOGA LLC 0003318842",,899.00,"7,210.22"`,
    `${d(-2)},"STRIPE PAYOUT 45120339",,450.00,"6,311.22"`,
    `${d(-3)},"COFFEE SUPPLIES DEBIT CARD 4411",42.18,,"5,861.22"`,
    `${d(-4)},"MOBILE DEPOSIT COPPER KETTLE",,295.00,"5,903.40"`,
    `${d(-5)},"INTEREST PAYMENT",,1.12,"5,608.40"`,
  ].join('\n')
}
