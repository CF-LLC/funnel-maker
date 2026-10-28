// Sample data for the demo account. Nothing here is real and nothing is ever sent.
import type { Broadcast, Settings, Subscriber } from './core'

const NAMES = ['Maya Lopez', 'Sam Carter', 'Priya Shah', 'Jordan Lee', 'Ava Brooks', 'Noah Kim', 'Ella Ruiz', 'Liam Ortiz', 'Zoe Patel', 'Owen Hart', 'Mia Chen', 'Leo Grant']
export function demoSubscribers(now = Date.now()): Subscriber[] {
  return NAMES.map((n, i) => {
    const status = i === 3 ? 'pending' : i === 7 ? 'unsubscribed' : 'subscribed'
    const created = new Date(now - (i * 2.3 + 0.4) * 86_400_000).toISOString()
    return {
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, email: `${n.split(' ')[0].toLowerCase()}@example.com`, name: n,
      tags: [i % 2 ? 'coaching' : 'newsletter', ...(i % 3 === 0 ? ['vip'] : [])], status, source: i % 4 === 0 ? 'import' : 'form',
      consent: i % 4 === 0 ? 'owner_attested' : 'double_opt_in', consent_at: created, consent_detail: i % 4 === 0 ? 'Imported from CSV' : 'Signup page',
      created_at: created, confirmed_at: status === 'pending' ? null : created, unsubscribed_at: status === 'unsubscribed' ? new Date(now - 86_400_000).toISOString() : null,
      unsub_broadcast_id: status === 'unsubscribed' ? 'demo-1' : null,
    } as Subscriber
  })
}
export const demoSettings = (): Settings => ({ slug: 'demo-coach', from_name: 'Demo Coach', reply_to: 'hello@example.com', mailing_address: '123 Example St, Suite 1, Austin, TX 78701', page_title: 'Weekly coaching notes', page_blurb: 'One short email every Sunday with what is working for my clients.', double_opt_in: true, daily_cap: 200, sending_enabled: false })
export function demoBroadcasts(now = Date.now()): Broadcast[] {
  const d = (n: number) => new Date(now - n * 86_400_000).toISOString()
  return [
    { id: 'demo-2', subject: 'Three questions to ask before every sales call', preheader: 'Steal my checklist', body: 'Hi friend,\n\nBefore every call I ask myself three things:\n\n- What does this person want?\n- What is stopping them?\n- What is the smallest next step?\n\nTalk soon,\nDemo Coach', tag: null, status: 'draft', recipients: 0, sent_count: 0, failed_count: 0, sent_at: null, created_at: d(0.2), updated_at: d(0.2) },
    { id: 'demo-1', subject: 'My new booking page is live', preheader: 'Grab a free 15-minute slot', body: 'Hi friend,\n\nYou can now **book a call** with me in two clicks.\n\n[Pick a time](https://saasnation.site)\n\nDemo Coach', tag: 'coaching', status: 'sent', recipients: 6, sent_count: 6, failed_count: 0, sent_at: d(3), created_at: d(4), updated_at: d(3) },
  ]
}
