'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Download, Search, CalendarClock, Users } from 'lucide-react'
import { CRM_STATUSES, SOURCES, STATUS_LABEL, SOURCE_LABEL, contactHref, filterContacts, type Contact } from '@/lib/crm/core'
import { Avatar, SourceBadge, StatusPill, money, shortDate } from './bits'

export function ContactList({ contacts, demo, today }: { contacts: Contact[]; demo: boolean; today: string }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [tag, setTag] = useState('')
  const [due, setDue] = useState(false)
  const tags = useMemo(() => [...new Set(contacts.flatMap((c) => c.tags))].sort(), [contacts])
  const list = useMemo(() => filterContacts(contacts, { q, status, source, tag, due }, today), [contacts, q, status, source, tag, due, today])
  const dueCount = contacts.filter((c) => c.followUpOn && c.followUpOn <= today).length
  const stat = (label: string, v: string | number) => (
    <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10"><div className="text-2xl font-black tracking-tight sm:text-3xl">{v}</div><div className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</div></div>
  )
  const exportHref = `/api/crm/export?${new URLSearchParams({ q, status, source, tag, ...(due ? { due: '1' } : {}) })}`
  const sel = 'cine-input !py-2 !text-sm'
  return (
    <div className="space-y-6">
      <section className="cine-hero relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 sm:p-8" style={{ background: 'radial-gradient(120% 140% at 0% 0%, #be123c55, transparent 55%), radial-gradient(120% 120% at 100% 100%, #4338ca55, transparent 60%), #111116' }}>
        <div className="cine-grain" />
        <p className="relative text-xs font-bold uppercase tracking-[.25em] text-rose-300">Client list</p>
        <h1 className="relative mt-2 text-3xl font-black tracking-tight sm:text-4xl">Everyone you work with, in one place</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-zinc-300">Pulled automatically from your Forms, funnel leads, Bookings, Proposals and Invoices. Add a status, tags, notes and a follow-up date.</p>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stat('Contacts', contacts.length)}
          {stat('Leads', contacts.filter((c) => c.status === 'lead').length)}
          {stat('Active', contacts.filter((c) => c.status === 'active').length)}
          {stat('Follow-ups due', dueCount)}
        </div>
      </section>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, company, tag" className="cine-input !py-2 !pl-9 !text-sm" />
        </label>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}><option value="">All statuses</option>{CRM_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          <select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)} className={sel}><option value="">All sources</option>{SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}</select>
          <select aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} className={sel}><option value="">All tags</option>{tags.map((t) => <option key={t} value={t}>#{t}</option>)}</select>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-pressed={due} onClick={() => setDue(!due)} className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition lg:flex-none ${due ? 'bg-amber-400 text-black ring-amber-300' : 'text-zinc-200 ring-white/15 hover:ring-white/40'}`}><CalendarClock className="h-4 w-4" />Due{dueCount ? ` (${dueCount})` : ''}</button>
          <a href={exportHref} className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 lg:flex-none"><Download className="h-4 w-4" />Export CSV</a>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="cine-glass rounded-2xl p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 text-lg font-bold">No clients yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">When someone fills one of your forms, books a call, gets a proposal or an invoice, they show up here automatically.</p>
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-2xl bg-white/[0.03] p-8 text-center text-sm text-zinc-400 ring-1 ring-white/10">No contacts match these filters.</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl ring-1 ring-white/10">
          <li className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1.4fr_1fr_1fr] gap-4 bg-white/[0.03] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 md:grid">
            <span>Contact</span><span>Status</span><span>Sources</span><span>Last activity</span><span className="text-right">Paid / invoiced</span>
          </li>
          {list.map((c) => {
            const overdue = c.followUpOn && c.followUpOn <= today
            return (
              <li key={c.email} className="border-t border-white/5 first:border-t-0">
                <Link href={contactHref(c.email)} className="group grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 transition hover:bg-white/[0.04] md:grid-cols-[minmax(0,2.2fr)_1fr_1.4fr_1fr_1fr] md:gap-4">
                  <span className="flex min-w-0 items-center gap-3 md:col-span-1">
                    <Avatar name={c.name} email={c.email} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold group-hover:text-rose-200">{c.name || c.email}</span>
                      <span className="block truncate text-xs text-zinc-400">{c.name ? c.email : ''}{c.company ? `${c.name ? ' · ' : ''}${c.company}` : ''}</span>
                    </span>
                  </span>
                  <span className="justify-self-end md:justify-self-start"><StatusPill s={c.status} /></span>
                  <span className="col-span-2 flex flex-wrap items-center gap-1 md:col-span-1">
                    {c.sources.map((s) => <SourceBadge key={s} s={s} n={c.counts[s]} />)}
                    {c.tags.slice(0, 3).map((t) => <span key={t} className="text-[11px] text-zinc-400">#{t}</span>)}
                  </span>
                  <span className="text-xs text-zinc-400 md:text-sm">
                    {shortDate(c.lastActivity)}
                    {c.followUpOn && <span className={`ml-2 inline-flex items-center gap-1 text-[11px] font-semibold md:ml-0 md:block ${overdue ? 'text-amber-300' : 'text-zinc-500'}`}><CalendarClock className="inline h-3 w-3" />Follow up {shortDate(c.followUpOn + 'T12:00:00Z')}</span>}
                  </span>
                  <span className="justify-self-end text-right text-xs text-zinc-300 md:text-sm">{c.invoicedCents ? <><span className="font-semibold text-white">{money(c.paidCents, c.currency)}</span><span className="text-zinc-500"> / {money(c.invoicedCents, c.currency)}</span></> : <span className="text-zinc-600">-</span>}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {demo && <p className="text-center text-xs text-zinc-500">Sample data for the demo account.</p>}
    </div>
  )
}
