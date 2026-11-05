// Free invoice generator: the same toPreviewData + totals + formatCurrency path the page and PDF use.
const test = require('node:test')
const assert = require('node:assert/strict')
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

test('negative price, negative qty, huge qty, and negative tax are explicit and not exported as money', () => {
  const negPrice = money(form({ lines: [{ description: 'QA extreme', quantity: '2', price: '-25' }], taxRate: '0' }))
  assert.ok(negPrice.problems.length > 0)
  assert.equal(negPrice.ready, false)
  finiteMoney(negPrice)
  assert.equal(negPrice.total, '$0.00')
  assert.ok(negPrice.d.lines.every((l) => l.unit_price_cents >= 0 && Number.isFinite(l.quantity)))

  const negQty = money(form({ lines: [{ description: 'QA extreme', quantity: '-2', price: '25' }], taxRate: '' }))
  assert.ok(negQty.problems.some((p) => /quantity/i.test(p)))
  assert.equal(negQty.ready, false)
  finiteMoney(negQty)
  assert.equal(negQty.d.lines.length, 0)

  const sci = money(form({ lines: [{ description: 'QA extreme', quantity: '1e309', price: '25' }], taxRate: '' }))
  assert.ok(sci.problems.some((p) => /quantity/i.test(p)))
  assert.equal(sci.ready, false)
  finiteMoney(sci)
  assert.equal(sci.d.lines.length, 0)

  const huge = money(form({ lines: [{ description: 'QA extreme', quantity: '1e308', price: '25' }], taxRate: '' }))
  assert.ok(huge.problems.length > 0)
  assert.equal(huge.ready, false)
  finiteMoney(huge)
  assert.equal(huge.total.includes('∞'), false)

  const negTax = money(form({ taxRate: '-8.5' }))
  assert.ok(negTax.problems.some((p) => /tax/i.test(p)))
  assert.equal(negTax.ready, false)
  assert.equal(negTax.d.tax_rate, null)
  finiteMoney(negTax)
  assert.equal(negTax.t.subtotal, 5000)
  assert.equal(negTax.t.tax, 0)
})
