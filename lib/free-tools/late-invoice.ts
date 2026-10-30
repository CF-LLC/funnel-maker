// Late invoice kit math + copy. Pure functions; unit-tested in tests/free-tools.test.cjs.
export type FeeMode = 'flat' | 'monthly'
export type Tone = 'warm' | 'neutral' | 'direct'
export type LateInput = { number: string; amount: number; dueDate: string; daysLate: number; client: string; you: string; mode: FeeMode; ratePct: number }

const DAY = 86_400_000
/** Whole days between an ISO due date (YYYY-MM-DD) and today (local). Never negative; 0 for bad input. */
export function daysLateFrom(dueDate: string, today: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate || '')
  if (!m) return 0
  const due = Date.UTC(+m[1], +m[2] - 1, +m[3])
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.floor((now - due) / DAY))
}

const cents = (x: number) => Math.round(x * 100) / 100
/** Flat: one-time % of the amount. Monthly: simple interest, rate % per 30 days, pro-rated by day. */
export function lateFee(amount: number, mode: FeeMode, ratePct: number, daysLate: number): { fee: number; total: number } {
  const a = Number.isFinite(amount) && amount > 0 ? amount : 0
  const r = Number.isFinite(ratePct) && ratePct > 0 ? Math.min(ratePct, 100) : 0
  const d = Number.isFinite(daysLate) && daysLate > 0 ? Math.floor(daysLate) : 0
  const fee = d === 0 ? 0 : mode === 'flat' ? cents((a * r) / 100) : cents((a * r * d) / (100 * 30))
  return { fee, total: cents(a + fee) }
}

export const money = (x: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number.isFinite(x) ? x : 0)
export const prettyDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '[due date]'
}

export type Reminder = { step: 1 | 2 | 3; label: string; subject: string; body: string }

/** Three copy-ready reminders. Text only; nothing is sent. */
export function reminders(i: LateInput, tone: Tone): Reminder[] {
  const num = i.number.trim() || '[invoice #]'
  const client = i.client.trim() || '[client name]'
  const you = i.you.trim() || '[your name]'
  const amt = money(i.amount)
  const due = prettyDate(i.dueDate)
  const days = i.daysLate > 0 ? `${i.daysLate} day${i.daysLate === 1 ? '' : 's'}` : 'a few days'
  const { fee, total } = lateFee(i.amount, i.mode, i.ratePct, i.daysLate)
  const feeLine = fee > 0 ? `\n\nPer our agreement, a late fee of ${money(fee)} now applies, bringing the total to ${money(total)}.` : ''
  const hi = tone === 'direct' ? `${client},` : `Hi ${client},`
  const sign = tone === 'warm' ? `Thanks so much,\n${you}` : tone === 'neutral' ? `Thanks,\n${you}` : you
  const nudge = {
    warm: `Hope you're doing well! Just a quick note that invoice ${num} for ${amt} was due on ${due}. It may have slipped through the cracks, which totally happens. Could you take a look when you get a moment?`,
    neutral: `A quick reminder that invoice ${num} for ${amt} was due on ${due} and is now ${days} past due. Could you let me know when payment is scheduled?`,
    direct: `Invoice ${num} for ${amt} was due on ${due} and is ${days} overdue. Please send payment or let me know the date it will be paid.`,
  }[tone]
  const firm = {
    warm: `I'm following up on invoice ${num} for ${amt}, which is now ${days} past due (due ${due}). I'd really appreciate payment this week. If something's holding it up, just reply and we can sort it out together.${feeLine}`,
    neutral: `Following up on invoice ${num} for ${amt}, now ${days} past due (due ${due}). Please arrange payment within 7 days, or reply with a payment date if there's an issue.${feeLine}`,
    direct: `Invoice ${num} for ${amt} is now ${days} past due (due ${due}). Payment is required within 7 days.${feeLine}`,
  }[tone]
  const final = {
    warm: `This is my final reminder about invoice ${num} for ${amt}, due on ${due} and now ${days} late. I value working with you, but I need this settled. Please pay within 7 days of this message.${feeLine}\n\nIf I don't hear back, I'll need to pause any ongoing work and consider next steps for collecting the balance.`,
    neutral: `Final notice: invoice ${num} for ${amt} (due ${due}) is ${days} past due. Please pay in full within 7 days of this message.${feeLine}\n\nIf payment isn't received, I'll pause further work and take next steps to recover the balance.`,
    direct: `Final notice: invoice ${num} for ${amt} (due ${due}) is ${days} past due. Pay in full within 7 days.${feeLine}\n\nWithout payment, work stops and I will pursue collection of the balance.`,
  }[tone]
  const mk = (step: 1 | 2 | 3, label: string, subject: string, text: string): Reminder => ({ step, label, subject, body: `${hi}\n\n${text}\n\n${sign}` })
  return [
    mk(1, 'Friendly nudge', `Quick reminder: invoice ${num}`, nudge),
    mk(2, 'Firm follow-up', `Overdue: invoice ${num} (${days} past due)`, firm),
    mk(3, 'Final notice', `Final notice: invoice ${num}`, final),
  ]
}
