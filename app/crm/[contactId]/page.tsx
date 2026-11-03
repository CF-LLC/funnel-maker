import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { accessibleTools, hasAccess } from '@/lib/access'
import { isUserFlagEnabled } from '@/lib/flags'
import { loadClientWorkspace } from '@/lib/clients/workspace'
import { WS_TOOLS, visibleTools, type WsSection } from '@/lib/clients/workspace-core'
import { normEmail } from '@/lib/crm/core'
import { loadContact } from '@/lib/crm/load'
import { DEMO_ACTIVITIES, DEMO_NOTES, demoContacts } from '@/lib/crm/demo'
import { ContactDetail } from '@/components/crm/contact-detail'

export const dynamic = 'force-dynamic'

export default async function ContactPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params
  let raw = contactId; try { raw = decodeURIComponent(contactId) } catch { /* keep raw */ }
  const email = normEmail(raw)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demo = isDemoUser(user!.id)
  if (!demo && !(await hasAccess(user, 'crm'))) return null
  const data = !email ? null : demo
    ? { contact: demoContacts().find((c) => c.email === email) || null, activities: DEMO_ACTIVITIES.filter((a) => a.email === email).sort((a, b) => (a.at < b.at ? 1 : -1)), notes: email === 'maya.lopez@example.com' ? DEMO_NOTES : [] }
    : await loadContact(user!.id, email)
  if (!data?.contact) return (
    <div className="cine-glass mx-auto mt-10 max-w-lg rounded-2xl p-6 text-center">
      <h1 className="text-xl font-bold">Contact not found</h1>
      <p className="mt-2 text-sm text-zinc-400">Nobody with that email is in your client list.</p>
      <Link href="/crm" className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">Back to clients</Link>
    </div>
  )
  // workspace_v2 (default off): extra tool sections, only for tools the viewer can open. Off = page unchanged.
  let workspace: WsSection[] | undefined
  let nextSteps: { href: string; label: string }[] | undefined
  if (!demo && (await isUserFlagEnabled('workspace_v2', user!.id))) {
    const tools = visibleTools(await accessibleTools(user, WS_TOOLS))
    workspace = await loadClientWorkspace(supabase, user!.id, data.contact.email, tools)
    // Next-step links (no prefill: the editors do not read a query string; the "Pick a client" picker finds this client).
    const own = await accessibleTools(user, ['invoices', 'proposals'] as const)
    nextSteps = [
      ...(own.has('invoices') ? [{ href: '/invoices/new', label: 'New invoice' }] : []),
      ...(own.has('proposals') ? [{ href: '/proposals/new', label: 'New proposal' }] : []),
    ]
  }
  return <ContactDetail contact={data.contact} activities={data.activities} notes={data.notes} demo={demo} workspace={workspace} nextSteps={nextSteps} />
}
