'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Copy, Eye, FileDown, FileSpreadsheet, ImagePlus, Link2, Mail, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { api, btnDanger, btnGhost, btnPrimary, card, input, Modal } from '@/components/emaillist/ui'
import { ReportView } from '@/components/reports/report-view'
import { DEMO_NOTE, useToast } from '@/components/reports/app'
import {
  MAX_FILE_BYTES, MAX_KPIS, addMonths, clientUrl, fmtValue, isMonth, mailtoInvite, monthLabel, monthOf, parseNumber, parseTemplate, reportView, slotRanges, thisMonth, valuesFromCsv,
  type Client, type Image, type Kpi, type Report, type Section, type Template,
} from '@/lib/reports/core'

type Img = Image & { url?: string | null }
type Data = { demo: boolean; client: Client; reports: Report[]; images: Image[] }
type Draft = { title: string; values: Record<string, string>; notes: string; shared: boolean }
const toDraft = (r: Report): Draft => ({ title: r.title, notes: r.notes || '', shared: r.shared, values: Object.fromEntries(r.layout.kpis.map((k) => [k.key, r.kpi_values?.[k.key] == null ? '' : String(r.kpi_values[k.key])])) })

export function ClientWorkspace({ id }: { id: string }) {
  const [d, setD] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'month' | 'template' | 'link'>('month')
  const [sel, setSel] = useState<string | null>(null)
  const [toastEl, setToast] = useToast()
  const load = useCallback(async () => {
    const r = await api(`/api/reports/clients/${id}`, 'GET')
    if (!r.ok) return setErr(r.data.error || 'Could not load.')
    setD(r.data); setSel((s) => s && r.data.reports.some((x: Report) => x.id === s) ? s : r.data.reports[r.data.reports.length - 1]?.id || null)
  }, [id])
  useEffect(() => { load() }, [load])
  if (err) return <div className={`${card} mx-auto mt-10 max-w-md text-center`}>{err} <Link href="/reports" className="underline">Back</Link></div>
  if (!d) return <div className="mt-20 text-center text-zinc-500">Loading…</div>
  const report = d.reports.find((r) => r.id === sel) || null
  const setReport = (r: Report) => setD((x) => x && ({ ...x, reports: x.reports.some((y) => y.id === r.id) ? x.reports.map((y) => (y.id === r.id ? r : y)) : [...x.reports, r].sort((a, b) => a.month.localeCompare(b.month)) }))

  return (
    <div className="pb-24 sm:pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/15 via-zinc-950 to-black p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <Link href="/reports" className="relative text-xs text-zinc-400 hover:underline">← All clients</Link>
        <h1 className="relative mt-1 truncate text-2xl font-black sm:text-3xl">{d.client.name}</h1>
        <p className="relative mt-1 text-sm text-zinc-400">{d.reports.length} report{d.reports.length === 1 ? '' : 's'} · link {d.client.revoked ? 'turned off' : 'on'}{d.client.view_count ? ` · viewed ${d.client.view_count}×` : ''}</p>
        <div className="relative mt-4 flex gap-1 rounded-full border border-white/10 bg-black/40 p-1 text-sm" role="tablist">
          {([['month', 'Monthly report'], ['template', 'Template'], ['link', 'Client link']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-full px-3 py-2 font-semibold transition sm:flex-none ${tab === k ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'}`}>{l}</button>
          ))}
        </div>
      </section>
      <div className="mt-5">
        {tab === 'month' && <Months d={d} report={report} sel={sel} setSel={setSel} setReport={setReport} toast={setToast} onDeleted={(rid) => { setD((x) => x && ({ ...x, reports: x.reports.filter((r) => r.id !== rid) })); setSel(null) }} setImages={(f) => setD((x) => x && ({ ...x, images: f(x.images) }))} />}
        {tab === 'template' && <TemplateEditor d={d} report={report} toast={setToast} onSaved={(c) => setD((x) => x && ({ ...x, client: c }))} onReport={setReport} />}
        {tab === 'link' && <ClientLink d={d} toast={setToast} onSaved={(c) => setD((x) => x && ({ ...x, client: c }))} onDelete={() => { window.location.href = '/reports' }} />}
      </div>
      {toastEl}
    </div>
  )
}

function Months({ d, report, sel, setSel, setReport, toast, onDeleted, setImages }: { d: Data; report: Report | null; sel: string | null; setSel: (s: string) => void; setReport: (r: Report) => void; toast: (s: string) => void; onDeleted: (id: string) => void; setImages: (f: (i: Image[]) => Image[]) => void }) {
  const [making, setMaking] = useState(false)
  const last = d.reports[d.reports.length - 1]
  const nextYm = last ? addMonths(monthOf(last.month), 1) : addMonths(thisMonth(), -1)
  return (
    <div className="space-y-4">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        {d.reports.map((r) => (
          <button key={r.id} onClick={() => setSel(r.id)} aria-current={r.id === sel ? 'true' : undefined} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${r.id === sel ? 'border-sky-300 bg-sky-400/15 text-sky-100' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>
            {monthLabel(monthOf(r.month), 'short')}{r.shared ? ' · shared' : ''}
          </button>
        ))}
        <button className={`${btnPrimary} shrink-0 gap-1`} onClick={() => setMaking(true)}><Plus size={15} />New month</button>
      </div>
      {report ? <Editor key={report.id} d={d} report={report} setReport={setReport} toast={toast} onDeleted={onDeleted} setImages={setImages} />
        : <div className={`${card} text-center text-sm text-zinc-400`}>No reports yet. Start {monthLabel(nextYm)} from your template.</div>}
      <NewMonth open={making} onClose={() => setMaking(false)} d={d} defaultYm={nextYm} toast={toast} onMade={(r) => { setReport(r); setSel(r.id) }} />
    </div>
  )
}

function NewMonth({ open, onClose, d, defaultYm, toast, onMade }: { open: boolean; onClose: () => void; d: Data; defaultYm: string; toast: (s: string) => void; onMade: (r: Report) => void }) {
  const [ym, setYm] = useState(defaultYm)
  const last = d.reports[d.reports.length - 1]
  const [from, setFrom] = useState<string>(last?.id || '')
  useEffect(() => { if (open) { setYm(defaultYm); setFrom(last?.id || '') } }, [open, defaultYm, last?.id])
  const taken = d.reports.some((r) => monthOf(r.month) === ym)
  async function make(e: React.FormEvent) {
    e.preventDefault()
    if (!isMonth(ym) || taken) return
    if (d.demo) {
      const src = d.reports.find((r) => r.id === from)
      const r: Report = { id: `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`, client_id: d.client.id, month: `${ym}-01`, title: `${d.client.name}: ${monthLabel(ym)}`, layout: src?.layout || d.client.template, kpi_values: {}, notes: '', shared: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      onMade(r); toast(DEMO_NOTE); onClose(); return
    }
    const r = await api('/api/reports/reports', 'POST', { client_id: d.client.id, month: ym, from_report_id: from || undefined })
    if (!r.ok) return toast(r.data.error)
    onMade(r.data.report); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="New monthly report">
      <form onSubmit={make} className="space-y-3">
        <label className="block text-sm">Month<input type="month" className={`${input} mt-1`} value={ym} onChange={(e) => setYm(e.target.value)} required /></label>
        {taken && <p className="text-xs text-amber-300">There’s already a report for {monthLabel(ym)}.</p>}
        <label className="block text-sm">Start from
          <select className={`${input} mt-1`} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">The client’s template</option>
            {[...d.reports].reverse().map((r) => <option key={r.id} value={r.id}>Duplicate {monthLabel(monthOf(r.month))}</option>)}
          </select>
        </label>
        <p className="text-xs text-zinc-500">Same sections and numbers list; the values start blank and screenshots aren’t copied.</p>
        <button className={`${btnPrimary} w-full py-3`} disabled={taken}>Create {isMonth(ym) ? monthLabel(ym) : 'report'}</button>
      </form>
    </Modal>
  )
}

function Editor({ d, report, setReport, toast, onDeleted, setImages }: { d: Data; report: Report; setReport: (r: Report) => void; toast: (s: string) => void; onDeleted: (id: string) => void; setImages: (f: (i: Image[]) => Image[]) => void }) {
  const [dr, setDr] = useState<Draft>(() => toDraft(report))
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState(false)
  const [urls, setUrls] = useState<Record<number, string | null>>({})
  const csv = useRef<HTMLInputElement>(null)
  const imgs = d.images.filter((i) => i.report_id === report.id)
  useEffect(() => {
    if (!imgs.length) return
    api(`/api/reports/reports/${report.id}`, 'GET').then((r) => { if (r.ok) setUrls(Object.fromEntries(r.data.images.map((i: Img) => [i.slot, i.url || null]))) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, imgs.length])
  const ch = (f: (x: Draft) => Draft) => { setDr(f); setDirty(true) }
  const kpiVals = useMemo(() => Object.fromEntries(report.layout.kpis.map((k) => [k.key, parseNumber(dr.values[k.key]) ?? null])), [dr.values, report.layout.kpis])
  const bad = report.layout.kpis.find((k) => parseNumber(dr.values[k.key]) === undefined)
  const prev = d.reports.filter((r) => r.month < report.month).pop()

  async function save(extra: Partial<Draft> = {}) {
    const next = { ...dr, ...extra }
    if (bad) return toast(`“${bad.label}” needs a number.`)
    const body = { title: next.title, notes: next.notes, shared: next.shared, kpi_values: kpiVals }
    if (d.demo) { setReport({ ...report, ...body, kpi_values: kpiVals }); setDr(next); setDirty(false); return toast(DEMO_NOTE) }
    setBusy(true); const r = await api(`/api/reports/reports/${report.id}`, 'PATCH', body); setBusy(false)
    if (!r.ok) return toast(r.data.error)
    setReport(r.data.report); setDr(toDraft(r.data.report)); setDirty(false); toast(extra.shared === true ? 'Shared. Your client can see this month now.' : extra.shared === false ? 'Hidden from your client.' : 'Saved.')
  }
  async function onCsv(f: File) {
    if (f.size > 200_000) return toast('That CSV is too big (200 KB max).')
    const res = valuesFromCsv(await f.text(), report.layout.kpis)
    if (res.error) return toast(res.error)
    ch((x) => ({ ...x, values: { ...x.values, ...Object.fromEntries(Object.entries(res.values).map(([k, v]) => [k, String(v)])) } }))
    toast(`Filled ${res.matched.length} number${res.matched.length === 1 ? '' : 's'} from the CSV${res.unknown.length ? `; skipped ${res.unknown.slice(0, 3).join(', ')}` : ''}. Check them, then Save.`)
  }
  async function upload(slot: number, f: File) {
    if (!['image/png', 'image/jpeg'].includes(f.type)) return toast('Screenshots can be PNG or JPG.')
    if (f.size > MAX_FILE_BYTES) return toast('Screenshots can be up to 10 MB.')
    if (d.demo) return toast(DEMO_NOTE)
    const fd = new FormData(); fd.append('file', f); fd.append('slot', String(slot))
    toast('Uploading…')
    const r = await fetch(`/api/reports/reports/${report.id}/images`, { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}))
    if (!r.ok) return toast(j.error || 'Could not upload.')
    setImages((all) => [...all.filter((i) => !(i.report_id === report.id && i.slot === slot)), j.image]); setUrls((u) => ({ ...u, [slot]: j.image.url })); toast('Screenshot added.')
  }
  async function removeImg(slot: number) {
    if (d.demo) return toast(DEMO_NOTE)
    const r = await api(`/api/reports/reports/${report.id}/images?slot=${slot}`, 'DELETE'); if (!r.ok) return toast(r.data.error)
    setImages((all) => all.filter((i) => !(i.report_id === report.id && i.slot === slot)))
  }
  async function caption(slot: number, c: string) {
    if (d.demo) return
    const r = await api(`/api/reports/reports/${report.id}/images`, 'PATCH', { slot, caption: c }); if (r.ok) setImages((all) => all.map((i) => (i.report_id === report.id && i.slot === slot ? { ...i, caption: r.data.image.caption } : i)))
  }
  async function del() {
    if (!confirm(`Delete the ${monthLabel(monthOf(report.month))} report and its screenshots? This can’t be undone.`)) return
    if (!d.demo) { const r = await api(`/api/reports/reports/${report.id}`, 'DELETE'); if (!r.ok) return toast(r.data.error) } else toast(DEMO_NOTE)
    onDeleted(report.id)
  }
  const live = { ...report, title: dr.title, notes: dr.notes, kpi_values: kpiVals }
  const sections = reportView(live, d.reports, imgs.map((i) => ({ slot: i.slot, url: urls[i.slot] ?? (d.demo ? `/shots/reports-demo-${i.slot + 1}.svg` : null), caption: i.caption })))

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <section className={`${card} space-y-3`}>
          <label className="block text-xs text-zinc-400">Report title<input className={`${input} mt-1 text-base font-semibold`} value={dr.title} maxLength={160} onChange={(e) => ch((x) => ({ ...x, title: e.target.value }))} /></label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Numbers for {monthLabel(monthOf(report.month))}</h2>
            <button className={`${btnGhost} gap-1`} onClick={() => csv.current?.click()}><FileSpreadsheet size={15} />Fill from CSV</button>
            <input ref={csv} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onCsv(f) }} />
          </div>
          {report.layout.kpis.length === 0 && <p className="text-sm text-zinc-400">This report has no numbers. Add some in the Template tab.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {report.layout.kpis.map((k) => {
              const p = prev?.kpi_values?.[k.key]
              const invalid = parseNumber(dr.values[k.key]) === undefined
              return (
                <label key={k.key} className="block text-sm">
                  <span className="flex justify-between gap-2"><span className="truncate">{k.label}</span><span className="shrink-0 text-xs text-zinc-500">{p != null ? `last: ${fmtValue(p, k.format)}` : k.format}</span></span>
                  <input inputMode="decimal" className={`${input} mt-1 tabular-nums ${invalid ? 'border-rose-400/70' : ''}`} value={dr.values[k.key] ?? ''} placeholder={k.format === 'currency' ? '$0' : k.format === 'percent' ? '0%' : '0'} onChange={(e) => ch((x) => ({ ...x, values: { ...x.values, [k.key]: e.target.value } }))} aria-invalid={invalid} />
                </label>
              )
            })}
          </div>
          <p className="text-xs text-zinc-500">CSV: either “name,value” rows, or a header row of names and a row of numbers. Names must match the ones above.</p>
        </section>
        {report.layout.sections.some((s) => s.type === 'notes') && (
          <section className={`${card} space-y-2`}>
            <h2 className="font-semibold">{(report.layout.sections.find((s) => s.type === 'notes') as Extract<Section, { type: 'notes' }>).heading}</h2>
            <textarea className={`${input} min-h-[140px]`} maxLength={5000} value={dr.notes} onChange={(e) => ch((x) => ({ ...x, notes: e.target.value }))} placeholder="What you did, what moved, what’s next." />
          </section>
        )}
        {slotRanges(report.layout).map((r) => {
          const sec = report.layout.sections[r.index] as Extract<Section, { type: 'images' }>
          return (
            <section key={r.index} className={`${card} space-y-3`}>
              <h2 className="font-semibold">{sec.heading}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: r.slots }, (_, j) => r.start + j).map((slot) => {
                  const im = imgs.find((i) => i.slot === slot)
                  const url = urls[slot] ?? (d.demo && im ? `/shots/reports-demo-${slot + 1}.svg` : null)
                  return <Slot key={slot} slot={slot} im={im} url={url} onFile={(f) => upload(slot, f)} onRemove={() => removeImg(slot)} onCaption={(c) => caption(slot, c)} />
                })}
              </div>
              <p className="text-xs text-zinc-500">PNG or JPG, up to 10 MB each. Stored privately; your client sees them through links that expire after 2 minutes.</p>
            </section>
          )
        })}
      </div>
      <aside className="space-y-3 lg:sticky lg:top-20 lg:h-fit">
        <div className={`${card} space-y-3`}>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span><span className="block font-semibold">Show to client</span><span className="text-xs text-zinc-400">{dr.shared ? 'Visible on their private link.' : 'Hidden until you turn this on.'}</span></span>
            <input type="checkbox" role="switch" className="h-6 w-11 accent-sky-400" checked={dr.shared} onChange={(e) => save({ shared: e.target.checked })} />
          </label>
          <button className={`${btnPrimary} w-full py-3`} disabled={busy || !dirty} onClick={() => save()}>{busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
          <div className="grid grid-cols-2 gap-2">
            <button className={`${btnGhost} gap-1`} onClick={() => setPreview(true)}><Eye size={15} />Preview</button>
            <a className={`${btnGhost} gap-1`} href={`/api/reports/reports/${report.id}/pdf`}><FileDown size={15} />PDF</a>
          </div>
          <button className={`${btnGhost} w-full gap-1 text-rose-300`} onClick={del}><Trash2 size={15} />Delete this month</button>
        </div>
      </aside>
      {preview && (
        <Modal open onClose={() => setPreview(false)} title="What your client sees">
          <div className="-mx-1"><ReportView sections={sections} /></div>
        </Modal>
      )}
    </div>
  )
}

function Slot({ slot, im, url, onFile, onRemove, onCaption }: { slot: number; im?: Image; url: string | null; onFile: (f: File) => void; onRemove: () => void; onCaption: (c: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [cap, setCap] = useState(im?.caption || '')
  useEffect(() => setCap(im?.caption || ''), [im?.caption])
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {im ? (url ? <img src={url} alt={im.caption || `Screenshot ${slot + 1}`} className="h-40 w-full object-contain" /> : <div className="grid h-40 place-items-center text-xs text-zinc-500">{im.name}</div>)
        : <button onClick={() => ref.current?.click()} className="grid h-40 w-full place-items-center text-zinc-500 hover:bg-white/5"><span className="flex flex-col items-center gap-1 text-sm"><ImagePlus size={22} />Add screenshot</span></button>}
      <input ref={ref} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }} />
      {im && (
        <div className="flex items-center gap-2 p-2">
          <input className={`${input} py-1.5 text-xs`} placeholder="Caption" maxLength={200} value={cap} onChange={(e) => setCap(e.target.value)} onBlur={() => cap !== (im.caption || '') && onCaption(cap)} />
          <button className={`${btnGhost} px-2 py-1 text-xs`} onClick={() => ref.current?.click()}>Replace</button>
          <button className={`${btnGhost} px-2 py-1`} aria-label="Remove screenshot" onClick={onRemove}><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  )
}

const SECTION_NAMES: Record<Section['type'], string> = { title: 'Title', kpis: 'Number cards', chart: 'Chart', notes: 'Notes', images: 'Screenshots' }
function TemplateEditor({ d, report, toast, onSaved, onReport }: { d: Data; report: Report | null; toast: (s: string) => void; onSaved: (c: Client) => void; onReport: (r: Report) => void }) {
  const [t, setT] = useState<Template>(d.client.template)
  const [applyTo, setApplyTo] = useState(false)
  const setK = (i: number, p: Partial<Kpi>) => setT((x) => ({ ...x, kpis: x.kpis.map((k, j) => (j === i ? { ...k, ...p } : k)) }))
  const setS = (i: number, p: Partial<Section>) => setT((x) => ({ ...x, sections: x.sections.map((s, j) => (j === i ? ({ ...s, ...p } as Section) : s)) }))
  const move = (i: number, dir: -1 | 1) => setT((x) => { const s = [...x.sections]; const j = i + dir; if (j < 0 || j >= s.length) return x; [s[i], s[j]] = [s[j], s[i]]; return { ...x, sections: s } })
  async function save() {
    const p = parseTemplate(t); if (!p.ok) return toast(p.error)
    if (d.demo) { onSaved({ ...d.client, template: p.template }); return toast(DEMO_NOTE) }
    const r = await api(`/api/reports/clients/${d.client.id}`, 'PATCH', { template: p.template }); if (!r.ok) return toast(r.data.error)
    onSaved(r.data.client); setT(r.data.client.template)
    if (applyTo && report) { const r2 = await api(`/api/reports/reports/${report.id}`, 'PATCH', { layout: r.data.client.template }); if (r2.ok) onReport(r2.data.report); else return toast(r2.data.error) }
    toast(applyTo && report ? `Template saved and applied to ${monthLabel(monthOf(report.month))}.` : 'Template saved. New months will use it.')
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={`${card} space-y-3`}>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Numbers you report</h2><span className="text-xs text-zinc-500">{t.kpis.length}/{MAX_KPIS}</span></div>
        {t.kpis.map((k, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-white/10 p-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <input className={input} value={k.label} maxLength={60} onChange={(e) => setK(i, { label: e.target.value })} aria-label="Number name" />
            <button className={`${btnGhost} px-2`} aria-label={`Remove ${k.label}`} onClick={() => setT((x) => ({ ...x, kpis: x.kpis.filter((_, j) => j !== i) }))}><Trash2 size={14} /></button>
            <select className={`${input} sm:w-32`} value={k.format} onChange={(e) => setK(i, { format: e.target.value as Kpi['format'] })} aria-label="Format"><option value="number">Number</option><option value="currency">$ Money</option><option value="percent">% Percent</option></select>
            <select className={`${input} sm:w-36`} value={k.better} onChange={(e) => setK(i, { better: e.target.value as Kpi['better'] })} aria-label="Which way is good"><option value="up">Higher is better</option><option value="down">Lower is better</option></select>
          </div>
        ))}
        <button className={`${btnGhost} gap-1`} disabled={t.kpis.length >= MAX_KPIS} onClick={() => setT((x) => ({ ...x, kpis: [...x.kpis, { key: '', label: 'New number', format: 'number', better: 'up' }] }))}><Plus size={15} />Add number</button>
      </section>
      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold">Sections, in order</h2>
        {t.sections.map((s, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-white/10 p-2">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm font-semibold">{SECTION_NAMES[s.type]}</span>
              <button className={`${btnGhost} px-2`} aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
              <button className={`${btnGhost} px-2`} aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
              <button className={`${btnGhost} px-2`} aria-label="Remove section" onClick={() => setT((x) => ({ ...x, sections: x.sections.filter((_, j) => j !== i) }))}><Trash2 size={14} /></button>
            </div>
            {s.type === 'title' && <input className={input} placeholder="Small line above the title" value={s.subtitle} maxLength={120} onChange={(e) => setS(i, { subtitle: e.target.value })} />}
            {s.type === 'notes' && <input className={input} value={s.heading} maxLength={80} onChange={(e) => setS(i, { heading: e.target.value })} aria-label="Notes heading" />}
            {s.type === 'images' && <div className="grid grid-cols-[1fr_90px] gap-2"><input className={input} value={s.heading} maxLength={80} onChange={(e) => setS(i, { heading: e.target.value })} aria-label="Screenshots heading" /><select className={input} value={s.slots} onChange={(e) => setS(i, { slots: Number(e.target.value) })} aria-label="Image slots">{[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n} slot{n > 1 ? 's' : ''}</option>)}</select></div>}
            {s.type === 'chart' && (
              <div className="grid grid-cols-3 gap-2">
                <select className={`${input} col-span-3 sm:col-span-1`} value={s.kpi} onChange={(e) => setS(i, { kpi: e.target.value })} aria-label="Chart number">{t.kpis.map((k) => <option key={k.key || k.label} value={k.key}>{k.label}</option>)}</select>
                <select className={input} value={s.kind} onChange={(e) => setS(i, { kind: e.target.value as 'bar' | 'line' })} aria-label="Chart type"><option value="bar">Bars</option><option value="line">Line</option></select>
                <select className={input} value={s.months} onChange={(e) => setS(i, { months: Number(e.target.value) })} aria-label="Months shown">{[3, 6, 12].map((n) => <option key={n} value={n}>{n} months</option>)}</select>
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {(['kpis', 'chart', 'notes', 'images', 'title'] as const).map((ty) => (
            <button key={ty} className={`${btnGhost} gap-1 text-xs`} onClick={() => setT((x) => ({ ...x, sections: [...x.sections, ty === 'chart' ? { type: 'chart', kpi: x.kpis[0]?.key || '', kind: 'bar', months: 6 } : ty === 'notes' ? { type: 'notes', heading: 'Notes' } : ty === 'images' ? { type: 'images', heading: 'Screenshots', slots: 2 } : ty === 'title' ? { type: 'title', subtitle: '' } : { type: 'kpis' }] }))}><Plus size={13} />{SECTION_NAMES[ty]}</button>
          ))}
        </div>
      </section>
      <div className={`${card} space-y-3 lg:col-span-2`}>
        {report && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={applyTo} onChange={(e) => setApplyTo(e.target.checked)} className="accent-sky-400" />Also apply to the {monthLabel(monthOf(report.month))} report (numbers you already typed are kept; screenshots in removed slots are deleted)</label>}
        <button className={`${btnPrimary} w-full py-3 sm:w-auto sm:px-8`} onClick={save}>Save template</button>
        <p className="text-xs text-zinc-500">New charts need a saved number first. Earlier months keep their own layout.</p>
      </div>
    </div>
  )
}

function ClientLink({ d, toast, onSaved, onDelete }: { d: Data; toast: (s: string) => void; onSaved: (c: Client) => void; onDelete: () => void }) {
  const url = d.demo ? `${window.location.origin}/r/demo` : clientUrl(d.client.token, window.location.origin)
  const [name, setName] = useState(d.client.name); const [email, setEmail] = useState(d.client.email || '')
  const [confirmDel, setConfirmDel] = useState(false)
  async function patch(body: Record<string, unknown>, ok: string) {
    if (d.demo) return toast(DEMO_NOTE)
    const r = await api(`/api/reports/clients/${d.client.id}`, 'PATCH', body); if (!r.ok) return toast(r.data.error)
    onSaved(r.data.client); toast(ok)
  }
  async function del() {
    if (d.demo) { setConfirmDel(false); return toast(DEMO_NOTE) }
    const r = await api(`/api/reports/clients/${d.client.id}`, 'DELETE'); if (!r.ok) return toast(r.data.error)
    onDelete()
  }
  const shared = d.reports.filter((r) => r.shared).length
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={`${card} space-y-3`}>
        <h2 className="flex items-center gap-2 font-semibold"><Link2 size={16} />Private client link</h2>
        <p className="text-xs text-zinc-400">No login for your client. Only months you mark “Show to client” appear ({shared} now). Anyone with the link can see it, so send it only to them.</p>
        <div className={`flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2 ${d.client.revoked ? 'opacity-50' : ''}`}>
          <code className="min-w-0 flex-1 truncate text-xs text-sky-200">{url}</code>
          <button className={`${btnGhost} gap-1 px-3 py-1 text-xs`} disabled={d.client.revoked} onClick={() => navigator.clipboard.writeText(url).then(() => toast('Link copied.'))}><Copy size={13} />Copy</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={`${btnGhost} gap-1`} href={d.client.revoked ? undefined : url} target="_blank" rel="noopener" aria-disabled={d.client.revoked}><Eye size={15} />Open</a>
          <a className={`${btnGhost} gap-1`} href={mailtoInvite(d.client.email, d.client.name, 'me', url)}><Mail size={15} />Email from my mail app</a>
          <button className={btnGhost} onClick={() => patch({ revoked: !d.client.revoked }, d.client.revoked ? 'Link is on again.' : 'Link turned off. It shows “not found” now.')}>{d.client.revoked ? 'Turn link back on' : 'Turn link off'}</button>
          <button className={`${btnGhost} gap-1`} onClick={() => confirm('Make a new link? The old one stops working right away.') && patch({ regenerate: true }, 'New link made. The old one no longer works.')}><RefreshCw size={15} />New link</button>
        </div>
      </section>
      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold">Client details</h2>
        <label className="block text-sm">Name<input className={`${input} mt-1`} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm">Email (for your mail app only; we never email)<input className={`${input} mt-1`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => patch({ name, email: email || null }, 'Saved.')}>Save</button>
          <button className={`${btnGhost} text-rose-300`} onClick={() => setConfirmDel(true)}>Delete client</button>
        </div>
      </section>
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete this client?">
        <p className="text-sm text-zinc-300">This deletes {d.client.name}, all {d.reports.length} report{d.reports.length === 1 ? '' : 's'} and every screenshot. Their link stops working. This can’t be undone.</p>
        <div className="mt-4 flex gap-2"><button className={btnDanger} onClick={del}>Delete everything</button><button className={btnGhost} onClick={() => setConfirmDel(false)}>Cancel</button></div>
      </Modal>
    </div>
  )
}
