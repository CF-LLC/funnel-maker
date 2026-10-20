'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAY_LINK_RE } from '@/lib/invoices/core'

export default function SettingsPage() {
  const supabase = createClient() as any
  const [f, setF] = useState({ business_name: '', business_email: '', business_address: '', pay_link: '', currency: 'USD' })
  const [msg, setMsg] = useState('')
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser(); setUid(user?.id ?? null)
      const { data } = await supabase.from('inv_profiles').select('*').maybeSingle()
      if (data) setF({ business_name: data.business_name, business_email: data.business_email, business_address: data.business_address, pay_link: data.pay_link || '', currency: data.currency })
      else if (user?.email) setF((x) => ({ ...x, business_email: user.email! }))
    })() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('')
    if (f.pay_link && !PAY_LINK_RE.test(f.pay_link.trim())) { setMsg('Pay link must be a Stripe Payment Link (https://buy.stripe.com/...)'); return }
    if (!/^[A-Za-z]{3}$/.test(f.currency)) { setMsg('Currency must be a 3-letter code like USD'); return }
    const { error } = await supabase.from('inv_profiles').upsert({ user_id: uid, ...f, currency: f.currency.toUpperCase(), pay_link: f.pay_link.trim() || null })
    setMsg(error ? 'Could not save' : 'Saved')
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-3 rounded-xl border bg-background p-5">
      <h1 className="text-lg font-bold">Business details</h1>
      <p className="text-sm text-muted-foreground">These fill in new invoices. Your branding, your Stripe account: clients pay you directly.</p>
      <label className="block text-sm"><span className="font-medium">Business name</span><Input className="mt-1" value={f.business_name} onChange={set('business_name')} /></label>
      <label className="block text-sm"><span className="font-medium">Business email (reminders go here)</span><Input className="mt-1" type="email" value={f.business_email} onChange={set('business_email')} /></label>
      <label className="block text-sm"><span className="font-medium">Address</span><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={2} value={f.business_address} onChange={set('business_address')} /></label>
      <label className="block text-sm"><span className="font-medium">Default Stripe Payment Link (optional)</span><Input className="mt-1" placeholder="https://buy.stripe.com/..." value={f.pay_link} onChange={set('pay_link')} />
        <span className="text-xs text-muted-foreground">Create it in your own Stripe dashboard (customer chooses amount, or one link per package). Shown as the Pay button.</span></label>
      <label className="block text-sm"><span className="font-medium">Currency</span><Input className="mt-1 w-24" maxLength={3} value={f.currency} onChange={set('currency')} /></label>
      {msg && <p className="text-sm" role="status">{msg}</p>}
      <Button type="submit">Save</Button>
    </form>
  )
}
