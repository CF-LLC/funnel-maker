import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { isDemoUser } from '@/lib/demo'
import { hasAccess } from '@/lib/access'
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
  return <ContactDetail contact={data.contact} activities={data.activities} notes={data.notes} demo={demo} />
}
