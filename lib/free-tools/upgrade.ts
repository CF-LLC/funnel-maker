// Honest "Save this / Upgrade" copy per free tool: which paid SaaS Nation tool it maps to. No prices here beyond the locked ones.
const MAP: Record<string, { toolName: string; heading: string; body: string }> = {
  'invoice-generator': { toolName: 'Invoices', heading: 'Save invoices and get paid online', body: 'Invoices keeps your clients and invoices in one place, so you can resend, track and mark them paid instead of starting over each time.' },
  'late-invoice-kit': { toolName: 'Invoices', heading: 'Stop chasing late invoices by hand', body: 'Invoices keeps every invoice and its status in one place, so you can see what is overdue and follow up from there.' },
  'hourly-rate-calculator': { toolName: 'Proposals', heading: 'Turn your rate into a proposal', body: 'Proposals lets you send a priced proposal your client can accept online, then bill it with Invoices.' },
  'utm-builder': { toolName: 'Funnel Maker', heading: 'Send tagged links to a page that converts', body: 'Funnel Maker lets you build a simple landing page with a lead form, so your tagged traffic has somewhere to land.' },
  'qr-code-generator': { toolName: 'Link-in-bio', heading: 'Point your QR code at a page you can edit', body: 'Link-in-bio gives you one page for all your links, so you can change where people land without reprinting the code.' },
  'email-signature-generator': { toolName: 'Email list', heading: 'Turn replies into an email list', body: 'Email list lets you collect subscribers with a signup form and keep them in one place.' },
}
export function upgradeFor(slug: string) {
  const u = MAP[slug] ?? { toolName: 'Each tool', heading: 'Save your work with SaaS Nation', body: 'A SaaS Nation account keeps your work saved in one place.' }
  // Link-in-bio isn't sold alone: it comes with any paid tool.
  const priceNote = u.toolName === 'Link-in-bio'
    ? 'Link-in-bio is included with any paid tool ($12/mo or $99/yr each). All Access (every tool): $29/mo or $249/yr. This free tool stays free.'
    : `${u.toolName}: $12/mo or $99/yr. All Access (every tool): $29/mo or $249/yr. This free tool stays free.`
  return { ...u, priceNote }
}
export const UPGRADE_SLUGS = Object.keys(MAP)
