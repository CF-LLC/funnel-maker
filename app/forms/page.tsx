import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { NewFormButton } from '@/components/forms/new-form'
import { publicFormPath } from '@/lib/forms/core'

export const dynamic = 'force-dynamic'

export default async function FormsHome() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = supabase as any
  const [{ data: forms }, { data: profile }] = await Promise.all([
    db.from('frm_forms').select('id, slug, title, published, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }),
    db.from('lib_profiles').select('handle').eq('user_id', user!.id).maybeSingle(),
  ])
  const ids = (forms || []).map((f: any) => f.id)
  const { data: resp } = ids.length ? await db.from('frm_responses').select('form_id').in('form_id', ids) : { data: [] }
  const counts: Record<string, number> = {}
  for (const r of resp || []) counts[r.form_id] = (counts[r.form_id] || 0) + 1
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Forms</h1><NewFormButton userId={user!.id} /></div>
      {!profile?.handle && <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">Public form pages use your handle (saasnation.site/@handle/form-name). <Link href="/links" className="underline">Set your handle in Link-in-bio</Link>.</p>}
      <ul className="divide-y rounded-xl border bg-background">
        {(forms || []).map((f: any) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 p-4">
            <Link href={`/forms/${f.id}`} className="font-semibold hover:underline">{f.title}</Link>
            <span className={`rounded-full px-2 text-xs ${f.published ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>{f.published ? 'Published' : 'Draft'}</span>
            {profile?.handle && f.published && <a href={publicFormPath(profile.handle, f.slug)} target="_blank" className="text-xs text-primary hover:underline">{publicFormPath(profile.handle, f.slug)} ↗</a>}
            <span className="ml-auto text-sm text-muted-foreground">{counts[f.id] || 0} responses</span>
          </li>
        ))}
        {!forms?.length && <li className="p-4 text-sm text-muted-foreground">No forms yet.</li>}
      </ul>
    </div>
  )
}
