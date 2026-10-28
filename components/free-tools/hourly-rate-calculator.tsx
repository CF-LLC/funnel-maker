'use client'

import { useMemo, useState } from 'react'
import { calcRate, roundUp, type RateInput } from '@/lib/free-tools/hourly-rate'

// Browser-only: state lives in React memory only. No browser storage, no network calls.
const inp = 'w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-cyan-400 focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-zinc-400'
const money = (x: number, d = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: d, minimumFractionDigits: d }).format(Number.isFinite(x) ? x : 0)
const int = (x: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(x)

type Form = Record<'income' | 'expensesMonthly' | 'taxPct' | 'hoursPerWeek' | 'weeksOff' | 'bufferPct' | 'projectHours', string>
const DEFAULTS: Form = { income: '80000', expensesMonthly: '500', taxPct: '25', hoursPerWeek: '40', weeksOff: '6', bufferPct: '10', projectHours: '20' }

function Field({ id, label, suffix, prefix, value, onChange }: { id: keyof Form; label: string; suffix?: string; prefix?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={lbl} htmlFor={id}>{label}</label>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-500">{prefix}</span> : null}
        <input id={id} inputMode="decimal" className={`${inp} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-14' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix ? <span className="pointer-events-none absolute right-3 top-2 text-xs leading-5 text-zinc-500">{suffix}</span> : null}
      </div>
    </div>
  )
}

export function HourlyRateCalculator() {
  const [f, setF] = useState<Form>(DEFAULTS)
  const [period, setPeriod] = useState<'year' | 'month'>('year')
  const [billablePct, setBillablePct] = useState(70)
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const num = (s: string) => Number(String(s).replace(/[, $%]/g, '')) || 0
  const input: RateInput = useMemo(() => ({
    income: num(f.income), incomePeriod: period, expensesMonthly: num(f.expensesMonthly), taxPct: num(f.taxPct), hoursPerWeek: num(f.hoursPerWeek),
    weeksOff: num(f.weeksOff), bufferPct: num(f.bufferPct), billablePct, projectHours: num(f.projectHours),
  }), [f, period, billablePct])
  const r = useMemo(() => calcRate(input), [input])
  const full = useMemo(() => calcRate({ ...input, billablePct: 100 }), [input])
  const ok = r.billableHours > 0

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <form className="min-w-0 space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className={lbl} htmlFor="income">Target take-home income (after tax)</label>
            <div role="group" aria-label="Income period" className="mb-1 flex rounded-lg border border-white/10 p-0.5 text-xs">
              {(['year', 'month'] as const).map((p) => (
                <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)} className={`rounded-md px-2 py-0.5 ${period === p ? 'bg-cyan-500/20 text-cyan-200' : 'text-zinc-400'}`}>per {p}</button>
              ))}
            </div>
          </div>
          <div className="relative"><span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-500">$</span><input id="income" inputMode="decimal" className={`${inp} pl-7`} value={f.income} onChange={(e) => set('income')(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="expensesMonthly" label="Business expenses" prefix="$" suffix="/mo" value={f.expensesMonthly} onChange={set('expensesMonthly')} />
          <Field id="taxPct" label="Taxes set aside" suffix="%" value={f.taxPct} onChange={set('taxPct')} />
          <Field id="hoursPerWeek" label="Work hours per week" suffix="hrs" value={f.hoursPerWeek} onChange={set('hoursPerWeek')} />
          <Field id="weeksOff" label="Weeks off per year" suffix="wks" value={f.weeksOff} onChange={set('weeksOff')} />
          <Field id="bufferPct" label="Profit margin / buffer" suffix="%" value={f.bufferPct} onChange={set('bufferPct')} />
          <Field id="projectHours" label="Typical project size" suffix="hrs" value={f.projectHours} onChange={set('projectHours')} />
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="billable" className="font-semibold text-white">What if I only bill {billablePct}% of my time?</label>
            <span className="font-mono text-cyan-300">{billablePct}%</span>
          </div>
          <input id="billable" type="range" min={10} max={100} step={5} value={billablePct} onChange={(e) => setBillablePct(Number(e.target.value))} className="mt-3 w-full accent-cyan-400" />
          <p className="mt-2 text-xs text-zinc-400">Admin, sales and email eat time. Most freelancers bill 50–75% of the hours they work.</p>
        </div>
      </form>

      <section aria-live="polite" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-600/30 via-zinc-900 to-violet-700/30 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Your minimum hourly rate</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight sm:text-6xl" data-testid="hourly">{ok ? money(roundUp(r.hourly)) : '—'}<span className="text-xl font-semibold text-zinc-400">/hr</span></p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-zinc-400">Day rate (8 hrs)</p><p className="text-xl font-bold">{ok ? money(roundUp(r.day)) : '—'}</p></div>
            <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-zinc-400">Project ({int(input.projectHours ?? 20)} hrs)</p><p className="text-xl font-bold">{ok ? money(roundUp(r.project)) : '—'}</p></div>
          </div>
        </div>
        <dl className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-zinc-900/60 text-sm">
          {[
            ['Take-home income', money(r.takeHome)],
            ['+ Taxes set aside', money(r.taxes)],
            ['+ Business expenses', money(r.expenses)],
            ['+ Buffer', money(r.buffer)],
            ['= Gross revenue needed / year', money(r.gross)],
            ['Working weeks', `${int(r.workingWeeks)} wks`],
            ['Billable hours / week', `${r.billableHoursPerWeek.toFixed(1)} hrs`],
            ['Billable hours / year', `${int(r.billableHours)} hrs`],
          ].map(([k, v], i) => (
            <div key={k} className={`flex justify-between gap-4 px-4 py-2 ${i === 4 ? 'font-bold text-white' : 'text-zinc-300'}`}><dt>{k}</dt><dd className="font-mono">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          {ok ? (
            <>To take home <b>{money(r.takeHome)}</b> a year, you need to bring in about <b>{money(r.gross)}</b> a year to also cover taxes, expenses and your buffer. Billing {billablePct}% of {int(input.hoursPerWeek)} hours a week for {int(r.workingWeeks)} weeks gives you <b>{int(r.billableHours)}</b> billable hours, so charge at least <b>{money(roundUp(r.hourly))}/hr</b>.{billablePct < 100 ? <> If you could bill every hour, it would be {money(roundUp(full.hourly))}/hr.</> : null}</>
          ) : 'Add some billable hours and at least one working week to see your rate.'}
        </p>
      </section>
    </div>
  )
}
