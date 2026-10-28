'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { paginate } from '@/lib/admin/core'

export type Cell = string | { text: string; tone?: 'muted' | 'strong' | 'pill' }
export type Row = { id: string; cells: Cell[]; href?: string; search?: string }

/** Searchable, paginated table that turns into stacked cards on phones. Rows are plain data (server -> client safe). */
export function DataTable({ columns, rows, pageSize = 10, empty = 'Nothing here yet.', placeholder = 'Search' }: { columns: string[]; rows: Row[]; pageSize?: number; empty?: string; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? rows.filter((r) => (r.search ?? r.cells.map((c) => (typeof c === 'string' ? c : c.text)).join(' ')).toLowerCase().includes(s)) : rows
  }, [rows, q])
  const pg = paginate(filtered, page, pageSize)
  const txt = (c: Cell) => (typeof c === 'string' ? c : c.text)
  const cls = (c: Cell) => (typeof c === 'string' ? 'text-zinc-300' : c.tone === 'muted' ? 'text-zinc-500' : c.tone === 'strong' ? 'font-semibold text-white' : c.tone === 'pill' ? 'inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-white/10' : 'text-zinc-300')
  return (
    <div>
      <label className="relative mb-3 block">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder={placeholder} className="cine-input w-full !py-2 !pl-9 !text-sm" />
      </label>
      {pg.total === 0 ? <p className="py-6 text-center text-sm text-zinc-500">{q ? 'No matches.' : empty}</p> : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-500">{columns.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr></thead>
              <tbody>
                {pg.items.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    {r.cells.map((c, i) => (
                      <td key={i} className="px-3 py-2.5 align-top">
                        {i === 0 && r.href ? <Link href={r.href} className={`${cls(c)} hover:underline`}>{txt(c)}</Link> : <span className={cls(c)}>{txt(c)}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {pg.items.map((r) => {
              const body = (
                <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                  <div className={`${cls(r.cells[0])} truncate`}>{txt(r.cells[0])}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {r.cells.slice(1).map((c, i) => txt(c) ? <span key={i} className={cls(c)}><span className="text-zinc-600">{columns[i + 1]}: </span>{txt(c)}</span> : null)}
                  </div>
                </div>
              )
              return <li key={r.id}>{r.href ? <Link href={r.href} className="block">{body}</Link> : body}</li>
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
            <span>{pg.total} {pg.total === 1 ? 'row' : 'rows'}</span>
            <div className="flex items-center gap-2">
              <button aria-label="Previous page" disabled={pg.page <= 1} onClick={() => setPage(pg.page - 1)} className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/15 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span>{pg.page} / {pg.pages}</span>
              <button aria-label="Next page" disabled={pg.page >= pg.pages} onClick={() => setPage(pg.page + 1)} className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/15 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
