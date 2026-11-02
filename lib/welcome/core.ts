// Welcome emails, day 0 / 2 / 5. Pure helpers (no I/O). Sending is OFF by default and dry-run by default.
export const WELCOME_STEPS = [0, 2, 5] as const
export type Step = (typeof WELCOME_STEPS)[number]
const DAY = 86400_000
/** A step is only sent inside this window after it becomes due; late steps are skipped, never batched up. */
export const STEP_WINDOW_DAYS = 2
export const MAX_PER_RUN = 50

export type WelcomeEnv = { WELCOME_EMAILS_ENABLED?: string; WELCOME_EMAILS_DRY_RUN?: string; WELCOME_EMAILS_START_AT?: string; WELCOME_EMAIL_FROM?: string; RESEND_API_KEY?: string; CRON_SECRET?: string }
/** enabled: WELCOME_EMAILS_ENABLED exactly 'true'. live: also WELCOME_EMAILS_DRY_RUN exactly 'false', a sender, a key and a start date. */
export function welcomeMode(env: WelcomeEnv = process.env as WelcomeEnv): { enabled: boolean; live: boolean; startAt: Date | null; reason: string } {
  const enabled = env.WELCOME_EMAILS_ENABLED === 'true'
  const t = env.WELCOME_EMAILS_START_AT ? Date.parse(env.WELCOME_EMAILS_START_AT) : NaN
  const startAt = Number.isFinite(t) ? new Date(t) : null
  if (!enabled) return { enabled, live: false, startAt, reason: 'WELCOME_EMAILS_ENABLED is not true' }
  if (env.WELCOME_EMAILS_DRY_RUN !== 'false') return { enabled, live: false, startAt, reason: 'dry run' }
  if (!startAt) return { enabled, live: false, startAt, reason: 'WELCOME_EMAILS_START_AT not set' }
  if (!env.WELCOME_EMAIL_FROM || !env.RESEND_API_KEY) return { enabled, live: false, startAt, reason: 'no sender configured' }
  return { enabled, live: true, startAt, reason: 'live' }
}

export type Candidate = { id: string; email: string | null; created_at: string; email_confirmed_at?: string | null; invited_at?: string | null; is_anonymous?: boolean; banned_until?: string | null }
/** Only people who signed up themselves: confirmed email, not invited, not anonymous/banned, created on/after startAt. */
export function selfSignedUp(u: Candidate, startAt: Date | null, isDemo: (id: string) => boolean = () => false): boolean {
  if (!startAt || !u.email || !u.email_confirmed_at || u.invited_at || u.is_anonymous || isDemo(u.id)) return false
  if (u.banned_until && Date.parse(u.banned_until) > Date.now()) return false
  return Date.parse(u.created_at) >= startAt.getTime()
}

/** The one step due now (or null). Never a step already claimed; never a step whose window has passed. */
export function dueStep(createdAt: string, done: Set<number>, now = new Date()): Step | null {
  const age = now.getTime() - Date.parse(createdAt)
  for (const s of [...WELCOME_STEPS].reverse()) {
    if (age >= s * DAY && age < (s + STEP_WINDOW_DAYS) * DAY) return done.has(s) ? null : s
  }
  return null
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export type Mail = { subject: string; html: string; text: string }
const COPY: Record<Step, { subject: string; lines: string[]; cta: [string, string] }> = {
  0: { subject: 'Welcome to SaaS Nation', lines: ['Thanks for signing up. SaaS Nation is a set of simple tools for coaches, creators and solo businesses.', 'Start with the one job that costs you the most time: invoices, a client list, an email list or selling a digital download.', 'Buying a plan gives you access right away. One tool is $12/mo or $99/yr; All Access is $29/mo or $249/yr.'], cta: ['Open your dashboard', '/dashboard'] },
  2: { subject: 'One quick win in SaaS Nation', lines: ['A quick idea for this week: send one invoice or share one booking link from SaaS Nation.', 'Customers pay you through your own Stripe Payment Link. SaaS Nation takes no cut.', 'The free tools (invoice generator, late invoice kit, rate calculator and more) need no plan at all.'], cta: ['See the free tools', '/free-tools'] },
  5: { subject: 'Questions about SaaS Nation?', lines: ['If something is missing or confusing, just reply to this email. I read every reply.', 'If you buy a plan and it is not for you, you get a full refund if you ask within 14 days of your first payment.'], cta: ['See pricing', '/pricing'] },
}
export function renderWelcome(step: Step, o: { site: string; unsubUrl: string }): Mail {
  const c = COPY[step]
  const url = `${o.site}${c.cta[1]}`
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b"><div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff"><p style="font-weight:700;font-size:18px;margin:0 0 16px">SaaS Nation</p><h1 style="font-size:22px;margin:0 0 16px">${esc(c.subject)}</h1>${c.lines.map((l) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${esc(l)}</p>`).join('')}<p style="margin:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${esc(c.cta[0])}</a></p><p style="font-size:15px;margin:0 0 24px">Cooper, SaaS Nation (CF LLC, Arkansas)</p><p style="font-size:12px;color:#71717a;margin:0">You get this because you created a SaaS Nation account. <a href="${esc(o.unsubUrl)}" style="color:#71717a">Stop these emails</a>.</p></div></body></html>`
  const text = `${c.subject}\n\n${c.lines.join('\n\n')}\n\n${c.cta[0]}: ${url}\n\nCooper, SaaS Nation (CF LLC, Arkansas)\n\nStop these emails: ${o.unsubUrl}\n`
  return { subject: c.subject, html, text }
}
export const unsubUrl = (site: string, token: string) => `${site}/api/welcome/unsubscribe?t=${encodeURIComponent(token)}`
