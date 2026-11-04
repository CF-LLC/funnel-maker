// Setup checklist (workspace_v2): pure step builder. No I/O. Done flags come from real rows only.

export type SetupTool = 'crm' | 'invoices' | 'proposals' | 'funnels' | 'forms' | 'booking'
export const SETUP_TOOLS: readonly SetupTool[] = ['crm', 'invoices', 'proposals', 'funnels', 'forms', 'booking']

/** Raw facts from the loader. Missing/false = not done (or that tool's query failed). */
export type SetupFacts = Partial<{ client: boolean; sent: boolean; shared: boolean; paid: boolean }>

export type SetupStep = { id: 'client' | 'send' | 'share' | 'paid'; label: string; hint: string; href: string; cta: string; done: boolean; locked: boolean }

const LOCKED_HINT = 'Needs a tool you don’t have yet. Each tool is $12/mo, or get All Access.'

/** Four steps in order. A step whose tools the user lacks links to /pricing with plain wording. */
export function buildSetup(f: SetupFacts, access: ReadonlySet<string>): SetupStep[] {
  const has = (t: SetupTool) => access.has(t)
  const step = (id: SetupStep['id'], label: string, done: boolean | undefined, href: string | null, hint: string, cta: string): SetupStep =>
    href ? { id, label, hint, href, cta, done: !!done, locked: false } : { id, label, hint: LOCKED_HINT, href: '/pricing', cta: 'See plans', done: !!done, locked: true }

  const clientHref = has('crm') ? '/crm/new' : has('invoices') ? '/invoices/clients' : null
  const sendHref = has('proposals') ? '/proposals' : has('invoices') ? '/invoices' : null
  const shareHref = has('booking') ? '/booking' : has('forms') ? '/forms' : has('funnels') ? '/funnels' : null
  const shareName = has('booking') ? 'a booking page' : has('forms') ? 'a form' : 'a funnel'
  return [
    step('client', 'Add your first client', f.client, clientHref, 'Save a client with their email so everything links up.', 'Add a client'),
    step('send', 'Send a proposal or invoice', f.sent, sendHref, has('proposals') ? 'Start with a proposal, then turn it into an invoice.' : 'Create your first invoice.', has('proposals') ? 'New proposal' : 'New invoice'),
    step('share', 'Share a way for clients to reach you', f.shared, shareHref, `Publish ${shareName} and share the link.`, 'Set it up'),
    step('paid', 'Get paid', f.paid, has('invoices') ? '/invoices' : null, 'Add your payment link in invoice settings, or mark an invoice paid.', 'Open invoices'),
  ]
}

export const setupComplete = (steps: SetupStep[]) => steps.every((s) => s.done)
