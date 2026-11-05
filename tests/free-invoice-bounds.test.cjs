// Free invoice generator: the same toPreviewData + totals + formatCurrency path the page and PDF use.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { alias: { '@': root } })
const inv = jiti('../lib/free-tools/invoice.ts')
const { totals, formatCurrency } = jiti('../lib/invoices/core.ts')

function form(over) {
  const f = inv.blankFreeInvoice('2026-11-05')
  f.lines = [{ description: 'QA extreme', quantity: '2', price: '25' }]
  f.taxRate = '8.5'
  return Object.assign(f, over)
}
function money(f) {
  const problems = inv.freeInvoiceProblems(f)
  const d = inv.toPreviewData(f)
  const t = totals(d.lines, d.tax_rate)
  return {
    problems,
    ready: inv.freeInvoiceReady(f),
    d, t,
    sub: formatCurrency(t.subtotal, d.currency),
    tax: formatCurrency(t.tax, d.currency),
    total: formatCurrency(t.total, d.currency),
  }
}
const finiteMoney = (m) => {
  assert.equal(Number.isFinite(m.t.subtotal), true)
  assert.equal(Number.isFinite(m.t.tax), true)
  assert.equal(Number.isFinite(m.t.total), true)
  for (const s of [m.sub, m.tax, m.total]) {
    assert.equal(s.includes('∞'), false, s)
    assert.equal(s.toLowerCase().includes('nan'), false, s)
  }
}

test('normal qty 2, price 25, tax 8.5 is $50 + $4.25 = $54.25', () => {
  const m = money(form())
  assert.deepEqual(m.problems, [])
  assert.equal(m.ready, true)
  assert.equal(m.d.lines.length, 1)
  assert.equal(m.d.lines[0].quantity, 2)
  assert.equal(m.d.lines[0].unit_price_cents, 2500)
  assert.equal(m.d.tax_rate, 8.5)
  assert.equal(m.t.subtotal, 5000)
  assert.equal(m.t.tax, 425)
  assert.equal(m.t.total, 5425)
  assert.equal(m.sub, '$50.00')
  assert.equal(m.tax, '$4.25')
  assert.equal(m.total, '$54.25')
})

test('blank price and zero tax stay editable and valid', () => {
  const f = inv.blankFreeInvoice('2026-11-05')
  f.lines = [{ description: 'Draft', quantity: '1', price: '' }]
  f.taxRate = ''
  let m = money(f)
  assert.deepEqual(m.problems, [])
  assert.equal(m.ready, true)
  assert.equal(m.d.lines[0].unit_price_cents, 0)
  assert.equal(m.d.tax_rate, null)
  f.taxRate = '0'
  f.lines[0].quantity = '0'
  f.lines[0].price = '0'
  m = money(f)
  assert.deepEqual(m.problems, [])
  assert.equal(m.t.total, 0)
  assert.equal(m.total, '$0.00')
})

test('a negative unit price still totals as finite money and can be exported', () => {
  const m = money(form({ lines: [{ description: 'QA extreme', quantity: '2', price: '-25' }], taxRate: '0' }))
  assert.deepEqual(m.problems, [])
  assert.equal(m.ready, true)
  assert.equal(m.d.lines.length, 1)
  assert.equal(m.d.lines[0].quantity, 2)
  assert.equal(m.d.lines[0].unit_price_cents, -2500)
  assert.equal(m.t.subtotal, -5000)
  assert.equal(m.t.tax, 0)
  assert.equal(m.t.total, -5000)
  finiteMoney(m)
  assert.equal(m.total, '-$50.00')
})

test('a finite credit with ordinary tax still totals exactly', () => {
  const m = money(form({ lines: [{ description: 'QA extreme', quantity: '2', price: '-25' }], taxRate: '8.5' }))
  assert.deepEqual(m.problems, [])
  assert.equal(m.ready, true)
  assert.equal(m.t.subtotal, -5000)
  assert.equal(m.t.tax, -425)
  assert.equal(m.t.total, -5425)
  assert.equal(m.total, '-$54.25')
})

test('combined amounts that the production total cannot represent are not previewed or exported', () => {
  // Each line is a safe integer and formats exactly. Their sum is also the safe integer
  // 8199717789473059, but formatCurrency prints a different cent.
  const faithful = 8199717789473056
  const plain = [{ quantity: 1, unit_price_cents: faithful }, { quantity: 1, unit_price_cents: 3 }]
  const added = totals(plain, null)
  assert.equal(added.subtotal, faithful + 3)
  assert.notEqual(formatCurrency(added.subtotal), '$81,997,177,894,730.59')
  const shown = money(form({
    lines: [
      { description: 'Ceiling', quantity: '1', price: '81997177894730.56' },
      { description: 'Plus', quantity: '1', price: '0.03' },
    ],
    taxRate: '',
  }))
  assert.ok(shown.problems.length > 0)
  assert.equal(shown.ready, false)
  assert.equal(shown.d.lines.length, 0)
  assert.equal(shown.total, '$0.00')
  finiteMoney(shown)

  // Two safe line amounts whose Number sum drops a cent: 9007199254740991 + 2.
  const ceiling = [{ quantity: 9007199254740991, unit_price_cents: 1 }, { quantity: 2, unit_price_cents: 1 }]
  const lost = totals(ceiling, null)
  assert.equal(BigInt(lost.subtotal), 9007199254740992n)
  assert.notEqual(BigInt(lost.subtotal), 9007199254740991n + 2n)
  const pair = money(form({
    lines: [
      { description: 'A', quantity: '9007199254740991', price: '0.01' },
      { description: 'B', quantity: '2', price: '0.01' },
    ],
    taxRate: '0',
  }))
  assert.equal(pair.ready, false)
  assert.equal(pair.d.lines.length, 0)
  finiteMoney(pair)

  // A display-exact subtotal whose 8.5% total is a safe integer formatCurrency does not print exactly.
  const taxed = totals([{ quantity: 1, unit_price_cents: 8199717789473055 }], 8.5)
  assert.equal(taxed.total, 8896693801578265)
  assert.notEqual(formatCurrency(taxed.total), '$88,966,938,015,782.65')
  const withTax = money(form({
    lines: [{ description: 'Ceiling', quantity: '1', price: '81997177894730.55' }],
    taxRate: '8.5',
  }))
  assert.equal(withTax.ready, false)
  assert.equal(withTax.d.lines.length, 0)
  finiteMoney(withTax)

  // The same size without the extra cents still totals and formats exactly. This is not a dollar cap.
  const still = money(form({
    lines: [{ description: 'Ceiling', quantity: '1', price: '81997177894730.56' }],
    taxRate: '8.5',
  }))
  assert.deepEqual(still.problems, [])
  assert.equal(still.ready, true)
  assert.equal(still.t.subtotal, 8199717789473056)
  assert.equal(still.t.total, 8896693801578266)
  assert.equal(still.total, '$88,966,938,015,782.66')
})

test('a unit price that cannot format exactly is rejected even when the line amount can', () => {
  const unitCents = 7036874417766409
  assert.equal(formatCurrency(unitCents), '$70,368,744,177,664.10')
  assert.notEqual(formatCurrency(unitCents), '$70,368,744,177,664.09')
  const amount = Math.round(0.5 * unitCents)
  assert.equal(formatCurrency(amount), '$35,184,372,088,832.05')
  const m = money(form({
    lines: [{ description: 'Unit', quantity: '0.5', price: '70368744177664.09' }],
    taxRate: '',
  }))
  assert.equal(m.d.lines.length === 0 || m.d.lines[0].unit_price_cents === unitCents, true)
  assert.ok(m.problems.length > 0)
  assert.equal(m.ready, false)
  assert.equal(m.d.lines.length, 0)
  finiteMoney(m)
  assert.equal(m.total, '$0.00')
})

test('non-finite quantity and an overflowing line are not previewed or exported', () => {
  const sci = money(form({ lines: [{ description: 'QA extreme', quantity: '1e309', price: '25' }], taxRate: '' }))
  assert.ok(sci.problems.some((p) => /quantity/i.test(p)))
  assert.equal(sci.ready, false)
  finiteMoney(sci)
  assert.equal(sci.d.lines.length, 0)

  const huge = money(form({ lines: [{ description: 'QA extreme', quantity: '1e308', price: '25' }], taxRate: '' }))
  assert.ok(huge.problems.length > 0)
  assert.equal(huge.ready, false)
  finiteMoney(huge)
  assert.equal(huge.d.lines.length, 0)
  assert.equal(huge.total, '$0.00')
})

test('Clear resets a stale PDF error along with the form', () => {
  const src = fs.readFileSync(path.join(root, 'components/free-tools/invoice-generator.tsx'), 'utf8')
  assert.match(src, /setErr\('Could not build the PDF\. Please try again\.'\)/)
  const clear = src.slice(src.indexOf('>Clear<') - 220, src.indexOf('>Clear<'))
  assert.match(clear, /blankFreeInvoice\(\)/)
  assert.match(clear, /setErr\(null\)/)
})
