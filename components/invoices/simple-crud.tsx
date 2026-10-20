'use client'
// Small CRUD list used by Clients and Saved items.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type Field = { key: string; label: string; type?: 'text' | 'email' | 'money' | 'textarea'; required?: boolean }

export function SimpleCrud({ table, title, fields, display }: { table: 'inv_clients' | 'inv_items'; title: string; fields: Field[]; display: (r: any) => React.ReactNode }) {
  const supabase = createClient() as any
  const empty = Object.fromEntries(fields.map((f) => [f.key, '']))
  const [rows, setRows] = useState<any[] | null>(null)
  const [form, setForm] = useState<Record<string, string>>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false })
    if (error) setError('Could not load'); setRows(data || [])
  }
  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toRow = () => {
    const r: Record<string, unknown> = {}
    for (const f of fields) {
      const v = (form[f.key] || '').trim()
      if (f.required && !v) throw new Error(`${f.label} is required`)
      if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`${f.label} is not a valid email`)
      if (f.type === 'money') { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`${f.label} must be a number`); r[f.key] = Math.round(n * 100) }
      else r[f.key] = v || null
    }
    return r
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    let row; try { row = toRow() } catch (err: any) { setError(err.message); return }
    const q = editing ? supabase.from(table).update(row).eq('id', editing) : supabase.from(table).insert(row)
    const { error } = await q
    if (error) { setError('Could not save'); return }
    setForm(empty); setEditing(null); load()
  }
  const edit = (r: any) => {
    setEditing(r.id)
    setForm(Object.fromEntries(fields.map((f) => [f.key, f.type === 'money' ? (Number(r[f.key]) / 100).toFixed(2) : r[f.key] ?? ''])))
  }
  const remove = async (id: string) => {
    if (!confirm('Remove this entry? Existing invoices keep their copy.')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setError('Could not remove'); load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={save} className="space-y-3 rounded-xl border bg-background p-4 h-fit">
        <h1 className="text-lg font-bold">{editing ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}</h1>
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="font-medium">{f.label}{f.required ? '' : ' (optional)'}</span>
            {f.type === 'textarea'
              ? <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={2} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              : <Input className="mt-1" inputMode={f.type === 'money' ? 'decimal' : undefined} type={f.type === 'email' ? 'email' : 'text'} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
          </label>
        ))}
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <div className="flex gap-2"><Button type="submit">{editing ? 'Save' : 'Add'}</Button>
          {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(empty) }}>Cancel</Button>}</div>
      </form>
      <div className="rounded-xl border bg-background">
        {rows === null ? <p className="p-4 text-sm">Loading…</p> : rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nothing saved yet.</p> :
          <ul className="divide-y">{rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 p-3 text-sm">
              <div className="flex-1 min-w-0">{display(r)}</div>
              <Button size="sm" variant="outline" onClick={() => edit(r)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Remove</Button>
            </li>))}</ul>}
      </div>
    </div>
  )
}
