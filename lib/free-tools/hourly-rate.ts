// Freelance hourly rate math. Pure functions; unit-tested in tests/free-tools.test.cjs.
export type RateInput = {
  income: number            // target take-home income (after tax)
  incomePeriod: 'year' | 'month'
  expensesMonthly: number   // business expenses per month
  taxPct: number            // % of profit set aside for taxes
  hoursPerWeek: number      // hours you plan to work per week
  weeksOff: number          // vacation + holidays + sick weeks per year
  bufferPct: number         // profit margin / safety buffer on top
  billablePct: number       // share of those hours you can actually bill
  hoursPerDay?: number      // for day rate (default 8)
  projectHours?: number     // for project rate (default 20)
}

export type RateResult = {
  takeHome: number; expenses: number; taxes: number; preBuffer: number; buffer: number; gross: number
  workingWeeks: number; billableHoursPerWeek: number; billableHours: number
  hourly: number; day: number; project: number; monthlyGross: number
}

const n = (v: number, min = 0, max = Number.MAX_SAFE_INTEGER) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min)

export function calcRate(i: RateInput): RateResult {
  const takeHome = n(i.income) * (i.incomePeriod === 'month' ? 12 : 1)
  const expenses = n(i.expensesMonthly) * 12
  const t = n(i.taxPct, 0, 90) / 100
  // Taxes come out of profit: profit - t*profit = takeHome  =>  profit = takeHome / (1 - t)
  const profit = takeHome / (1 - t)
  const taxes = profit - takeHome
  const preBuffer = profit + expenses
  const buffer = preBuffer * (n(i.bufferPct, 0, 500) / 100)
  const gross = preBuffer + buffer
  const workingWeeks = 52 - n(i.weeksOff, 0, 51)
  const billableHoursPerWeek = n(i.hoursPerWeek, 0, 168) * (n(i.billablePct, 0, 100) / 100)
  const billableHours = workingWeeks * billableHoursPerWeek
  const hourly = billableHours > 0 ? gross / billableHours : 0
  return {
    takeHome, expenses, taxes, preBuffer, buffer, gross, workingWeeks, billableHoursPerWeek, billableHours,
    hourly, day: hourly * n(i.hoursPerDay ?? 8, 0, 24), project: hourly * n(i.projectHours ?? 20), monthlyGross: gross / 12,
  }
}

/** Round a rate up to the next whole currency unit (never undercharge). */
export const roundUp = (x: number) => Math.ceil(Math.round(x * 100) / 100)
