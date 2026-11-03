'use client'
// "Pick a client" search (workspace_v2). Calls onPick with a CRM client's name + normalized email.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { filterPicker, type PickerClient } from '@/lib/clients/picker-core'

export function ClientPicker({ clients, onPick, disabled }: { clients: PickerClient[]; onPick: (c: PickerClient) => void; disabled?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const hits = useMemo(() => filterPicker(clients, q), [clients, q])
  if (clients.length === 0) return <p className="text-xs text-muted-foreground">No clients yet. Type a name and email below, or add clients in <Link href="/crm" className="underline">Clients</Link>.</p>
  return (
    <div className="relative">
      <label className="block text-sm"><span className="font-medium">Pick a client</span>
        <input type="search" role="combobox" aria-expanded={open} aria-controls="client-picker-list" aria-autocomplete="list" disabled={disabled}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Search your clients by name or email"
          value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      </label>
      {open && hits.length > 0 && (
        <ul id="client-picker-list" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-lg">
          {hits.map((c) => (
            <li key={c.email} role="option" aria-selected={false}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(c); setQ(''); setOpen(false) }}>
                <span className="font-medium">{c.name || c.email}</span>
                <span className="block text-xs text-muted-foreground">{c.email}{c.company ? ` · ${c.company}` : ''}</span>
              </button>
            </li>))}
        </ul>)}
      {open && hits.length === 0 && <p className="mt-1 text-xs text-muted-foreground">No match. Type the name and email below instead.</p>}
    </div>
  )
}
