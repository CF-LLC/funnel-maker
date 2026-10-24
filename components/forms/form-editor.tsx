'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FIELD_LABELS, FIELD_TYPES, formSchema, MAX_FIELDS, type Field, type FieldType } from '@/lib/forms/core'

type FormRow = { id: string; slug: string; title: string; description: string; submit_label: string; fields: Field[]; published: boolean }

export function FormEditor({ initial, handle }: { initial: FormRow; handle: string | null }) {
  const router = useRouter()
  const [f, setF] = useState<FormRow>(initial)
  const [msg, setMsg] = useState('')
  const setField = (i: number, patch: Partial<Field>) => setF({ ...f, fields: f.fields.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= f.fields.length) return
    const n = [...f.fields]; [n[i], n[j]] = [n[j], n[i]]; setF({ ...f, fields: n })
  }
  const add = () => f.fields.length < MAX_FIELDS && setF({ ...f, fields: [...f.fields, { id: `f${Date.now().toString(36)}`, type: 'short_text', label: 'New field', required: false }] })

  async function save() {
    setMsg('')
    const r = formSchema.safeParse(f)
    if (!r.success) return setMsg(r.error.issues[0]?.message || 'Check the form')
    const { error } = await (createClient() as any).from('frm_forms').update({ ...r.data, updated_at: new Date().toISOString() }).eq('id', f.id)
    if (error) return setMsg(error.code === '23505' ? 'You already have a form with that name' : error.message)
    setF({ ...f, slug: r.data.slug }); setMsg('Saved'); router.refresh()
  }

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="t">Title</Label><Input id="t" value={f.title} maxLength={100} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><Label htmlFor="s">Form name (URL)</Label><Input id="s" value={f.slug} maxLength={60} onChange={(e) => setF({ ...f, slug: e.target.value })} />
          <p className="text-xs text-muted-foreground">saasnation.site/@{handle || 'handle'}/{f.slug || 'form-name'}</p></div>
      </div>
      <div><Label htmlFor="d">Description</Label><Textarea id="d" rows={2} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Fields ({f.fields.length}/{MAX_FIELDS})</h3>
        {f.fields.map((x, i) => (
          <div key={x.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
            <Input className="flex-1 min-w-[8rem]" aria-label="Label" value={x.label} maxLength={100} onChange={(e) => setField(i, { label: e.target.value })} />
            <select aria-label="Type" className="h-10 rounded-md border bg-background px-2 text-sm" value={x.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_LABELS[t]}</option>)}
            </select>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={x.required} onChange={(e) => setField(i, { required: e.target.checked })} />Required</label>
            <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Remove field" onClick={() => setF({ ...f, fields: f.fields.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
            {x.type === 'dropdown' && (
              <Input className="w-full" placeholder="Options, comma separated" value={(x.options || []).join(', ')}
                onChange={(e) => setField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} />
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} disabled={f.fields.length >= MAX_FIELDS}>Add field</Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-48"><Label htmlFor="b">Button text</Label><Input id="b" value={f.submit_label} maxLength={40} onChange={(e) => setF({ ...f, submit_label: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />Published</label>
        <Button onClick={save}>Save form</Button>
        {msg && <span role="status" className="text-sm">{msg}</span>}
      </div>
    </section>
  )
}
