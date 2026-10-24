import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { FormEditor } from '@/components/forms/form-editor'
import { fieldSchema, publicFormPath, responseMailto, type Field } from '@/lib/forms/core'

export const dynamic = 'force-dynamic'

export default async function FormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(formId)) notFound()
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = supabase as any
  const { data: form } = await db.from('frm_forms').select('*').eq('id', formId).maybeSingle()
  if (!form) notFound()
  const [{ data: rows }, { data: profile }] = await Promise.all([
    db.from('frm_responses').select('id, created_at, data').eq('form_id', formId).order('created_at', { ascending: false }).limit(200),
    db.from('lib_profiles').select('handle').eq('user_id', user!.id).maybeSingle(),
  ])
  const fields: Field[] = (form.fields || []).map((f: unknown) => fieldSchema.safeParse(f)).filter((r: any) => r.success).map((r: any) => r.data)
  const show = (v: unknown) => (v === true ? 'Yes' : v === false ? 'No' : String(v ?? ''))
  return (
    <div className="space-y-8">
      <FormEditor initial={{ ...form, fields }} handle={profile?.handle || null} />
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Responses ({rows?.length || 0}{rows?.length === 200 ? '+' : ''})</h2>
          <a href={`/api/forms/${formId}/csv`} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Export CSV</a>
        </div>
        {profile?.handle && form.published && <p className="text-sm text-muted-foreground">Public page: <a className="text-primary hover:underline" href={publicFormPath(profile.handle, form.slug)} target="_blank">{publicFormPath(profile.handle, form.slug)}</a>. Embed in a funnel step by pasting this path into its &quot;Embed a form&quot; field.</p>}
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left">{['Submitted', ...fields.map((f) => f.label), ''].map((h, i) => <th key={i} className="p-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {(rows || []).map((r: any) => (
                <tr key={r.id} className="border-b align-top">
                  <td className="p-2 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}</td>
                  {fields.map((f) => <td key={f.id} className="p-2 max-w-xs break-words">{show(r.data?.[f.id])}</td>)}
                  <td className="p-2">{user?.email && <a href={responseMailto(user.email, form.title, fields, r)} className="text-primary hover:underline whitespace-nowrap">Email to me</a>}</td>
                </tr>
              ))}
              {!rows?.length && <tr><td className="p-4 text-muted-foreground" colSpan={fields.length + 2}>No responses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
